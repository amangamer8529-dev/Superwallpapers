import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_EMAIL } from './supabase-config.js';

/* Superwallpapers — unified glass edition. Requires only the existing Supabase config. */
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = id => document.getElementById(id);
const pages = ['home', 'browse', 'search', 'saved'];
const state = { page: 'home', filter: 'All', search: '', sort: 'newest', wallpapers: [], demo: false, user: null, favouriteIds: new Set(), detail: null, authMode: 'signin', viewed: [], history: [] };
const sampleWallpapers = [
  {id:'preview-1',title:'Midnight Galaxy',category:'Space',image_url:'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=86',description:'A little piece of the night sky.',downloads:0,demo:true},
  {id:'preview-2',title:'Wild Escape',category:'Nature',image_url:'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=900&q=86',description:'Find some quiet in the open air.',downloads:0,demo:true},
  {id:'preview-3',title:'Ocean Blue',category:'Nature',image_url:'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=900&q=86',description:'The deepest shades of blue.',downloads:0,demo:true},
  {id:'preview-4',title:'Electric Nights',category:'AMOLED',image_url:'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=86',description:'Made for midnight screens.',downloads:0,demo:true},
  {id:'preview-5',title:'Golden Morning',category:'Nature',image_url:'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=900&q=86',description:'Soft light on a new day.',downloads:0,demo:true},
  {id:'preview-6',title:'Night Drive',category:'Cars',image_url:'https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=900&q=86',description:'A different kind of escape.',downloads:0,demo:true}
];
let toastTimer = null;
let dockGesture = null;
let ignoreDockClickUntil = 0;
let uploadPreviewUrl = null;
const svg = name => `<svg aria-hidden="true"><use href="#i-${name}"></use></svg>`;
const escapeHTML = v => String(v ?? '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
const cleanImageUrl = item => { const raw = item.image_url || item.imageUrl || ''; try { const url = new URL(raw, location.href); return /^https?:$/.test(url.protocol) ? url.href : ''; } catch { return ''; } };
const allItems = () => state.wallpapers.length ? state.wallpapers : sampleWallpapers;
const isAdmin = () => !!state.user && String(state.user.email || '').toLowerCase() === String(ADMIN_EMAIL || '').toLowerCase();
const readLocal = (key, fallback) => { try { const data = JSON.parse(localStorage.getItem(key) || 'null'); return Array.isArray(data) ? data : fallback; } catch { return fallback; } };
const writeLocal = (key, data) => { try { localStorage.setItem(key, JSON.stringify(data)); } catch {} };
function notify(message) { const toast = $('toast'); toast.textContent = String(message); toast.classList.add('is-visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3400); }
function getItem(id) { return allItems().find(item => String(item.id) === String(id)); }
function emptyCard(title, message, actionLabel = '', action = '') { return `<div class="empty-state"><div class="empty-icon">${svg('sparkle')}</div><h3>${escapeHTML(title)}</h3><p>${escapeHTML(message)}</p>${actionLabel ? `<button type="button" data-empty-action="${escapeHTML(action)}">${escapeHTML(actionLabel)}</button>` : ''}</div>`; }
function createWallCard(item) {
  const id = escapeHTML(item.id), title = escapeHTML(item.title || 'Untitled'), category = escapeHTML(item.category || 'Wallpaper'), url = escapeHTML(cleanImageUrl(item));
  const saved = state.favouriteIds.has(String(item.id));
  return `<article class="wall-card" data-card-id="${id}"><button class="wall-picture" type="button" data-preview="${id}" aria-label="Preview ${title}"><img src="${url}" alt="${title}" loading="lazy"><span class="wall-quality">${item.demo ? 'PREVIEW' : 'ORIGINAL'}</span><span class="wall-quick">${svg('arrow')}</span></button><div class="wall-caption"><div><h3 title="${title}">${title}</h3><p>${category}</p></div><button type="button" class="wall-fav ${saved ? 'is-saved' : ''}" data-fav="${id}" aria-label="${saved ? 'Remove from saved' : 'Save'} ${title}">${svg('heart')}</button></div></article>`;
}
function showGrid(id, items, emptyTitle, emptyMessage, actionLabel = '', action = '') { $(id).innerHTML = items.length ? items.map(createWallCard).join('') : emptyCard(emptyTitle, emptyMessage, actionLabel, action); }
function sortItems(items) {
  const result = [...items];
  if (state.sort === 'popular') result.sort((a,b) => Number(b.downloads || 0) - Number(a.downloads || 0));
  else if (state.sort === 'az') result.sort((a,b) => String(a.title || '').localeCompare(String(b.title || '')));
  else result.sort((a,b) => (Date.parse(b.created_at || '') || 0) - (Date.parse(a.created_at || '') || 0));
  return result;
}
function renderHome() { showGrid('homeGrid', sortItems(allItems()).slice(0,8), 'A new world is coming', 'Upload your first wallpaper and your collection will appear here.'); }
function renderBrowse() {
  const items = sortItems(allItems().filter(item => state.filter === 'All' || String(item.category).toLowerCase() === state.filter.toLowerCase()));
  document.querySelectorAll('[data-filter]').forEach(el => { const active = el.dataset.filter === state.filter; el.classList.toggle('is-active', active); el.setAttribute('aria-pressed', String(active)); });
  $('browseCount').textContent = `${items.length} ${items.length === 1 ? 'wallpaper' : 'wallpapers'}${state.wallpapers.length ? '' : ' · samples'}`;
  showGrid('browseGrid', items, 'Nothing in this world yet', 'Try another category, or check back for new wallpapers.', 'View all categories', 'all');
}
function saveSearchHistory(text) { const term = String(text || '').trim().slice(0,80); if (!term) return; state.history = [term, ...state.history.filter(h => h.toLowerCase() !== term.toLowerCase())].slice(0,8); writeLocal('sw.searchHistory.v2',state.history); renderHistory(); }
function renderHistory() { $('searchHistorySection').hidden = state.history.length === 0; $('historyList').innerHTML = state.history.map(h => `<button type="button" data-history="${escapeHTML(h)}">${svg('search')} ${escapeHTML(h)}</button>`).join(''); }
function renderSearch() {
  const query = state.search.toLowerCase().trim(); const items = query ? allItems().filter(item => [item.title,item.category,item.description].some(v => String(v||'').toLowerCase().includes(query))) : sortItems(allItems());
  $('searchClear').hidden = !query;
  $('searchEyebrow').textContent = query ? 'THE SEARCH RESULTS' : 'EXPLORE THE POSSIBILITIES';
  $('searchHeading').innerHTML = query ? 'Your <span>matches.</span>' : 'Made for <span>you.</span>';
  $('searchCount').textContent = `${items.length} ${items.length === 1 ? 'result' : 'results'}`;
  showGrid('searchGrid', items, 'No matches found', 'Try another word or explore one of the popular searches.', 'Browse everything', 'all');
  const recent = state.viewed.map(id => getItem(id)).filter(Boolean).slice(0,4);
  $('recentlyViewedSection').hidden = !recent.length;
  if (recent.length) showGrid('recentlyViewedGrid',recent,'','');
  renderHistory();
}
function renderSaved() {
  $('savedSignIn').hidden = !!state.user;
  const found = allItems().filter(item => state.favouriteIds.has(String(item.id)) && !item.demo);
  $('savedCount').textContent = state.user ? `${found.length} saved ${found.length === 1 ? 'wallpaper' : 'wallpapers'}` : 'Sign in to sync your favourites';
  if (!state.user) showGrid('savedGrid', [], 'Your collection starts here', 'Sign in to keep your favourite wallpapers close, wherever you go.', 'Sign in', 'signin');
  else showGrid('savedGrid', found, 'Nothing saved yet', 'Explore the collection and tap the heart on anything you love.', 'Discover wallpapers', 'browse');
}
function renderAll() { renderHome(); renderBrowse(); renderSearch(); renderSaved(); updateDetailSave(); }

/* Navigation and liquid-glass swipe indicator */
function updateDockIndicator(tab = state.page) {
  const button = document.querySelector(`.dock-tab[data-tab="${tab}"]`);
  const indicator = $('dockShine');
  if (!button || !indicator) return;
  indicator.style.left = `${button.offsetLeft}px`;
  indicator.style.width = `${button.offsetWidth}px`;
  document.querySelectorAll('[data-tab]').forEach(b => { b.classList.toggle('is-active', b.dataset.tab === tab); b.setAttribute('aria-current', b.dataset.tab === tab ? 'page' : 'false'); });
}
function updateTopNav() { document.querySelectorAll('.header-link').forEach(b => b.classList.toggle('is-active', b.dataset.nav === state.page)); }
function navigate(page, options = {}) {
  if (!pages.includes(page)) return;
  closeMenu(false);
  state.page = page;
  document.querySelectorAll('[data-page]').forEach(el => { const active = el.dataset.page === page; el.hidden = !active; el.classList.toggle('is-active', active); });
  updateDockIndicator(page); updateTopNav();
  if (page === 'browse') renderBrowse();
  if (page === 'search') renderSearch();
  if (page === 'saved') renderSaved();
  if (!options.keepScroll) window.scrollTo({top:0,behavior:'instant'});
  if (options.updateHash !== false) history.replaceState(null,'',`#${page}`);
}
function openMenu() {
  if ($('menuPanel').classList.contains('is-open')) return;
  $('menuScrim').hidden = false;
  $('menuPanel').inert = false;
  $('menuPanel').classList.add('is-open');
  $('menuPanel').setAttribute('aria-hidden','false');
  $('headerMenuButton').setAttribute('aria-expanded','true');
  document.body.classList.add('is-locked');
  updateDockIndicator('menu');
}
function closeMenu(updateDock=true) {
  $('menuPanel').classList.remove('is-open');
  $('menuPanel').setAttribute('aria-hidden','true');
  $('menuPanel').inert = true;
  $('menuScrim').hidden = true;
  $('headerMenuButton').setAttribute('aria-expanded','false');
  if (!document.querySelector('.modal-backdrop:not([hidden])')) document.body.classList.remove('is-locked');
  if (updateDock) updateDockIndicator(state.page);
}
function dockAction(tab) { if (tab === 'menu') { if (!$('menuPanel').classList.contains('is-open')) openMenu(); else closeMenu(); } else navigate(tab); }
function bindDockSwipe() {
  const dock = $('bottomDock');
  const tabs = [...dock.querySelectorAll('[data-tab]')];
  const indicator = $('dockShine');
  const closestTab = x => tabs.reduce((best,tab) => Math.abs(tab.getBoundingClientRect().left + tab.offsetWidth/2 - x) < Math.abs(best.getBoundingClientRect().left + best.offsetWidth/2 - x) ? tab : best,tabs[0]);
  dock.addEventListener('pointerdown', e => { if (e.button !== 0 && e.pointerType === 'mouse') return; dockGesture = {pointerId:e.pointerId,startX:e.clientX,moved:false}; });
  dock.addEventListener('pointermove', e => {
    if (!dockGesture || e.pointerId !== dockGesture.pointerId) return;
    if (!dockGesture.moved && Math.abs(e.clientX - dockGesture.startX) > 12) { dockGesture.moved = true; try { dock.setPointerCapture(e.pointerId); } catch {} }
    if (!dockGesture.moved) return;
    indicator.style.transition = 'none';
    const rect = dock.getBoundingClientRect();
    const max = rect.width - indicator.offsetWidth - 7;
    const left = Math.max(7,Math.min(max,e.clientX-rect.left-indicator.offsetWidth/2));
    indicator.style.left = `${left}px`;
  });
  dock.addEventListener('pointerup', e => {
    if (!dockGesture || e.pointerId !== dockGesture.pointerId) return;
    const moved = dockGesture.moved; dockGesture = null;
    indicator.style.transition = '';
    if (moved) { ignoreDockClickUntil = performance.now() + 500; dockAction(closestTab(e.clientX).dataset.tab); }
  });
  dock.addEventListener('pointercancel', () => { dockGesture=null;indicator.style.transition='';updateDockIndicator($('menuPanel').classList.contains('is-open')?'menu':state.page); });
  dock.addEventListener('click', e => { const tab=e.target.closest('[data-tab]'); if (!tab || performance.now() < ignoreDockClickUntil) return; dockAction(tab.dataset.tab); });
  window.addEventListener('resize',() => updateDockIndicator($('menuPanel').classList.contains('is-open') ? 'menu' : state.page));
  requestAnimationFrame(() => updateDockIndicator());
}

/* Auth, account and admin */
function openModal(id) { closeMenu(); $(id).hidden=false; document.body.classList.add('is-locked'); }
function closeModal(id) { $(id).hidden=true; if (!$('menuPanel').classList.contains('is-open') && !document.querySelector('.modal-backdrop:not([hidden])')) document.body.classList.remove('is-locked'); }
function setAuthMode(mode) {
  state.authMode=mode; const signup=mode==='signup';
  $('usernameLabel').hidden=!signup; $('usernameInput').required=signup;
  $('passwordInput').autocomplete=signup?'new-password':'current-password';
  $('authTitle').innerHTML=signup?'Join the <span>universe.</span>':'Good to see <span>you.</span>';
  $('authSubmit').innerHTML=`${signup?'Create account':'Sign in'} ${svg('arrow')}`;
  document.querySelectorAll('[data-auth-mode]').forEach(el=>el.classList.toggle('is-active',el.dataset.authMode===mode));
}
function openAuth(mode='signin') { setAuthMode(mode);openModal('authModal'); }
function updateAccountUI() {
  const u=state.user;
  const displayName=String(u?.user_metadata?.display_name || u?.user_metadata?.username || u?.email?.split('@')[0] || 'My account');
  $('accountButtonText').textContent=u?displayName:'Sign in';
  $('accountName').textContent=displayName;
  $('accountEmail').textContent=u?.email || '';
  $('accountAvatar').textContent=displayName.charAt(0).toUpperCase();
  $('adminOpen').hidden=!isAdmin();
}
async function loadSession() {
  try {
    const {data,error}=await supabase.auth.getSession(); if(error)throw error;
    state.user=data?.session?.user || null;
    if(state.user) {
      const {data:favs,error:favError}=await supabase.from('favourites').select('wallpaper_id').eq('user_id',state.user.id);
      if(favError) throw favError;
      state.favouriteIds=new Set((favs||[]).map(x=>String(x.wallpaper_id)));
    } else state.favouriteIds=new Set();
  } catch(err) { console.warn('Session refresh issue',err);state.favouriteIds=new Set(); }
  updateAccountUI();renderAll();
}
async function doAuth(e) {
  e.preventDefault();const submit=$('authSubmit');submit.disabled=true;
  const email=$('emailInput').value.trim(),password=$('passwordInput').value;
  try {
    if(state.authMode==='signup') {
      const name=$('usernameInput').value.trim();if(name.length<2)throw Error('Please choose a username with at least two characters.');
      const {data,error}=await supabase.auth.signUp({email,password,options:{data:{username:name,display_name:name}}});if(error)throw error;
      notify(data?.session?'Welcome to Superwallpapers!':'Check your email to confirm your account.');
    } else {
      const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;
      notify('Welcome back!');
    }
    closeModal('authModal');$('authForm').reset();await loadSession();
  }catch(err){notify(err?.message || 'Could not sign in. Please try again.');}finally{submit.disabled=false;}
}
async function googleSignIn() {
  const {error}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:`${location.origin}${location.pathname}#home`}});
  if(error)notify(error.message);
}
async function signOut() { const {error}=await supabase.auth.signOut(); if(error){notify(error.message);return;}state.user=null;state.favouriteIds.clear();closeModal('accountModal');updateAccountUI();renderAll();notify('Signed out. See you soon!'); }
async function loadWallpapers(showError=true) {
  try {
    const {data,error}=await supabase.from('wallpapers').select('*').order('created_at',{ascending:false});
    if(error)throw error;
    state.wallpapers=(data||[]).filter(w=>!!cleanImageUrl(w));state.demo=state.wallpapers.length===0;
  } catch(err) {
    console.warn('Wallpaper load failed',err);state.wallpapers=[];state.demo=true;
    if(showError)notify('Live wallpapers are unavailable right now. Showing previews.');
  }
  renderAll();
}
async function toggleFavourite(id) {
  const item=getItem(id);if(!item)return;
  if(item.demo){notify('This is a sample preview. Save your published wallpapers instead.');return;}
  if(!state.user){openAuth();notify('Sign in to save wallpapers.');return;}
  const wasSaved=state.favouriteIds.has(String(id));
  if(wasSaved)state.favouriteIds.delete(String(id));else state.favouriteIds.add(String(id));
  renderAll();
  try {
    const q=wasSaved?supabase.from('favourites').delete().eq('user_id',state.user.id).eq('wallpaper_id',id):supabase.from('favourites').insert({user_id:state.user.id,wallpaper_id:id});
    const {error}=await q;if(error)throw error;
    notify(wasSaved?'Removed from saved.':'Added to your collection.');
  } catch(err) { if(wasSaved)state.favouriteIds.add(String(id));else state.favouriteIds.delete(String(id));renderAll();notify('Could not save wallpaper: '+err.message); }
}
function recordViewed(id) { state.viewed=[String(id),...state.viewed.filter(x=>x!==String(id))].slice(0,12);writeLocal('sw.viewed.v2',state.viewed);renderSearch(); }
function getDownloadUrl(item) {
  const name=(item.title||'wallpaper').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'wallpaper';
  if(item.storage_path) {
    const {data}=supabase.storage.from('wallpapers').getPublicUrl(item.storage_path,{download:name});
    if(data?.publicUrl)return data.publicUrl;
  }
  const u = new URL(cleanImageUrl(item));u.searchParams.set('download',name);return u.href;
}
function updateDetailSave() { const item=state.detail;if(!item)return;const saved=state.favouriteIds.has(String(item.id));$('detailSave').classList.toggle('is-saved',saved);$('detailSave').setAttribute('aria-label',saved?'Remove from saved':'Save wallpaper'); }
function openDetail(id) {
  const item=getItem(id);if(!item)return;state.detail=item;
  $('detailImage').src=cleanImageUrl(item);$('detailImage').alt=item.title||'Wallpaper';
  $('detailTitle').textContent=item.title||'Untitled wallpaper';$('detailCategory').textContent=item.category||'Wallpaper';
  $('detailDescription').textContent=item.description||'A fresh look for your screen.';
  $('detailDownloadText').textContent=item.demo?'Sample preview':'Download original';
  $('detailHint').textContent=item.demo?'This is an inspiration preview. Download is available for wallpapers published by the admin.':'Images are provided by their owners. Please respect their rights.';
  $('detailDownload').href=item.demo?'#':getDownloadUrl(item);
  $('detailDownload').setAttribute('aria-disabled',String(!!item.demo));
  updateDetailSave();recordViewed(id);openModal('detailModal');
}
async function recordDownload() { if(!state.detail || state.detail.demo){notify('This is an inspiration preview, not a downloadable wallpaper.');return;}
  try { const {error}=await supabase.rpc('increment_wallpaper_downloads',{p_wallpaper_id:state.detail.id});if(error)throw error;state.detail.downloads=Number(state.detail.downloads||0)+1; }catch(err){console.warn('Unable to increment download count:',err);} }
