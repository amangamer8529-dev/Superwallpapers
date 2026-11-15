JavaScript

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.js";

(() => {
  "use strict";

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const $ = id => document.getElementById(id);
  const HISTORY_KEY = "superwallpapers.searchHistory.v1";
  const VIEWED_KEY = "superwallpapers.recentlyViewed.v1";

  let wallpapers = [];
  let savedIds = new Set();
  let currentUser = null;
  let activeDetail = null;
  let busyIds = new Set();

  function safeRead(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function safeWrite(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) {
      console.warn("Could not save local browsing history:", error);
    }
  }

  function notify(message) {
    const toast = $("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => toast.classList.remove("show"), 3000);
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }

  function getWallpaperId(item) { return String(item.id); }
  function getImage(item) { return item.image_url || item.imageUrl || ""; }

  function getItem(id) {
    return wallpapers.find(item => getWallpaperId(item) === String(id));
  }

  async function loadWallpapers() {
    const { data, error } = await supabase
      .from("wallpapers")
      .select("id,title,category,description,image_url,storage_path,downloads,created_by,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Could not load wallpapers for Browse and Saved:", error);
      wallpapers = [];
    } else {
      wallpapers = (data || []).filter(item => item.image_url);
    }
  }

  async function loadSessionAndSaved() {
    const { data } = await supabase.auth.getSession();
    currentUser = data?.session?.user || null;
    savedIds = new Set();

    if (!currentUser) return;

    const { data: favourites, error } = await supabase
      .from("favourites")
      .select("wallpaper_id")
      .eq("user_id", currentUser.id);

    if (error) {
      console.warn("Could not load saved wallpapers:", error);
      return;
    }
    savedIds = new Set((favourites || []).map(row => String(row.wallpaper_id)));
  }

  function makeButton(label, className, attributes = {}) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    Object.entries(attributes).forEach(([key, value]) => button.setAttribute(key, value));
    return button;
  }

  function makeWallpaperTile(item, options = {}) {
    const card = document.createElement("article");
    card.className = "experience-tile";
    card.dataset.wallpaperId = getWallpaperId(item);

    const imageButton = makeButton("", "experience-tile-image", {
      "data-open-id": getWallpaperId(item),
      "aria-label": `Open ${item.title || "wallpaper"}`
    });
    const image = document.createElement("img");
    image.src = getImage(item);
    image.alt = item.title || "Wallpaper";
    image.loading = "lazy";
    imageButton.appendChild(image);

    const info = document.createElement("div");
    info.className = "experience-tile-info";
    const title = document.createElement("strong");
    title.textContent = item.title || "Untitled wallpaper";
    const category = document.createElement("span");
    category.textContent = item.category || "Wallpaper";
    info.append(title, category);

    const actions = document.createElement("div");
    actions.className = "experience-tile-actions";
    const isSaved = savedIds.has(getWallpaperId(item));
    const saveButton = makeButton(isSaved ? "♥ Saved" : "♡ Save", "experience-small-action" + (isSaved ? " is-saved" : ""), {
      "data-favourite-id": getWallpaperId(item),
      "aria-pressed": String(isSaved)
    });
    const openButton = makeButton("View", "experience-small-action", { "data-open-id": getWallpaperId(item) });
    actions.append(saveButton, openButton);

    card.append(imageButton, info, actions);
    return card;
  }

  function renderTiles(target, items, emptyText) {
    if (!target) return;
    target.replaceChildren();
    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "muted-note";
      empty.textContent = emptyText;
      target.appendChild(empty);
      return;
    }
    items.forEach(item => target.appendChild(makeWallpaperTile(item)));
  }

  function renderBrowseFeed() {
    const feed = $("browseFeed");
    if (!feed) return;
    feed.replaceChildren();

    const items = [...wallpapers].sort((a, b) => {
      const da = Date.parse(a.created_at || "") || 0;
      const db = Date.parse(b.created_at || "") || 0;
      return db - da;
    });

    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "feed-empty-state";
      empty.innerHTML = `<div class="feed-empty-icon">✦</div><h2>No wallpapers published yet</h2><p>New wallpapers will appear here as soon as they are published.</p><button type="button" class="primary-button" data-screen-link="search">Explore the collection <span>↗</span></button>`;
      feed.appendChild(empty);
      return;
    }

    items.forEach((item, index) => {
      const id = getWallpaperId(item);
      const saved = savedIds.has(id);
      const article = document.createElement("article");
      article.className = "browse-reel";
      article.dataset.wallpaperId = id;
      article.dataset.reelIndex = String(index);

      const backdrop = document.createElement("div");
      backdrop.className = "browse-reel-backdrop";
      backdrop.style.backgroundImage = `url("${getImage(item).replace(/["\\]/g, "")}")`;
      const imageButton = makeButton("", "browse-reel-image-button", {
        "data-open-id": id,
        "aria-label": `View ${item.title || "wallpaper"}`
      });
      const image = document.createElement("img");
      image.className = "browse-reel-image";
      image.src = getImage(item);
      image.alt = item.title || "Wallpaper";
      image.loading = index < 3 ? "eager" : "lazy";
      imageButton.appendChild(image);

      const shade = document.createElement("div");
      shade.className = "browse-reel-shade";
      const details = document.createElement("div");
      details.className = "browse-reel-details";
      const category = document.createElement("span");
      category.className = "reel-category";
      category.textContent = item.category || "WALLPAPER";
      const title = document.createElement("h2");
      title.textContent = item.title || "Untitled wallpaper";
      const description = document.createElement("p");
      description.textContent = item.description || "A wallpaper for your screen.";
      const count = document.createElement("small");
      count.textContent = `${Number(item.downloads || 0).toLocaleString()} downloads`;
      details.append(category, title, description, count);

      const actions = document.createElement("div");
      actions.className = "browse-reel-actions";
      const save = makeButton(saved ? "♥" : "♡", "reel-action-button" + (saved ? " is-saved" : ""), {
        "data-favourite-id": id,
        "aria-label": saved ? "Remove from saved" : "Save wallpaper",
        "aria-pressed": String(saved)
      });
      const saveLabel = document.createElement("span");
      saveLabel.textContent = saved ? "Saved" : "Save";
      save.appendChild(saveLabel);
      const download = makeButton("↓", "reel-action-button", { "data-download-id": id, "aria-label": "Download wallpaper" });
      const downloadLabel = document.createElement("span");
      downloadLabel.textContent = "Download";
      download.appendChild(downloadLabel);
      const view = makeButton("···", "reel-action-button", { "data-open-id": id, "aria-label": "Wallpaper details" });
      const viewLabel = document.createElement("span");
      viewLabel.textContent = "Details";
      view.appendChild(viewLabel);
      actions.append(save, download, view);

      article.append(backdrop, imageButton, shade, details, actions);
      feed.appendChild(article);
    });

    observeFeedViews();
  }

  function getRecommendations() {
    const ownItems = currentUser ? wallpapers.filter(item => String(item.created_by || "") === String(currentUser.id)) : [];
    const savedItems = wallpapers.filter(item => savedIds.has(getWallpaperId(item)));
    const interests = new Map();

    [...savedItems, ...ownItems].forEach(item => {
      const category = String(item.category || "").trim().toLowerCase();
      if (category) interests.set(category, (interests.get(category) || 0) + 1);
    });

    return wallpapers
      .filter(item => !savedIds.has(getWallpaperId(item)) && !(currentUser && String(item.created_by || "") === String(currentUser.id)))
      .map(item => {
        const category = String(item.category || "").toLowerCase();
        const interestScore = interests.get(category) || 0;
        const popularity = Math.min(Number(item.downloads || 0), 100000) / 100000;
        return { item, score: interestScore * 10 + popularity };
      })
      .sort((a, b) => b.score - a.score || (Number(b.item.downloads || 0) - Number(a.item.downloads || 0)))
      .slice(0, 12)
      .map(row => row.item);
  }

  function renderRecommendations() {
    const recommendations = getRecommendations();
    renderTiles($("recommendationGrid"), recommendations, "No recommendations yet. Once wallpapers are published, they will appear here.");
    const note = $("recommendationNote");
    if (!note) return;
    const hasSignals = currentUser && (savedIds.size > 0 || wallpapers.some(item => String(item.created_by || "") === String(currentUser.id)));
    note.textContent = hasSignals
      ? "Recommendations are prioritised using the categories of wallpapers you have saved and published, with popular uploads as an additional signal."
      : "Showing popular published wallpapers for now. Sign in, save wallpapers or publish wallpapers to build recommendations around your interests.";
  }

  function getSearchHistory() {
    return safeRead(HISTORY_KEY, []).filter(value => typeof value === "string").slice(0, 8);
  }

  function getViewedIds() {
    return safeRead(VIEWED_KEY, []).map(String).slice(0, 12);
  }

  function addSearchHistory(term) {
    const normalised = String(term || "").trim().replace(/\s+/g, " ");
    if (normalised.length < 2) return;
    const next = [normalised, ...getSearchHistory().filter(item => item.toLowerCase() !== normalised.toLowerCase())].slice(0, 8);
    safeWrite(HISTORY_KEY, next);
    renderSearchHistory();
  }

  function renderSearchHistory() {
    const target = $("searchHistory");
    if (!target) return;
    target.replaceChildren();
    const history = getSearchHistory();
    if (!history.length) {
      const empty = document.createElement("span");
      empty.className = "muted-note";
      empty.textContent = "Your recent searches will appear here.";
      target.appendChild(empty);
      return;
    }
    history.forEach(term => {
      const button = makeButton(`⌕  ${term}`, "history-chip", { "data-history-term": term });
      target.appendChild(button);
    });
  }

  function renderRecentlyViewed() {
    const ids = getViewedIds();
    const items = ids.map(getItem).filter(Boolean);
    renderTiles($("recentlyViewedGrid"), items, "Wallpapers you open in the feed will appear here.");
  }

  function recordViewed(id) {
    const next = [String(id), ...getViewedIds().filter(value => value !== String(id))].slice(0, 12);
    safeWrite(VIEWED_KEY, next);
    renderRecentlyViewed();
  }

  function observeFeedViews() {
    const feed = $("browseFeed");
    if (!feed || !("IntersectionObserver" in window)) return;
    if (observeFeedViews.observer) observeFeedViews.observer.disconnect();
    observeFeedViews.observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.65) {
          recordViewed(entry.target.dataset.wallpaperId);
        }
      });
    }, { root: feed, threshold: [0.65] });
    feed.querySelectorAll(".browse-reel").forEach(card => observeFeedViews.observer.observe(card));
  }

  function renderSaved() {
    const items = wallpapers.filter(item => savedIds.has(getWallpaperId(item)));
    const target = $("savedWallpapersGrid");
    const empty = $("savedEmpty");
    if ($("savedCount")) $("savedCount").textContent = `${items.length} saved ${items.length === 1 ? "wallpaper" : "wallpapers"}`;

    const emptyAction = $("savedEmptyAction");
    if (!currentUser) {
      target?.replaceChildren();
      target?.classList.add("hidden");
      empty?.classList.remove("hidden");
      if (empty) {
        const heading = empty.querySelector("h2");
        const paragraph = empty.querySelector("p");
        if (heading) heading.textContent = "Sign in to see your saved wallpapers.";
        if (paragraph) paragraph.textContent = "Your saved collection is linked to your account.";
      }
      if (emptyAction) emptyAction.innerHTML = "Sign in <span>↗</span>";
      return;
    }

    target?.classList.remove("hidden");
    renderTiles(target, items, "You have not saved any wallpapers yet.");
    empty?.classList.toggle("hidden", items.length > 0);
    if (empty) {
      const heading = empty.querySelector("h2");
      const paragraph = empty.querySelector("p");
      if (heading) heading.textContent = "Your collection starts here.";
      if (paragraph) paragraph.textContent = "Save wallpapers you like while browsing, and they will appear here.";
    }
    if (emptyAction) emptyAction.innerHTML = "Browse wallpapers <span>↗</span>";
  }

  async function refreshAll() {
    await loadWallpapers();
    await loadSessionAndSaved();
    renderBrowseFeed();
    renderSaved();
    renderRecommendations();
    renderSearchHistory();
    renderRecentlyViewed();
  }

  async function toggleFavourite(id) {
    const item = getItem(id);
    if (!item) return;
    if (!currentUser) {
      notify("Sign in to save wallpapers.");
      $("authOpen")?.click();
      return;
    }
    if (busyIds.has(String(id))) return;
    busyIds.add(String(id));

    try {
      if (savedIds.has(String(id))) {
        const { error } = await supabase.from("favourites")
          .delete().eq("user_id", currentUser.id).eq("wallpaper_id", item.id);
        if (error) throw error;
        savedIds.delete(String(id));
        notify("Removed from saved wallpapers.");
      } else {
        const { error } = await supabase.from("favourites")
          .insert({ user_id: currentUser.id, wallpaper_id: item.id });
        if (error) throw error;
        savedIds.add(String(id));
        notify("Added to saved wallpapers.");
      }
      renderBrowseFeed();
      renderSaved();
      renderRecommendations();
      if (activeDetail && getWallpaperId(activeDetail) === String(id)) updateDetailSaveButton();
    } catch (error) {
      console.error("Could not update saved wallpapers:", error);
      notify(`Could not update saved wallpapers: ${error.message || "Please try again."}`);
    } finally {
      busyIds.delete(String(id));
    }
  }

  async function downloadWallpaper(id) {
    const item = getItem(id);
    if (!item || !getImage(item)) return;
    const anchor = document.createElement("a");
    anchor.href = getImage(item);
    anchor.download = `${String(item.title || "wallpaper").toLowerCase().replace(/[^a-z0-9]+/g, "-") || "wallpaper"}.jpg`;
    anchor.target = "_blank";
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    const { error } = await supabase.rpc("increment_wallpaper_downloads", { p_wallpaper_id: item.id });
    if (error) console.warn("Could not update download count:", error);
    else item.downloads = Number(item.downloads || 0) + 1;
  }

  function updateDetailSaveButton() {
    const button = $("experienceDetailSave");
    if (!button || !activeDetail) return;
    const saved = savedIds.has(getWallpaperId(activeDetail));
    button.textContent = saved ? "♥ Saved" : "♡ Save";
    button.classList.toggle("is-saved", saved);
  }

  function openDetail(id) {
    const item = getItem(id);
    if (!item) return;
    activeDetail = item;
    $("experienceDetailImage").src = getImage(item);
    $("experienceDetailImage").alt = item.title || "Wallpaper";
    $("experienceDetailTitle").textContent = item.title || "Wallpaper";
    $("experienceDetailCategory").textContent = item.category || "WALLPAPER";
    $("experienceDetailDescription").textContent = item.description || "A wallpaper for your screen.";
    const download = $("experienceDetailDownload");
    download.href = getImage(item);
    download.download = `${String(item.title || "wallpaper").toLowerCase().replace(/[^a-z0-9]+/g, "-") || "wallpaper"}.jpg`;
    updateDetailSaveButton();
    $("experienceDetailModal").classList.remove("hidden");
    document.body.classList.add("detail-is-open");
    recordViewed(getWallpaperId(item));
  }

  function closeDetail() {
    $("experienceDetailModal")?.classList.add("hidden");
    document.body.classList.remove("detail-is-open");
    activeDetail = null;
  }

  function handleWallpaperAction(event) {
    const saveButton = event.target.closest("[data-favourite-id]");
    if (saveButton) {
      event.preventDefault();
      toggleFavourite(saveButton.dataset.favouriteId);
      return;
    }
    const downloadButton = event.target.closest("[data-download-id]");
    if (downloadButton) {
      event.preventDefault();
      downloadWallpaper(downloadButton.dataset.downloadId);
      return;
    }
    const openButton = event.target.closest("[data-open-id]");
    if (openButton) {
      event.preventDefault();
      openDetail(openButton.dataset.openId);
    }
  }

  ["browseFeed", "savedWallpapersGrid", "recommendationGrid", "recentlyViewedGrid"].forEach(id => {
    $(id)?.addEventListener("click", handleWallpaperAction);
  });

  $("experienceDetailSave")?.addEventListener("click", () => {
    if (activeDetail) toggleFavourite(getWallpaperId(activeDetail));
  });
  $("experienceDetailDownload")?.addEventListener("click", async () => {
    if (!activeDetail) return;
    const { error } = await supabase.rpc("increment_wallpaper_downloads", { p_wallpaper_id: activeDetail.id });
    if (error) console.warn("Could not update download count:", error);
    else activeDetail.downloads = Number(activeDetail.downloads || 0) + 1;
  });
  $("savedEmptyAction")?.addEventListener("click", () => {
    if (!currentUser) $("authOpen")?.click();
    else window.SuperwallpapersNavigate?.("browse");
  });
  $("experienceDetailClose")?.addEventListener("click", closeDetail);
  $("experienceDetailModal")?.addEventListener("click", event => {
    if (event.target === $("experienceDetailModal")) closeDetail();
  });

  $("searchInput")?.addEventListener("input", () => {
    const clear = $("searchClear");
    if (clear) clear.hidden = !$("searchInput").value.trim();
  });
  $("searchInput")?.addEventListener("keydown", event => {
    if (event.key === "Enter") addSearchHistory($("searchInput").value);
  });
  $("searchInput")?.addEventListener("blur", () => {
    if ($("searchInput").value.trim().length > 2) addSearchHistory($("searchInput").value);
  });
  $("searchClear")?.addEventListener("click", () => {
    $("searchInput").value = "";
    $("searchInput").dispatchEvent(new Event("input", { bubbles: true }));
    $("searchInput").focus();
  });
  $("searchSuggestions")?.addEventListener("click", event => {
    const button = event.target.closest("[data-search-term]");
    if (!button) return;
    $("searchInput").value = button.dataset.searchTerm;
    $("searchInput").dispatchEvent(new Event("input", { bubbles: true }));
    addSearchHistory(button.dataset.searchTerm);
  });
  $("searchHistory")?.addEventListener("click", event => {
    const button = event.target.closest("[data-history-term]");
    if (!button) return;
    $("searchInput").value = button.dataset.historyTerm;
    $("searchInput").dispatchEvent(new Event("input", { bubbles: true }));
    window.SuperwallpapersNavigate?.("search");
  });
  $("clearSearchHistory")?.addEventListener("click", () => {
    safeWrite(HISTORY_KEY, []);
    renderSearchHistory();
    notify("Search history cleared.");
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeDetail();
    const tag = event.target?.tagName?.toLowerCase();
    const typing = tag === "input" || tag === "textarea" || event.target?.isContentEditable;
    if (event.key === "/" && !typing && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      window.SuperwallpapersNavigate?.("search");
      window.setTimeout(() => $("searchInput")?.focus(), 60);
    }
  });

  supabase.auth.onAuthStateChange(() => {
    // Supabase may call this before the refreshed session is available; defer the query.
    window.setTimeout(async () => {
      await loadSessionAndSaved();
      renderBrowseFeed();
      renderSaved();
      renderRecommendations();
    }, 0);
  });

  document.addEventListener("DOMContentLoaded", () => {});
  refreshAll().catch(error => {
    console.error("Could not initialise wallpaper experience:", error);
    renderBrowseFeed();
    renderSaved();
    renderRecommendations();
    renderSearchHistory();
    renderRecentlyViewed();
  });
})();
