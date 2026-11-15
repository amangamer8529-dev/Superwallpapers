import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_EMAIL } from "./supabase-config.js";

// Superwallpapers unified application: matches the current index.html IDs.
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = id => document.getElementById(id);
const categories = ["All", "Anime", "Nature", "AMOLED", "Cars", "Gaming", "Abstract", "Space", "Minimal"];
const state = { user: null, wallpapers: [], favourites: new Set(), category: "All", screen: "home", detail: null, mode: "signin" };
const HISTORY_KEY = "sw-search-history-v2";
const VIEWED_KEY = "sw-recently-viewed-v2";
let toastTimeout;

const safeText = value => String(value ?? "");
function escapeHTML(value) {
  return safeText(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
}
function listFromStorage(key) {
  try { const data = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(data) ? data : []; }
  catch { return []; }
}
function saveList(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Storage can be disabled. */ }
}
function notify(message) {
  const el = $("toast"); if (!el) return;
  el.textContent = safeText(message); el.classList.add("show");
  clearTimeout(toastTimeout); toastTimeout = setTimeout(() => el.classList.remove("show"), 3700);
}
function imageFor(w) { return w?.image_url || ""; }
function isAdmin() { return !!state.user && state.user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase(); }
function setMenu(open) {
  const scrim = $("menuScrim");
  if (scrim) Object.assign(scrim.style, { position: "fixed", inset: "0", zIndex: "998", background: "rgba(0,0,0,.45)", display: open ? "block" : "none" });
  $("siteMenu")?.classList.toggle("hidden", !open);
  $("menuScrim")?.classList.toggle("menu-scrim-open", open);
  $("menuScrim")?.classList.toggle("hidden", !open);
  $("homeMenuToggle")?.setAttribute("aria-expanded", String(open));
  document.body.classList.toggle("menu-is-open", open);
}
function navigate(screen) {
  if (!categories || !["home", "browse", "search", "saved"].includes(screen)) return;
  state.screen = screen;
  document.querySelectorAll(".app-screen").forEach(panel => {
    const active = panel.id === `screen-${screen}`;
    panel.classList.toggle("hidden", !active);
    panel.classList.toggle("active", active);
    panel.setAttribute("aria-hidden", String(!active));
  });
  document.querySelectorAll("[data-screen]").forEach(button => {
    const active = button.dataset.screen === screen;
    button.classList.toggle("is-active", active);
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  setMenu(false);
  window.scrollTo({ top: 0, behavior: "instant" });
  if (screen === "search") setTimeout(() => $("searchInput")?.focus(), 40);
  if (screen === "saved") renderSaved();
  if (screen === "browse") renderBrowse();
}
function openModal(id) {
  const node = $(id); if (!node) return;
  node.classList.remove("hidden"); document.body.style.overflow = "hidden";
}
function closeModal(id) {
  $(id)?.classList.add("hidden");
  if (!document.querySelector(".modal-backdrop:not(.hidden)")) document.body.style.overflow = "";
}
function authMode(mode) {
  state.mode = mode;
  document.querySelectorAll(".auth-tab").forEach(tab => tab.classList.toggle("active", tab.dataset.mode === mode));
  const signUp = mode === "signup";
  $("usernameInput").required = signUp;
  $("usernameInput").classList.toggle("hidden", !signUp);
  document.querySelector('label[for="usernameInput"]')?.classList.toggle("hidden", !signUp);
  $("authTitle").innerHTML = signUp ? "Join <span>Superwallpapers.</span>" : "Welcome <span>back.</span>";
  $("authSubmit").innerHTML = signUp ? "Create account <span>↗</span>" : "Sign in <span>↗</span>";
}
function updateAccount() {
  const user = state.user;
  $("authOpen")?.classList.toggle("hidden", !!user);
  $("profileButton")?.classList.toggle("hidden", !user);
  $("savedSignInButton")?.classList.toggle("hidden", !!user);
  if (!user) return;
  const username = user.user_metadata?.display_name || user.user_metadata?.username || user.email?.split("@")[0] || "User";
  $("profileButton").textContent = username.charAt(0).toUpperCase();
  $("accountAvatar").textContent = username.charAt(0).toUpperCase();
  $("accountName").textContent = username;
  $("accountEmail").textContent = user.email || "";
  $("adminDashboardButton")?.classList.toggle("hidden", !isAdmin());
}
async function loadFavourites() {
  state.favourites = new Set();
  if (!state.user) return;
  const { data, error } = await supabase.from("favourites").select("wallpaper_id").eq("user_id", state.user.id);
  if (error) { console.warn("Favourites failed:", error); return; }
  state.favourites = new Set((data || []).map(row => row.wallpaper_id));
}
async function loadWallpapers() {
  const { data, error } = await supabase.from("wallpapers").select("*").order("created_at", { ascending: false });
  if (error) {
    console.error("Wallpaper loading failed:", error);
    state.wallpapers = [];
    notify("Could not load wallpapers. Check Supabase database and security rules.");
  } else state.wallpapers = data || [];
  renderAll();
}
function card(w) {
  const article = document.createElement("article");
  article.className = "wallpaper-card";
  const saved = state.favourites.has(w.id);
  article.innerHTML = `<div class="wallpaper-thumb"><img loading="lazy" alt="${escapeHTML(w.title || "Wallpaper")}"><div class="card-overlay"><button type="button" class="quick-download">View ↗</button><button type="button" class="favourite-button ${saved ? "saved" : ""}" aria-label="Save wallpaper">${saved ? "♥" : "♡"}</button></div></div><div class="card-info"><div class="card-info-top"><h3>${escapeHTML(w.title || "Untitled")}</h3><span class="card-category">${escapeHTML(w.category || "Other")}</span></div><p>Original quality · ${Number(w.downloads || 0).toLocaleString()} downloads</p></div>`;
  article.querySelector("img").src = imageFor(w);
  article.querySelector(".wallpaper-thumb").addEventListener("click", () => showDetail(w));
  article.querySelector(".quick-download").addEventListener("click", e => { e.stopPropagation(); showDetail(w); });
  article.querySelector(".favourite-button").addEventListener("click", e => { e.stopPropagation(); toggleFavourite(w); });
  return article;
}
function renderGrid(id, items, message = "No wallpapers found yet.") {
  const grid = $(id); if (!grid) return;
  grid.replaceChildren();
  if (!items.length) {
    const empty = document.createElement("div"); empty.className = "empty-state";
    const title = document.createElement("h3"); title.textContent = "No wallpapers found";
    const p = document.createElement("p"); p.textContent = message;
    empty.append(title, p); grid.appendChild(empty); return;
  }
  items.forEach(w => grid.appendChild(card(w)));
}
function renderBrowse() {
  const feed = $("verticalWallpaperFeed"); if (!feed) return;
  feed.classList.add("browse-feed");
  feed.replaceChildren();
  const items = state.wallpapers.filter(w => state.category === "All" || w.category === state.category);
  document.querySelectorAll("[data-browse-category]").forEach(button => {
    button.classList.toggle("selected", button.dataset.browseCategory === state.category);
  });
  if (!items.length) {
    const empty = document.createElement("div"); empty.className = "empty-state";
    empty.innerHTML = "<h3>No wallpapers published in this category yet.</h3><p>Use the admin dashboard to upload your first wallpaper.</p>";
    feed.appendChild(empty); return;
  }
  items.forEach(w => {
    const reel = document.createElement("article"); reel.className = "browse-reel";
    reel.innerHTML = `<div class="browse-reel-backdrop"></div><button type="button" class="browse-reel-image-button" aria-label="View wallpaper"><img class="browse-reel-image" alt="${escapeHTML(w.title)}"></button><div class="browse-reel-shade"></div><div class="browse-reel-details"><h2>${escapeHTML(w.title)}</h2><p>${escapeHTML(w.description || "Beautiful wallpaper for your screen.")}</p><small>${escapeHTML(w.category || "Wallpaper")}</small></div><div class="browse-reel-actions"><button type="button" class="reel-action-button" aria-label="Save wallpaper">${state.favourites.has(w.id) ? "♥" : "♡"}</button><button type="button" class="reel-action-button" aria-label="View wallpaper">↗</button></div>`;
    reel.querySelector(".browse-reel-backdrop").style.backgroundImage = `url(${JSON.stringify(imageFor(w))})`;
    reel.querySelector("img").src = imageFor(w);
    reel.querySelector(".browse-reel-image-button").addEventListener("click", () => showDetail(w));
    reel.querySelectorAll(".reel-action-button")[0].addEventListener("click", () => toggleFavourite(w));
    reel.querySelectorAll(".reel-action-button")[1].addEventListener("click", () => showDetail(w));
    feed.appendChild(reel);
  });
}
function recentIds() { return listFromStorage(VIEWED_KEY); }
function registerView(id) {
  saveList(VIEWED_KEY, [id, ...recentIds().filter(existing => existing !== id)].slice(0, 12));
  renderRecentlyViewed();
}
function renderRecentlyViewed() {
  const ids = recentIds();
  const recent = ids.map(id => state.wallpapers.find(w => w.id === id)).filter(Boolean);
  renderGrid("recentlyViewedGrid", recent, "Wallpapers you open will appear here.");
}
function renderHistory() {
  const list = $("searchHistoryList"); if (!list) return;
  list.replaceChildren();
  const history = listFromStorage(HISTORY_KEY);
  if (!history.length) { list.textContent = "Your recent searches will appear here."; return; }
  history.forEach(term => {
    const button = document.createElement("button"); button.type = "button";
    button.className = "category-pill"; button.textContent = term;
    button.addEventListener("click", () => { $("searchInput").value = term; renderSearch(); navigate("search"); });
    list.appendChild(button);
  });
}
function recordHistory(term) {
  const value = term.trim(); if (value.length < 2) return;
  saveList(HISTORY_KEY, [value, ...listFromStorage(HISTORY_KEY).filter(x => x.toLowerCase() !== value.toLowerCase())].slice(0, 10));
  renderHistory();
}
function renderSearch() {
  const term = $("searchInput")?.value.trim().toLowerCase() || "";
  if ($("searchClear")) $("searchClear").hidden = !term;
  const results = term ? state.wallpapers.filter(w => `${w.title || ""} ${w.category || ""} ${w.description || ""}`.toLowerCase().includes(term)) : [];
  $("searchResultCount").textContent = term ? `${results.length} result${results.length === 1 ? "" : "s"}` : "";
  renderGrid("searchWallpaperGrid", results, term ? "Try a different keyword." : "Type a keyword to find wallpapers.");
}
function renderSaved() {
  const saved = state.wallpapers.filter(w => state.favourites.has(w.id));
  $("savedCount").textContent = `${saved.length} saved wallpaper${saved.length === 1 ? "" : "s"}`;
  renderGrid("savedWallpaperGrid", saved, state.user ? "Save a wallpaper to see it here." : "Sign in to save your favourites.");
}
function renderAll() {
  renderGrid("homeWallpaperGrid", state.wallpapers.slice(0, 8), "Your latest uploads will appear here.");
  renderBrowse(); renderSaved(); renderRecentlyViewed();
  renderGrid("recommendedGrid", state.wallpapers.slice(0, 8), "Recommendations will appear when wallpapers are uploaded.");
  renderSearch(); renderHistory();
}
async function toggleFavourite(w) {
  if (!state.user) { authMode("signin"); openModal("authModal"); notify("Sign in to save wallpapers."); return; }
  const saved = state.favourites.has(w.id);
  const query = saved
    ? supabase.from("favourites").delete().eq("user_id", state.user.id).eq("wallpaper_id", w.id)
    : supabase.from("favourites").insert({ user_id: state.user.id, wallpaper_id: w.id });
  const { error } = await query;
  if (error) { notify(`Could not update favourites: ${error.message}`); return; }
  if (saved) state.favourites.delete(w.id); else state.favourites.add(w.id);
  notify(saved ? "Removed from saved wallpapers." : "Wallpaper saved.");
  renderAll(); if (state.detail?.id === w.id) updateDetailFavourite();
}
function updateDetailFavourite() {
  if (!state.detail) return;
  $("detailFavourite").textContent = state.favourites.has(state.detail.id) ? "♥ Saved" : "♡ Save";
}
function showDetail(w) {
  state.detail = w;
  $("detailImage").src = imageFor(w);
  $("detailImage").alt = w.title || "Wallpaper";
  $("detailTitle").textContent = w.title || "Untitled";
  $("detailCategory").textContent = w.category || "Wallpaper";
  $("detailDescription").textContent = w.description || "Download the original image.";
  const download = $("downloadButton");
  download.href = imageFor(w);
  download.download = `${(w.title || "wallpaper").replace(/[^a-z0-9_-]/gi, "-")}.jpg`;
  updateDetailFavourite(); registerView(w.id); openModal("detailModal");
}
async function refreshSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) console.warn("Session check failed:", error);
  state.user = data?.session?.user || null;
  updateAccount(); await loadFavourites(); renderAll();
}
function bindEvents() {
  // Main navigation, including both the header and mobile bottom navigation.
  document.addEventListener("click", e => {
    const nav = e.target.closest("[data-screen]");
    if (nav) { e.preventDefault(); navigate(nav.dataset.screen); }
    const category = e.target.closest(".home-category[data-category]");
    if (category) { state.category = category.dataset.category; navigate("browse"); }
    const browseCategory = e.target.closest("[data-browse-category]");
    if (browseCategory) { state.category = browseCategory.dataset.browseCategory; renderBrowse(); }
  });
  $("homeMenuToggle")?.addEventListener("click", () => setMenu($("siteMenu").classList.contains("hidden")));
  $("bottomMenuButton")?.addEventListener("click", () => setMenu($("siteMenu").classList.contains("hidden")));
  $("menuClose")?.addEventListener("click", () => setMenu(false));
  $("menuScrim")?.addEventListener("click", () => setMenu(false));
  document.addEventListener("keydown", e => { if (e.key === "Escape") { setMenu(false); document.querySelectorAll(".modal-backdrop:not(.hidden)").forEach(x => closeModal(x.id)); } });
  document.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", () => closeModal(button.dataset.close)));
  document.querySelectorAll(".modal-backdrop").forEach(backdrop => backdrop.addEventListener("click", e => { if (e.target === backdrop) closeModal(backdrop.id); }));
  $("authOpen")?.addEventListener("click", () => { authMode("signin"); openModal("authModal"); });
  $("profileButton")?.addEventListener("click", () => openModal("accountModal"));
  document.querySelectorAll("[data-mode]").forEach(button => button.addEventListener("click", () => authMode(button.dataset.mode)));
  $("authForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    const email = $("emailInput").value.trim(), password = $("passwordInput").value;
    const username = $("usernameInput").value.trim();
    const button = $("authSubmit"); button.disabled = true;
    try {
      if (state.mode === "signup") {
        if (username.length < 2) throw new Error("Choose a username with at least 2 characters.");
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { username, display_name: username } } });
        if (error) throw error;
        notify(data.session ? "Account created." : "Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        notify("Signed in successfully.");
      }
      closeModal("authModal"); $("authForm").reset(); await refreshSession();
    } catch (err) { notify(err.message); }
    finally { button.disabled = false; }
  });
  $("googleSignIn")?.addEventListener("click", async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + location.pathname } });
    if (error) notify(error.message);
  });
  $("signOutButton")?.addEventListener("click", async () => {
    const { error } = await supabase.auth.signOut();
    if (error) notify(error.message);
    else { closeModal("accountModal"); notify("Signed out."); await refreshSession(); }
  });
  $("myFavouritesButton")?.addEventListener("click", () => { closeModal("accountModal"); navigate("saved"); });
  $("savedSignInButton")?.addEventListener("click", () => { authMode("signin"); openModal("authModal"); });
  $("adminDashboardButton")?.addEventListener("click", () => {
    if (!isAdmin()) { notify("Admin access required."); return; }
    closeModal("accountModal"); openModal("adminModal");
  });
  $("uploadForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    if (!isAdmin()) { notify("Admin access required."); return; }
    const file = $("wallpaperFile").files[0];
    if (!file) { notify("Choose an image first."); return; }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { notify("Only JPG, PNG and WebP are supported."); return; }
    if (file.size > 20 * 1024 * 1024) { notify("The image must be 20 MB or smaller."); return; }
    const title = $("wallpaperTitle").value.trim(); if (!title) return;
    const uploadButton = $("publishButton"); uploadButton.disabled = true;
    uploadButton.textContent = "Publishing...";
    const path = `${state.user.id}/${Date.now()}-${file.name.replace(/[^a-z0-9._-]/gi, "_")}`;
    try {
      const { error: uploadError } = await supabase.storage.from("wallpapers").upload(path, file, { upsert: false, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("wallpapers").getPublicUrl(path);
      const { error: insertError } = await supabase.from("wallpapers").insert({
        title, category: $("wallpaperCategory").value,
        description: $("wallpaperDescription").value.trim(),
        image_url: data.publicUrl, storage_path: path, created_by: state.user.id
      });
      if (insertError) { await supabase.storage.from("wallpapers").remove([path]); throw insertError; }
      $("uploadForm").reset(); closeModal("adminModal"); notify("Wallpaper published!"); await loadWallpapers();
    } catch (err) { console.error(err); notify(`Upload failed: ${err.message}`); }
    finally { uploadButton.disabled = false; uploadButton.innerHTML = "Publish wallpaper <span>↗</span>"; }
  });
  $("detailFavourite")?.addEventListener("click", () => { if (state.detail) toggleFavourite(state.detail); });
  $("downloadButton")?.addEventListener("click", async () => {
    if (!state.detail) return;
    const { error } = await supabase.rpc("increment_wallpaper_downloads", { p_wallpaper_id: state.detail.id });
    if (error) console.warn("Could not increment download count:", error);
  });
  $("searchInput")?.addEventListener("input", renderSearch);
  $("searchInput")?.addEventListener("keydown", e => { if (e.key === "Enter") recordHistory($("searchInput").value); });
  $("searchInput")?.addEventListener("blur", () => recordHistory($("searchInput").value));
  $("searchClear")?.addEventListener("click", () => { $("searchInput").value = ""; renderSearch(); $("searchInput").focus(); });
  document.querySelectorAll("[data-search-term]").forEach(button => button.addEventListener("click", () => {
    $("searchInput").value = button.dataset.searchTerm; recordHistory(button.dataset.searchTerm); renderSearch(); navigate("search");
  }));
  $("clearSearchHistory")?.addEventListener("click", () => { saveList(HISTORY_KEY, []); renderHistory(); notify("Search history cleared."); });
  supabase.auth.onAuthStateChange(() => setTimeout(() => refreshSession().catch(console.error), 0));
}

bindEvents();
authMode("signin");
setMenu(false);
navigate("home");
Promise.all([refreshSession(), loadWallpapers()]).catch(err => { console.error("Site initialization error:", err); notify("Something went wrong loading the site."); });