async function publishWallpaper(e) {
  e.preventDefault();if(!isAdmin()){notify('Admin access required.');return;}
  const file=$('wallpaperFile').files?.[0];if(!file){notify('Choose an image first.');return;}
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)){notify('Choose a JPG, PNG or WebP image.');return;}
  if(file.size>20*1024*1024){notify('Choose an image smaller than 20 MB.');return;}
  const title=$('wallpaperTitle').value.trim();if(!title){notify('Enter a wallpaper title.');return;}
  const btn=$('publishButton');btn.disabled=true;btn.textContent='Uploading wallpaper...';
  let storagePath=null;
  try {
    const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
    storagePath=`${state.user.id}/${Date.now()}-${safeName}`;
    const {error:uploadError}=await supabase.storage.from('wallpapers').upload(storagePath,file,{contentType:file.type,upsert:false,cacheControl:'3600'});
    if(uploadError)throw uploadError;
    const {data:{publicUrl}}=supabase.storage.from('wallpapers').getPublicUrl(storagePath);
    const {error:dbError}=await supabase.from('wallpapers').insert({title,category:$('wallpaperCategory').value,description:$('wallpaperDescription').value.trim(),image_url:publicUrl,storage_path:storagePath,downloads:0,created_by:state.user.id});
    if(dbError)throw dbError;
    notify('Wallpaper published successfully!');$('uploadForm').reset();$('uploadPreview').hidden=true;if(uploadPreviewUrl)URL.revokeObjectURL(uploadPreviewUrl);uploadPreviewUrl=null;
    closeModal('adminModal');await loadWallpapers(false);state.filter='All';navigate('browse');
  } catch(err) {
    if(storagePath) {
      // Remove an orphaned image if the database insertion failed. Cleanup may itself be denied by RLS.
      await supabase.storage.from('wallpapers').remove([storagePath]).catch(()=>{});
    }
    notify('Upload failed: '+(err?.message||'Unknown error'));
  } finally {btn.disabled=false;btn.innerHTML=`Publish wallpaper ${svg('arrow')}`;}
}

/* Interactions */
document.addEventListener('click',e=>{
  const target=e.target;
  const nav=target.closest('[data-nav]');if(nav){e.preventDefault();navigate(nav.dataset.nav);return;}
  const cat=target.closest('[data-category]');if(cat){state.filter=cat.dataset.category;navigate('browse');return;}
  const filter=target.closest('[data-filter]');if(filter){state.filter=filter.dataset.filter;renderBrowse();return;}
  const search=target.closest('[data-search]');if(search){state.search=search.dataset.search;$('searchInput').value=state.search;renderSearch();saveSearchHistory(state.search);$('searchInput').focus();return;}
  const hist=target.closest('[data-history]');if(hist){state.search=hist.dataset.history;$('searchInput').value=state.search;renderSearch();saveSearchHistory(state.search);return;}
  const preview=target.closest('[data-preview]');if(preview){openDetail(preview.dataset.preview);return;}
  const fav=target.closest('[data-fav]');if(fav){toggleFavourite(fav.dataset.fav);return;}
  const authMode=target.closest('[data-auth-mode]');if(authMode){setAuthMode(authMode.dataset.authMode);return;}
  const close=target.closest('[data-close]');if(close){closeModal(close.dataset.close);return;}
  const empty=target.closest('[data-empty-action]');if(empty){if(empty.dataset.emptyAction==='signin')openAuth();else if(empty.dataset.emptyAction==='all'){state.filter='All';navigate('browse');}else navigate(empty.dataset.emptyAction);return;}
});
$('headerMenuButton').addEventListener('click',()=>{$('menuPanel').classList.contains('is-open')?closeMenu():openMenu();});
$('closeMenu').addEventListener('click',()=>closeMenu());$('menuScrim').addEventListener('click',()=>closeMenu());
$('accountButton').addEventListener('click',()=>state.user?openModal('accountModal'):openAuth());
$('savedSignIn').addEventListener('click',()=>openAuth());
$('accountSaved').addEventListener('click',()=>{closeModal('accountModal');navigate('saved');});
$('adminOpen').addEventListener('click',()=>{if(!isAdmin())return;closeModal('accountModal');openModal('adminModal');});
$('signOut').addEventListener('click',signOut);
$('authForm').addEventListener('submit',doAuth);$('googleButton').addEventListener('click',googleSignIn);
$('uploadForm').addEventListener('submit',publishWallpaper);
$('wallpaperFile').addEventListener('change',()=>{const file=$('wallpaperFile').files?.[0];if(uploadPreviewUrl)URL.revokeObjectURL(uploadPreviewUrl);uploadPreviewUrl=file?URL.createObjectURL(file):null;$('uploadPreview').hidden=!uploadPreviewUrl;if(uploadPreviewUrl)$('uploadPreview').src=uploadPreviewUrl;});
$('detailSave').addEventListener('click',()=>state.detail&&toggleFavourite(state.detail.id));
$('detailDownload').addEventListener('click',e=>{if(!state.detail||state.detail.demo){e.preventDefault();notify('This is an inspiration preview.');return;}recordDownload();});
for(const modal of document.querySelectorAll('.modal-backdrop'))modal.addEventListener('click',e=>{if(e.target===modal)closeModal(modal.id);});
$('sortSelect').addEventListener('change',e=>{state.sort=e.target.value;renderBrowse();renderHome();});
$('searchInput').addEventListener('input',e=>{state.search=e.target.value;renderSearch();});
$('searchInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();saveSearchHistory(state.search);$('searchInput').blur();}});
$('searchInput').addEventListener('blur',()=>{if(state.search.trim().length>2)saveSearchHistory(state.search);});
$('searchClear').addEventListener('click',()=>{state.search='';$('searchInput').value='';renderSearch();$('searchInput').focus();});
$('clearHistory').addEventListener('click',()=>{state.history=[];writeLocal('sw.searchHistory.v2',[]);renderHistory();});
$('categoryNext').addEventListener('click',()=>$('categoryRail').scrollBy({left:390,behavior:'smooth'}));
$('categoryPrev').addEventListener('click',()=>$('categoryRail').scrollBy({left:-390,behavior:'smooth'}));
$('randomWallpaperButton').addEventListener('click',()=>{const list=allItems();if(list.length)openDetail(list[Math.floor(Math.random()*list.length)].id);else navigate('browse');});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeMenu();document.querySelectorAll('.modal-backdrop:not([hidden])').forEach(el=>closeModal(el.id));}});
window.addEventListener('hashchange',()=>{const page=location.hash.replace('#','');if(pages.includes(page)&&page!==state.page)navigate(page,{updateHash:false});});

async function init() {
  state.history=readLocal('sw.searchHistory.v2',[]).slice(0,8);
  state.viewed=readLocal('sw.viewed.v2',[]).slice(0,12).map(String);
  bindDockSwipe();
  updateAccountUI();renderAll();
  const initialPage=location.hash.replace('#','');navigate(pages.includes(initialPage)?initialPage:'home',{updateHash:false,keepScroll:true});
  // Supabase invokes its auth listener after initialization and on subsequent sign-in/out.
  supabase.auth.onAuthStateChange(()=>setTimeout(()=>loadSession().catch(err=>console.warn('Auth refresh issue:',err)),0));
  await Promise.allSettled([loadWallpapers(false),loadSession()]);
}
init().catch(err=>{console.error('Superwallpapers startup failed:',err);notify('Something went wrong loading the website.');renderAll();});
