/* BookMyShow MVP frontend — vanilla JS SPA served from Spring Boot static resources. */

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const state = {
  accessToken: localStorage.getItem("bms_accessToken") || null,
  refreshToken: localStorage.getItem("bms_refreshToken") || null,
  user: JSON.parse(localStorage.getItem("bms_user") || "null"),
  cities: [],
  cityId: localStorage.getItem("bms_cityId") || "",
  // booking working set
  selectedShow: null,
  selectedSeats: [], // showSeatIds
  availability: null,
};

// ---------------------------------------------------------------------------
// API client
// ---------------------------------------------------------------------------
async function api(path, { method = "GET", body, auth = false } = {}) {
  const doFetch = () => {
    const headers = { "Content-Type": "application/json" };
    if (auth && state.accessToken) headers["Authorization"] = `Bearer ${state.accessToken}`;
    return fetch(`/api${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  };

  let res = await doFetch();

  // This backend returns 403 (not 401) for missing/expired/invalid tokens, so
  // treat both as an auth failure and attempt a one-shot token refresh + retry.
  if ((res.status === 401 || res.status === 403) && auth && state.refreshToken) {
    const refreshed = await tryRefresh();
    if (refreshed) res = await doFetch();
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }

  if (!res.ok) {
    const message = (data && data.message) || (typeof data === "string" && data) || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.authFailed = auth && (res.status === 401 || res.status === 403);
    throw err;
  }
  return data;
}

async function tryRefresh() {
  try {
    const data = await api("/auth/refresh", { method: "POST", body: { refreshToken: state.refreshToken } });
    setSession(data);
    return true;
  } catch {
    clearSession();
    return false;
  }
}

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------
function setSession(token) {
  state.accessToken = token.accessToken;
  state.refreshToken = token.refreshToken;
  state.user = { userId: token.userId, email: token.email };
  localStorage.setItem("bms_accessToken", token.accessToken);
  localStorage.setItem("bms_refreshToken", token.refreshToken);
  localStorage.setItem("bms_user", JSON.stringify(state.user));
  renderAuthArea();
}

function clearSession() {
  state.accessToken = null;
  state.refreshToken = null;
  state.user = null;
  localStorage.removeItem("bms_accessToken");
  localStorage.removeItem("bms_refreshToken");
  localStorage.removeItem("bms_user");
  renderAuthArea();
}

function isLoggedIn() { return !!state.accessToken; }

// ---------------------------------------------------------------------------
// Show-meta cache — lets the seat page render a real header (movie / theatre /
// showtime) without a dedicated GET /api/shows/{id} endpoint. Populated from
// the movie page and persisted so a refresh on the seat page still has context.
// ---------------------------------------------------------------------------
function cacheShow(s) {
  if (!s || !s.id) return;
  const meta = {
    id: s.id,
    movieId: s.movieId,
    movieTitle: s.movieTitle,
    theatreName: s.theatreName,
    screenName: s.screenName,
    startTime: s.startTime,
  };
  try { sessionStorage.setItem(`bms_show_${s.id}`, JSON.stringify(meta)); } catch {}
}

function getCachedShow(id) {
  try { return JSON.parse(sessionStorage.getItem(`bms_show_${id}`) || "null"); } catch { return null; }
}

// ---------------------------------------------------------------------------
// Tiny helpers
// ---------------------------------------------------------------------------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const view = () => $("#view");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const inr = (n) => `₹${Number(n || 0).toFixed(0)}`;
const fmtDateTime = (d) => new Date(d).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// ---------------------------------------------------------------------------
// Stackable notifications — multiple toasts coexist and auto-dismiss; each can
// be dismissed manually. `toast()` is kept as a thin alias for older call sites.
// ---------------------------------------------------------------------------
const NOTIF_ICONS = { success: "✓", error: "⚠️", info: "ℹ️", "": "ℹ️" };
function notify(msg, type = "", { timeout = 3600 } = {}) {
  const host = $("#notifications");
  if (!host) return;
  const el = document.createElement("div");
  el.className = `notification ${type || "info"}`;
  el.setAttribute("role", type === "error" ? "alert" : "status");
  el.innerHTML = `
    <span class="notif-icon" aria-hidden="true">${NOTIF_ICONS[type] || NOTIF_ICONS.info}</span>
    <span class="notif-msg"></span>
    <button class="notif-close" type="button" aria-label="Dismiss notification">&times;</button>`;
  el.querySelector(".notif-msg").textContent = msg;
  const remove = () => {
    if (el.classList.contains("leaving")) return;
    el.classList.add("leaving");
    setTimeout(() => el.remove(), 220);
  };
  el.querySelector(".notif-close").onclick = remove;
  host.appendChild(el);
  if (timeout > 0) setTimeout(remove, timeout);
  return el;
}

function toast(msg, type = "") { return notify(msg, type); }

// ---------------------------------------------------------------------------
// Confirmation dialog — promise-based; resolves true on confirm, false on
// cancel/Esc/backdrop. Used to guard destructive actions like cancelling.
// ---------------------------------------------------------------------------
let confirmResolver = null;
let confirmLastFocus = null;
function confirmDialog({ title = "Are you sure?", body = "", confirmLabel = "Confirm", cancelLabel = "Cancel", danger = false } = {}) {
  const modal = $("#confirmModal");
  confirmLastFocus = document.activeElement;
  $("#confirmTitle").textContent = title;
  $("#confirmBody").innerHTML = body;
  const okBtn = $("#confirmOk");
  const cancelBtn = $("#confirmCancel");
  okBtn.textContent = confirmLabel;
  cancelBtn.textContent = cancelLabel;
  okBtn.className = `btn ${danger ? "btn-danger" : "btn-primary"}`;
  modal.hidden = false;
  setTimeout(() => okBtn.focus(), 0);
  return new Promise((resolve) => { confirmResolver = resolve; });
}

function closeConfirm(result) {
  const modal = $("#confirmModal");
  if (modal.hidden) return;
  modal.hidden = true;
  if (confirmResolver) { confirmResolver(result); confirmResolver = null; }
  if (confirmLastFocus && typeof confirmLastFocus.focus === "function") confirmLastFocus.focus();
}

function loading() { view().innerHTML = `<div class="spinner" role="status" aria-label="Loading"></div>`; }

// ---------------------------------------------------------------------------
// Seat-hold countdown — the backend holds PENDING bookings for ~5 minutes.
// ---------------------------------------------------------------------------
let holdTimer = null;
function clearHoldTimer() {
  if (holdTimer) { clearInterval(holdTimer); holdTimer = null; }
}

function startHoldCountdown(expiresAtMs, onExpire) {
  clearHoldTimer();
  const el = $("#holdTimer");
  if (!el || !expiresAtMs) return;
  const tick = () => {
    const remaining = expiresAtMs - Date.now();
    el.textContent = mmss(remaining);
    el.classList.toggle("urgent", remaining <= 60_000);
    if (remaining <= 0) {
      clearHoldTimer();
      el.textContent = "00:00";
      if (typeof onExpire === "function") onExpire();
    }
  };
  tick();
  holdTimer = setInterval(tick, 1000);
}

const mmss = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
};

// ---------------------------------------------------------------------------
// Skeleton loaders (perceived-speed placeholders)
// ---------------------------------------------------------------------------
function skeletonCards(count = 10) {
  const card = `
    <div class="skel-card">
      <div class="skel skel-poster"></div>
      <div class="skel-meta">
        <div class="skel skel-line lg"></div>
        <div class="skel skel-line sm"></div>
      </div>
    </div>`;
  return `<div class="movie-grid">${card.repeat(count)}</div>`;
}

function skeletonHome() {
  view().innerHTML = `
    <div class="skel skel-line title"></div>
    <div class="filters">${`<div class="skel skel-chip"></div>`.repeat(4)}</div>
    ${skeletonCards(10)}`;
}

function skeletonMovie() {
  view().innerHTML = `
    <div class="detail-hero">
      <div class="skel skel-hero-poster"></div>
      <div class="info" style="flex:1">
        <div class="skel skel-line title"></div>
        <div class="skel skel-line sm" style="width:60%"></div>
        <div class="skel skel-line" style="width:90%;margin-top:18px"></div>
        <div class="skel skel-line" style="width:80%"></div>
        <div class="skel skel-line" style="width:70%"></div>
      </div>
    </div>
    <div class="skel skel-line title" style="width:200px"></div>
    <div class="show-list">${`<div class="skel skel-show-row"></div>`.repeat(4)}</div>`;
}

function setCrumbs(items) {
  const bc = $("#breadcrumbs");
  bc.innerHTML = items
    .map((it, i) => {
      const sep = i > 0 ? `<span class="sep" aria-hidden="true">/</span>` : "";
      return it.route
        ? `${sep}<a href="#/${esc(it.route)}">${esc(it.label)}</a>`
        : `${sep}<span aria-current="page">${esc(it.label)}</span>`;
    })
    .join("");
}

// ---------------------------------------------------------------------------
// Router (hash-based)
// ---------------------------------------------------------------------------
const routes = {
  "": renderHome,
  home: renderHome,
  movie: renderMovie, // movie/:id
  show: renderShow, // show/:id
  checkout: renderCheckout, // checkout/:bookingId
  bookings: renderMyBookings,
  ticket: renderTicket, // ticket/:bookingId
  profile: renderProfile,
  refund: renderRefund, // refund/:refundId
};

// navigate accepts either a plain route string ("movie/5") or an options object
// with a query map: navigate("home", { genre: "ACTION" }). Query keys with
// empty/false values are omitted so links stay clean and shareable.
function navigate(route, query) {
  window.location.hash = "#/" + buildHash(route, query);
}

function buildHash(path, query) {
  const qs = query ? encodeQuery(query) : "";
  return qs ? `${path}?${qs}` : path;
}

function encodeQuery(query) {
  const params = new URLSearchParams();
  Object.entries(query || {}).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "" || v === false) return;
    params.set(k, v === true ? "1" : String(v));
  });
  return params.toString();
}

function parseHash() {
  const raw = window.location.hash.replace(/^#\/?/, "");
  const [pathPart, queryPart] = raw.split("?");
  const [head, ...rest] = pathPart.split("/");
  return {
    head: head || "",
    param: rest.join("/"),
    query: new URLSearchParams(queryPart || ""),
  };
}

// Rewrites the query string of the *current* route without adding a history
// entry — used by filters so the Back button skips intermediate filter states.
function replaceQuery(query) {
  const { head, param } = parseHash();
  const path = param ? `${head}/${param}` : head;
  const url = `#/${buildHash(path, query)}`;
  history.replaceState(null, "", url);
}

function errorState(message) {
  const offline = !navigator.onLine;
  view().innerHTML = `
    <div class="empty error-state" role="alert">
      <div class="error-icon" aria-hidden="true">⚠️</div>
      <h2>Something went wrong</h2>
      <p>${esc(offline ? "You appear to be offline." : (message || "We couldn't load this page."))}</p>
      <button class="btn btn-primary" data-retry>Retry</button>
    </div>`;
}

async function router() {
  clearHoldTimer();
  const { head, param, query } = parseHash();
  const handler = routes[head] || renderHome;
  syncTopbarSearch(query);
  try {
    await handler(param, query);
  } catch (e) {
    if (e && e.authFailed) return; // login modal already prompted
    errorState(e && e.message);
  }
}

// Keep the topbar search input in sync with the URL's ?q= when on Home.
function syncTopbarSearch(query) {
  const input = $("#searchInput");
  if (!input) return;
  const head = parseHash().head || "home";
  const q = (head === "home" || head === "") ? (query.get("q") || "") : "";
  if (document.activeElement !== input) input.value = q;
  const clear = $("#searchClear");
  if (clear) clear.hidden = !input.value;
}

// ---------------------------------------------------------------------------
// Auth area + modal
// ---------------------------------------------------------------------------
function renderAuthArea() {
  const area = $("#authArea");
  if (isLoggedIn()) {
    area.innerHTML = `
      <button class="user-chip user-chip-btn" data-link="profile" title="View profile">Hi, <b>${esc(state.user.email.split("@")[0])}</b></button>
      <button class="btn btn-sm" data-link="bookings">My Bookings</button>
      <button class="btn btn-sm btn-ghost" id="logoutBtn">Logout</button>`;
    $("#logoutBtn").onclick = () => { clearSession(); toast("Logged out"); navigate("home"); };
  } else {
    area.innerHTML = `<button class="btn btn-primary btn-sm" id="loginBtn">Login</button>`;
    $("#loginBtn").onclick = () => openAuth("login");
  }
}

let lastFocusedBeforeModal = null;
function openAuth(tab = "login") {
  lastFocusedBeforeModal = document.activeElement;
  $("#authModal").hidden = false;
  switchAuthTab(tab);
  $("#authError").textContent = "";
  clearFieldErrors();
  // Focus the first input for keyboard users.
  const firstInput = $(`#${tab}Form input`);
  if (firstInput) setTimeout(() => firstInput.focus(), 0);
}

function closeAuth() {
  $("#authModal").hidden = true;
  if (authResolver) { authResolver(false); authResolver = null; }
  if (lastFocusedBeforeModal && typeof lastFocusedBeforeModal.focus === "function") {
    lastFocusedBeforeModal.focus();
  }
}

function switchAuthTab(tab) {
  document.querySelectorAll(".tab").forEach((t) => {
    const active = t.dataset.tab === tab;
    t.classList.toggle("active", active);
    t.setAttribute("aria-selected", active ? "true" : "false");
  });
  $("#loginForm").hidden = tab !== "login";
  $("#signupForm").hidden = tab !== "signup";
  $("#authError").textContent = "";
  clearFieldErrors();
}

function clearFieldErrors(form) {
  const scope = form || document;
  scope.querySelectorAll(".field-error").forEach((el) => (el.textContent = ""));
  scope.querySelectorAll(".auth-form input.invalid").forEach((el) => el.classList.remove("invalid"));
}

function setFieldError(form, name, message) {
  const small = form.querySelector(`.field-error[data-error-for="${name}"]`);
  const input = form.querySelector(`[name="${name}"]`);
  if (small) small.textContent = message;
  if (input) input.classList.add("invalid");
}

// Returns true when valid; otherwise paints inline errors and focuses the first.
function validateAuthForm(form, fields) {
  clearFieldErrors(form);
  let firstBad = null;
  for (const f of fields) {
    const input = form.querySelector(`[name="${f.name}"]`);
    const value = (input && input.value || "").trim();
    let msg = "";
    if (!value) msg = `${f.label} is required`;
    else if (f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) msg = "Enter a valid email";
    else if (f.minLength && value.length < f.minLength) msg = `${f.label} must be at least ${f.minLength} characters`;
    if (msg) {
      setFieldError(form, f.name, msg);
      if (!firstBad) firstBad = input;
    }
  }
  if (firstBad) firstBad.focus();
  return !firstBad;
}

// Resolve after successful login, used to resume an interrupted action.
let authResolver = null;
function requireLogin() {
  if (isLoggedIn()) return Promise.resolve(true);
  openAuth("login");
  return new Promise((resolve) => { authResolver = resolve; });
}

// ---------------------------------------------------------------------------
// Cities
// ---------------------------------------------------------------------------
async function loadCities() {
  state.cities = await api("/catalog/cities");
  if (!state.cityId && state.cities.length) state.cityId = String(state.cities[0].id);
  const sel = $("#citySelect");
  sel.innerHTML = state.cities.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("");
  sel.value = state.cityId;
  sel.onchange = () => {
    state.cityId = sel.value;
    localStorage.setItem("bms_cityId", state.cityId);
    const head = parseHash().head || "home";
    if (head === "home" || head === "" || head === "movie") router();
  };
}

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------
// Small cache so flipping filters doesn't re-hit now-showing/coming-soon every
// keystroke. Keyed by the active city; search results are fetched on demand.
let homeCache = { cityId: null, nowShowing: [], comingSoon: [], loaded: false };

async function loadHomeCatalog() {
  if (homeCache.loaded && homeCache.cityId === String(state.cityId)) return homeCache;
  const cityQ = state.cityId ? `?cityId=${state.cityId}` : "";
  const [nowShowing, comingSoon] = await Promise.all([
    api(`/catalog/movies/now-showing${cityQ}`),
    api(`/catalog/movies/coming-soon`),
  ]);
  homeCache = { cityId: String(state.cityId), nowShowing, comingSoon, loaded: true };
  return homeCache;
}

function readHomeFilters(query) {
  query = query || new URLSearchParams();
  return {
    q: (query.get("q") || "").trim(),
    genre: query.get("genre") || "",
    lang: query.get("lang") || "",
    cert: query.get("cert") || "",
    soon: query.get("soon") === "1",
  };
}

// Merge a partial filter change into the URL (no new history entry) and re-render.
function setHomeQuery(patch) {
  const onHome = (parseHash().head || "home") === "home" || parseHash().head === "";
  const base = onHome ? readHomeFilters(parseHash().query) : { q: "", genre: "", lang: "", cert: "", soon: false };
  const merged = { ...base, ...patch };
  const query = {
    q: merged.q,
    genre: merged.genre,
    lang: merged.lang,
    cert: merged.cert,
    soon: merged.soon ? "1" : "",
  };
  if (!onHome) {
    navigate("home", query);
    return;
  }
  replaceQuery(query);
  renderHome(null, parseHash().query);
}

async function renderHome(_param, query) {
  const f = readHomeFilters(query);
  setCrumbs([{ label: "Home" }]);
  skeletonHome();

  const { nowShowing, comingSoon } = await loadHomeCatalog();
  let searchResults = null;
  if (f.q) {
    try { searchResults = await api(`/catalog/movies/search?q=${encodeURIComponent(f.q)}`); }
    catch { searchResults = []; }
  }

  const universe = [...nowShowing, ...comingSoon, ...(searchResults || [])];
  const langs = distinct(universe.map((m) => m.language));
  const certs = distinct(universe.map((m) => m.certification));
  const genres = distinct(universe.map((m) => m.genre));

  const applyFilters = (list) => list.filter((m) =>
    (!f.genre || m.genre === f.genre) &&
    (!f.lang || m.language === f.lang) &&
    (!f.cert || m.certification === f.cert));

  const bar = homeFilterBar(f, { langs, certs, genres });

  if (f.q) {
    let results = applyFilters(searchResults || []);
    if (f.soon) results = results.filter((m) => m.status === "COMING_SOON");
    view().innerHTML = `
      <h1 class="section-title">Search results for “${esc(f.q)}”</h1>
      ${bar}
      <div class="results-meta">${results.length} result${results.length === 1 ? "" : "s"}</div>
      ${results.length ? movieGrid(results) : `<div class="empty">No movies match “${esc(f.q)}”.</div>`}`;
  } else if (f.soon) {
    const cs = applyFilters(comingSoon);
    view().innerHTML = `
      <h1 class="section-title">Coming Soon</h1>
      ${bar}
      ${cs.length ? movieGrid(cs, true) : `<div class="empty">No upcoming movies match these filters.</div>`}`;
  } else {
    const ns = applyFilters(nowShowing);
    const cs = applyFilters(comingSoon);
    view().innerHTML = `
      <h1 class="section-title">Now Showing</h1>
      ${bar}
      ${ns.length ? movieGrid(ns) : `<div class="empty">No movies showing in this city for these filters.</div>`}
      ${cs.length ? `<h1 class="section-title" style="margin-top:40px">Coming Soon</h1>${movieGrid(cs, true)}` : ""}`;
  }

  wireHomeFilters();
}

function homeFilterBar(f, opts) {
  const genreChips = ["", ...opts.genres.filter(Boolean)]
    .map((g) => genreChip(g, g ? prettyGenre(g) : "All", f.genre))
    .join("");
  const langOptions = optionList(opts.langs, f.lang, "All languages");
  const certOptions = optionList(opts.certs, f.cert, "All ratings");
  const hasActive = f.genre || f.lang || f.cert || f.soon || f.q;
  return `
    <div class="filters">
      ${genreChips}
      <select class="filter-select" data-filter="lang" aria-label="Filter by language">${langOptions}</select>
      <select class="filter-select" data-filter="cert" aria-label="Filter by certification">${certOptions}</select>
      <button type="button" class="chip toggle-chip ${f.soon ? "active" : ""}" data-filter="soon" aria-pressed="${f.soon}">
        ${f.soon ? "✓ " : ""}Coming soon
      </button>
      ${hasActive ? `<button type="button" class="filters-reset" data-filter="reset">Clear filters</button>` : ""}
    </div>`;
}

function optionList(values, selected, allLabel) {
  return [`<option value="">${esc(allLabel)}</option>`]
    .concat(values.filter(Boolean).map((v) =>
      `<option value="${esc(v)}" ${v === selected ? "selected" : ""}>${esc(v)}</option>`))
    .join("");
}

function wireHomeFilters() {
  $$(".filter-select[data-filter]").forEach((sel) => {
    sel.onchange = () => setHomeQuery({ [sel.dataset.filter]: sel.value });
  });
  const soonBtn = $(".toggle-chip[data-filter='soon']");
  if (soonBtn) soonBtn.onclick = () => setHomeQuery({ soon: soonBtn.getAttribute("aria-pressed") !== "true" });
  const reset = $(".filters-reset[data-filter='reset']");
  if (reset) reset.onclick = () => setHomeQuery({ q: "", genre: "", lang: "", cert: "", soon: false });
}

function distinct(arr) {
  return [...new Set(arr.filter((v) => v !== null && v !== undefined && v !== ""))].sort();
}

function genreChip(value, label, active) {
  const isActive = active === value;
  return `<button type="button" class="chip ${isActive ? "active" : ""}" data-genre="${esc(value)}" aria-pressed="${isActive}">${esc(label)}</button>`;
}

function movieGrid(movies, comingSoon = false) {
  return `<div class="movie-grid">${movies.map((m) => movieCard(m, comingSoon)).join("")}</div>`;
}

function movieCard(m, comingSoon) {
  const poster = m.posterUrl
    ? `<img src="${esc(m.posterUrl)}" alt="${esc(m.title)} poster" loading="lazy" onerror="this.remove()" />`
    : "🎞️";
  const badge = m.certification ? esc(m.certification) : (comingSoon || m.status === "COMING_SOON" ? "Soon" : "");
  return `
    <a class="movie-card" href="#/movie/${m.id}" aria-label="${esc(m.title)} — view details">
      <div class="poster">
        ${badge ? `<span class="badge">${badge}</span>` : ""}
        ${poster}
      </div>
      <div class="meta">
        <h3>${esc(m.title)}</h3>
        <p>${esc(m.language || "")}${m.language ? " · " : ""}${esc(prettyGenre(m.genre))}${m.runtime ? ` · ${m.runtime}m` : ""}</p>
      </div>
    </a>`;
}

function prettyGenre(g) {
  return ({ ACTION: "Action", COMEDY: "Comedy", ROM_COM: "Rom-Com", DRAMA: "Drama", THRILLER: "Thriller", HORROR: "Horror", SCI_FI: "Sci-Fi" }[g]) || g || "";
}

const dayKey = (d) => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
};

function dayLabel(key) {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const todayKey = dayKey(new Date());
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  let lead;
  if (key === todayKey) lead = "Today";
  else if (key === dayKey(tomorrow)) lead = "Tomorrow";
  else lead = dt.toLocaleDateString(undefined, { weekday: "short" });
  const sub = dt.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  return { lead, sub };
}

const fmtTime = (d) => new Date(d).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

async function renderMovie(id, query) {
  skeletonMovie();
  const [movie, shows] = await Promise.all([
    api(`/catalog/movies/${id}`),
    api(`/shows/movies/${id}`),
  ]);
  setCrumbs([{ label: "Home", route: "home" }, { label: movie.title }]);

  const cityName = (state.cities.find((c) => String(c.id) === String(state.cityId)) || {}).name;
  const future = shows
    .filter((s) => new Date(s.startTime).getTime() > Date.now() - 60 * 60 * 1000)
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  future.forEach(cacheShow);

  // Group future shows by local day, then theatre.
  const byDay = {};
  future.forEach((s) => { (byDay[dayKey(s.startTime)] = byDay[dayKey(s.startTime)] || []).push(s); });
  const days = Object.keys(byDay).sort();
  const requested = (query && query.get("date")) || "";
  const selectedDay = days.includes(requested) ? requested : days[0];

  const hero = `
    <div class="detail-hero">
      <div class="poster">${movie.posterUrl ? `<img src="${esc(movie.posterUrl)}" alt="${esc(movie.title)} poster" onerror="this.remove()" />` : "🎞️"}</div>
      <div class="info">
        <h1>${esc(movie.title)}</h1>
        <div class="tags">
          <span class="tag">${esc(prettyGenre(movie.genre))}</span>
          ${movie.language ? `<span class="tag">${esc(movie.language)}</span>` : ""}
          ${movie.runtime ? `<span class="tag">${movie.runtime} min</span>` : ""}
          ${movie.certification ? `<span class="tag">${esc(movie.certification)}</span>` : ""}
          <span class="tag">${esc(movie.status === "COMING_SOON" ? "Coming Soon" : "Now Showing")}</span>
        </div>
        <p class="synopsis">${esc(movie.synopsis || "")}</p>
        ${movie.cast && movie.cast.length ? `<p class="synopsis"><b>Cast:</b> ${esc(movie.cast.join(", "))}</p>` : ""}
      </div>
    </div>`;

  if (!future.length) {
    view().innerHTML = `${hero}
      <h2 class="section-title">Showtimes ${cityName ? `in ${esc(cityName)}` : ""}</h2>
      <div class="empty">No upcoming shows for this movie.</div>`;
    return;
  }

  view().innerHTML = `${hero}
    <h2 class="section-title">Showtimes ${cityName ? `in ${esc(cityName)}` : ""}</h2>
    <div class="day-tabs" role="tablist">
      ${days.map((k) => dayTab(k, k === selectedDay)).join("")}
      <label class="day-tab date-input-wrap" title="Pick a date">
        📅 <input type="date" id="datePicker" value="${selectedDay}" min="${days[0]}" max="${days[days.length - 1]}" aria-label="Pick a date" />
      </label>
    </div>
    <div id="showGroups">${theatreGroups(byDay[selectedDay] || [])}</div>`;

  $$(".day-tab[data-day]").forEach((tab) => {
    tab.onclick = () => selectMovieDay(id, tab.dataset.day);
  });
  const picker = $("#datePicker");
  if (picker) picker.onchange = () => {
    if (byDay[picker.value]) selectMovieDay(id, picker.value);
    else toast("No shows on that date", "info");
  };
}

function selectMovieDay(movieId, day) {
  replaceQuery({ date: day });
  renderMovie(movieId, parseHash().query);
}

function dayTab(key, active) {
  const { lead, sub } = dayLabel(key);
  return `<button class="day-tab ${active ? "active" : ""}" data-day="${key}" role="tab" aria-selected="${active}">${esc(lead)}<small>${esc(sub)}</small></button>`;
}

function theatreGroups(shows) {
  if (!shows.length) return `<div class="empty">No shows on this day.</div>`;
  const byTheatre = {};
  shows.forEach((s) => { (byTheatre[s.theatreId] = byTheatre[s.theatreId] || []).push(s); });
  return Object.values(byTheatre).map((group) => {
    const t = group[0];
    const times = group
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
      .map((s) => `<button class="showtime-btn" data-show="${s.id}" aria-label="Book ${esc(t.theatreName)} at ${esc(fmtTime(s.startTime))}">${esc(fmtTime(s.startTime))}<small>${esc(s.screenName)}</small></button>`)
      .join("");
    return `
      <div class="theatre-group">
        <h3>${esc(t.theatreName)}</h3>
        <div class="theatre-sub">${group.length} show${group.length === 1 ? "" : "s"}</div>
        <div class="showtime-list">${times}</div>
      </div>`;
  }).join("");
}

async function renderShow(id) {
  loading();
  const avail = await api(`/shows/${id}/availability`);
  state.availability = avail;
  state.selectedShow = id;
  state.selectedSeats = [];

  const meta = getCachedShow(id);
  const crumbs = [{ label: "Home", route: "home" }];
  if (meta && meta.movieTitle && meta.movieId) crumbs.push({ label: meta.movieTitle, route: `movie/${meta.movieId}` });
  crumbs.push({ label: "Seat selection" });
  setCrumbs(crumbs);

  drawSeatMap(avail, meta);
}

function drawSeatMap(avail, meta) {
  const seats = [...avail.seats].sort((a, b) => a.seatNumber.localeCompare(b.seatNumber, undefined, { numeric: true }));
  // Group by row letter.
  const rows = {};
  seats.forEach((s) => {
    const rowKey = (s.seatNumber.match(/^[A-Za-z]+/) || ["?"])[0];
    (rows[rowKey] = rows[rowKey] || []).push(s);
  });

  const rowHtml = Object.keys(rows)
    .sort()
    .map((rk) => {
      const cells = rows[rk]
        .map((s) => {
          const taken = s.seatStatus === "BOOKED" || s.seatStatus === "BLOCKED";
          const cls = s.seatStatus === "BOOKED" ? "booked" : s.seatStatus === "BLOCKED" ? "blocked" : "";
          const priceAttr = `data-price="${Number(s.price || 0)}"`;
          const label = taken
            ? `Seat ${s.seatNumber}, ${s.seatStatus.toLowerCase()}`
            : `Seat ${s.seatNumber}, ${inr(s.price)}, available`;
          const attrs = taken
            ? `disabled aria-disabled="true"`
            : `data-seat="${s.showSeatId}" ${priceAttr} aria-pressed="false"`;
          return `<button class="seat ${cls}" ${attrs} title="${esc(s.seatNumber)} · ${esc(inr(s.price))}" aria-label="${esc(label)}">${esc(s.seatNumber)}</button>`;
        })
        .join("");
      return `<div class="seat-row"><span class="row-label" aria-hidden="true">${esc(rk)}</span>${cells}</div>`;
    })
    .join("");

  const header = meta && meta.movieTitle ? esc(meta.movieTitle) : "Choose your seats";
  const sub = meta && (meta.theatreName || meta.startTime)
    ? [meta.theatreName ? esc(meta.theatreName) : null, meta.screenName ? esc(meta.screenName) : null, meta.startTime ? esc(fmtDateTime(meta.startTime)) : null]
        .filter(Boolean)
        .join(" · ")
    : `${avail.availableSeats} of ${avail.totalSeats} seats available`;

  view().innerHTML = `
    <h1 class="section-title">${header}</h1>
    <p class="section-sub">${sub}</p>
    <p class="section-sub" style="margin-top:-8px">${avail.availableSeats} of ${avail.totalSeats} seats available</p>
    <div class="screen-banner">Screen this way</div>
    <div class="seat-map-scroll">
      <div class="seat-map" role="group" aria-label="Seat map">${rowHtml || '<div class="empty">No seats configured for this show.</div>'}</div>
    </div>
    <div class="legend">
      <span><i class="swatch avail"></i> Available</span>
      <span><i class="swatch sel"></i> Selected</span>
      <span><i class="swatch booked"></i> Booked</span>
      <span><i class="swatch blocked"></i> Blocked</span>
    </div>
    <div class="summary-bar">
      <div>
        <div class="label"><span id="seatCount">0</span> seat(s) selected</div>
        <div class="total" id="seatTotal">${inr(0)}</div>
      </div>
      <button class="btn btn-primary" id="proceedBtn" disabled>Proceed</button>
    </div>
  `;

  $("#proceedBtn").onclick = onProceedBooking;
}

function recomputeSeatSummary() {
  const total = $$(".seat.selected")
    .reduce((sum, el) => sum + Number(el.dataset.price || 0), 0);
  $("#seatCount").textContent = String(state.selectedSeats.length);
  $("#seatTotal").textContent = inr(total);
  $("#proceedBtn").disabled = state.selectedSeats.length === 0;
}

function toggleSeat(showSeatId, btn) {
  const idx = state.selectedSeats.indexOf(showSeatId);
  if (idx >= 0) {
    state.selectedSeats.splice(idx, 1);
    btn.classList.remove("selected");
    btn.setAttribute("aria-pressed", "false");
  } else {
    state.selectedSeats.push(showSeatId);
    btn.classList.add("selected");
    btn.setAttribute("aria-pressed", "true");
  }
  recomputeSeatSummary();
}

async function onProceedBooking() {
  if (!state.selectedSeats.length) return;
  const ok = await requireLogin();
  if (!ok) return;

  const btn = $("#proceedBtn");
  btn.disabled = true;
  btn.textContent = "Booking…";

  const book = () => api("/bookings/book-show-seats", {
    method: "POST",
    auth: true,
    body: { showSeatIds: state.selectedSeats },
  });

  try {
    const booking = await book();
    toast("Seats held — complete payment", "success");
    navigate(`checkout/${booking.id}`);
  } catch (e) {
    // Session expired and could not be refreshed — prompt a fresh login, then retry once.
    if (e.authFailed && !isLoggedIn()) {
      toast("Your session expired — please log in again", "error");
      const reauthed = await requireLogin();
      if (reauthed) {
        try {
          const booking = await book();
          toast("Seats held — complete payment", "success");
          navigate(`checkout/${booking.id}`);
          return;
        } catch (e2) {
          toast(e2.message, "error");
        }
      }
    } else {
      toast(e.message, "error");
    }
    btn.disabled = false;
    btn.textContent = "Proceed";
  }
}

async function renderCheckout(bookingId) {
  if (!isLoggedIn()) { await requireLogin(); }
  loading();
  const [booking, providers] = await Promise.all([
    api(`/bookings/${bookingId}`, { auth: true }),
    api(`/payments/providers`, { auth: true }).catch(() => []),
  ]);
  setCrumbs([{ label: "Home", route: "home" }, { label: "Checkout" }]);

  if (booking.status === "CONFIRMED") {
    view().innerHTML = `
      <div class="panel" style="text-align:center">
        <h1 class="section-title">Booking confirmed 🎉</h1>
        <p class="section-sub">This booking is already paid for.</p>
        <button class="btn btn-primary" data-link="ticket/${booking.id}">View ticket</button>
      </div>`;
    return;
  }

  const seatLabels = (booking.seats || []).map((s) => s.seatNumber).join(", ");
  const provOptions = providers.length
    ? providers
    : [{ provider: "STRIPE", displayName: "Stripe", configured: true }, { provider: "RAZORPAY", displayName: "Razorpay", configured: true }];

  const expiresAt = booking.holdExpiresAt ? new Date(booking.holdExpiresAt).getTime() : null;
  const alreadyExpired = expiresAt && expiresAt <= Date.now();

  if (alreadyExpired) {
    view().innerHTML = `
      <div class="panel" style="text-align:center">
        <h1 class="section-title">Seat hold expired ⌛</h1>
        <p class="section-sub">Your 5-minute hold ran out. Please pick your seats again.</p>
        <button class="btn btn-primary" data-link="home">Back to movies</button>
      </div>`;
    return;
  }

  view().innerHTML = `
    <h1 class="section-title">Checkout</h1>
    ${expiresAt ? `<div class="hold-banner" role="status" aria-live="polite">
      <span class="hold-dot" aria-hidden="true"></span>
      Seats held — complete payment within <b id="holdTimer">--:--</b>
    </div>` : ""}
    <div class="panel">
      <div class="kv"><span class="k">Movie</span><span>${esc(booking.movieName || (booking.movie && booking.movie.title) || "—")}</span></div>
      <div class="kv"><span class="k">Theatre</span><span>${esc(booking.theatreName || "—")}</span></div>
      <div class="kv"><span class="k">Seats</span><span>${esc(seatLabels || "—")}</span></div>
      <div class="kv"><span class="k">Status</span><span class="pill ${booking.status}">${booking.status}</span></div>
      <div class="kv"><span class="k">Total</span><span><b>${inr(booking.totalAmount)}</b></span></div>
    </div>
    <div class="panel">
      <h3 style="margin-top:0">Select payment method</h3>
      <div class="provider-list" id="providerList">
        ${provOptions
          .map(
            (p) => `<div class="provider-card ${!p.configured ? "" : ""}" data-provider="${p.provider}">
              <div class="name">${esc(p.displayName || p.provider)}</div>
              <div class="status">${p.configured ? "Available" : "Not configured"}</div>
            </div>`
          )
          .join("")}
      </div>
      <button class="btn btn-primary btn-block" id="payBtn" disabled>Pay ${inr(booking.totalAmount)}</button>
    </div>
  `;

  let selectedProvider = null;
  $("#providerList").querySelectorAll(".provider-card").forEach((card) => {
    card.onclick = () => {
      $("#providerList").querySelectorAll(".provider-card").forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
      selectedProvider = card.dataset.provider;
      $("#payBtn").disabled = false;
    };
  });

  if (expiresAt) {
    startHoldCountdown(expiresAt, () => {
      toast("Seat hold expired — please select seats again", "error");
      navigate("home");
    });
  }

  $("#payBtn").onclick = async () => {
    if (!selectedProvider) return;
    const payBtn = $("#payBtn");
    payBtn.disabled = true;
    payBtn.textContent = "Processing…";
    try {
      const payment = await api("/payments/initiate", {
        method: "POST",
        auth: true,
        body: { bookingId: Number(bookingId), provider: selectedProvider },
      });
      // Mock mode: simulate gateway success via callback.
      await api("/payments/callback", {
        method: "POST",
        auth: true,
        body: { paymentId: payment.paymentId, success: true },
      });
      toast("Payment successful!", "success");
      navigate(`ticket/${bookingId}`);
    } catch (e) {
      toast(e.message, "error");
      payBtn.disabled = false;
      payBtn.textContent = `Pay ${inr(booking.totalAmount)}`;
    }
  };
}

async function renderTicket(bookingId) {
  if (!isLoggedIn()) { await requireLogin(); }
  loading();
  // Ensure ticket is issued, then fetch it (plus the booking for show time/seats).
  let ticket;
  try {
    ticket = await api(`/bookings/${bookingId}/ticket`, { auth: true });
  } catch {
    ticket = await api(`/bookings/${bookingId}/issue-ticket`, { method: "POST", auth: true });
  }
  const booking = await api(`/bookings/${bookingId}`, { auth: true }).catch(() => null);
  setCrumbs([{ label: "Home", route: "home" }, { label: "Ticket" }]);

  const seatLabels = booking && booking.seats ? booking.seats.map((s) => s.seatNumber).join(", ") : "";
  const startTime = booking && booking.show ? booking.show.startTime : null;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(ticket.qrPayload || ticket.bookingReference || bookingId)}`;
  view().innerHTML = `
    <div class="ticket" id="ticketCard">
      <h2 style="margin:0 0 6px">${esc(ticket.movieName || "Your ticket")}</h2>
      <div class="section-sub" style="margin:0">${esc(ticket.theatreName || "")}</div>
      <div class="qr"><img src="${qrSrc}" alt="Booking QR code" crossorigin="anonymous" /></div>
      <div class="ref">${esc(ticket.bookingReference || `BMS-${bookingId}`)}</div>
      <div class="kv" style="margin-top:18px"><span class="k">Status</span><span class="pill ${ticket.status}">${ticket.status}</span></div>
      ${startTime ? `<div class="kv"><span class="k">Showtime</span><span>${esc(fmtDateTime(startTime))}</span></div>` : ""}
      <div class="kv"><span class="k">Seats</span><span>${esc(seatLabels) || (ticket.seatCount ?? "—")}</span></div>
      <div class="kv"><span class="k">Issued</span><span>${ticket.issuedAt ? fmtDateTime(ticket.issuedAt) : "—"}</span></div>
    </div>
    <div class="ticket-actions">
      <button class="btn" id="printTicketBtn">🖨️ Print / Save PDF</button>
      <button class="btn" id="calendarBtn">📅 Add to calendar</button>
      <button class="btn" id="shareTicketBtn">🔗 Share</button>
      <button class="btn btn-ghost" data-link="bookings">My bookings</button>
    </div>
  `;

  $("#printTicketBtn").onclick = () => window.print();
  $("#calendarBtn").onclick = () => downloadIcs(ticket, booking, bookingId);
  $("#shareTicketBtn").onclick = () => shareTicket(ticket, bookingId);
}

// ---------------------------------------------------------------------------
// Ticket extras — calendar (.ics) export and share.
// ---------------------------------------------------------------------------
function icsDate(d) {
  // UTC basic format: YYYYMMDDTHHMMSSZ
  return new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function downloadIcs(ticket, booking, bookingId) {
  const start = booking && booking.show ? booking.show.startTime : null;
  if (!start) { toast("No showtime available for this booking", "info"); return; }
  const runtime = booking.movie && booking.movie.runtime ? booking.movie.runtime : 150;
  const end = new Date(new Date(start).getTime() + runtime * 60_000);
  const title = ticket.movieName || (booking.movie && booking.movie.title) || "Movie";
  const location = [ticket.theatreName, booking.show && booking.show.screenName].filter(Boolean).join(", ");
  const seats = booking.seats ? booking.seats.map((s) => s.seatNumber).join(", ") : "";
  const ref = ticket.bookingReference || `BMS-${bookingId}`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BookMyShow//Ticket//EN",
    "BEGIN:VEVENT",
    `UID:${ref}@bookmyshow`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsEscape("🎬 " + title)}`,
    `LOCATION:${icsEscape(location)}`,
    `DESCRIPTION:${icsEscape(`Booking ${ref}${seats ? " · Seats: " + seats : ""}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  downloadBlob(lines.join("\r\n"), `${ref}.ics`, "text/calendar");
  toast("Calendar event downloaded", "success");
}

function icsEscape(s) {
  return String(s || "").replace(/[\\;,]/g, (c) => "\\" + c).replace(/\n/g, "\\n");
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function shareTicket(ticket, bookingId) {
  const ref = ticket.bookingReference || `BMS-${bookingId}`;
  const url = `${location.origin}${location.pathname}#/ticket/${bookingId}`;
  const shareData = {
    title: "My BookMyShow ticket",
    text: `🎬 ${ticket.movieName || "Movie"} — booking ${ref}`,
    url,
  };
  try {
    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }
  } catch (e) {
    if (e && e.name === "AbortError") return; // user cancelled the share sheet
  }
  try {
    await navigator.clipboard.writeText(`${shareData.text}\n${url}`);
    toast("Ticket link copied to clipboard", "success");
  } catch {
    toast("Sharing isn't supported on this device", "info");
  }
}

// upcoming = future show (or no show) and not cancelled; past = show already
// started; cancelled = explicitly cancelled.
function classifyBooking(b) {
  if (b.status === "CANCELLED") return "cancelled";
  const start = b.show && b.show.startTime ? new Date(b.show.startTime).getTime() : null;
  if (start && start < Date.now()) return "past";
  return "upcoming";
}

const BOOKING_FILTERS = [
  { id: "all", label: "All" },
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
  { id: "cancelled", label: "Cancelled" },
];

function bookingFilterBar(active, route) {
  return `<div class="filters">${BOOKING_FILTERS
    .map((f) => `<button type="button" class="chip ${f.id === active ? "active" : ""}" data-bookfilter="${f.id}" data-bookroute="${route}" aria-pressed="${f.id === active}">${f.label}</button>`)
    .join("")}</div>`;
}

function bookingCard(b) {
  const seats = (b.seats || []).map((s) => s.seatNumber).join(", ");
  const start = b.show && b.show.startTime ? b.show.startTime : null;
  let actions = "";
  if (b.status === "PENDING") {
    actions = `<button class="btn btn-primary btn-sm" data-link="checkout/${b.id}">Complete payment</button>`;
  } else if (b.status === "CONFIRMED") {
    actions = `
      <button class="btn btn-sm" data-link="ticket/${b.id}">View ticket</button>
      <button class="btn btn-sm btn-ghost" data-cancel-refund="${b.id}">Cancel &amp; refund</button>`;
  }
  return `
    <div class="booking-card">
      <div class="row">
        <div>
          <h3>${esc(b.movieName || (b.movie && b.movie.title) || "Booking #" + b.id)}</h3>
          <div class="sub">${esc(b.theatreName || "")}${seats ? " · Seats: " + esc(seats) : ""}</div>
          ${start ? `<div class="sub">${esc(fmtDateTime(start))}</div>` : ""}
          <div class="sub">${inr(b.totalAmount)}</div>
        </div>
        <div style="text-align:right">
          <span class="pill ${b.status}">${b.status}</span>
        </div>
      </div>
      ${actions ? `<div class="card-actions">${actions}</div>` : ""}
    </div>`;
}

function renderBookingList(bookings, activeFilter, route) {
  const sorted = [...bookings].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const filtered = activeFilter === "all" ? sorted : sorted.filter((b) => classifyBooking(b) === activeFilter);
  if (!filtered.length) {
    return `${bookingFilterBar(activeFilter, route)}<div class="empty">No ${activeFilter === "all" ? "" : activeFilter + " "}bookings here yet.</div>`;
  }
  return `${bookingFilterBar(activeFilter, route)}${filtered.map(bookingCard).join("")}`;
}

async function renderMyBookings(_param, query) {
  if (!isLoggedIn()) { const ok = await requireLogin(); if (!ok) return; }
  loading();
  setCrumbs([{ label: "Home", route: "home" }, { label: "My Bookings" }]);
  const bookings = await api(`/users/me/bookings`, { auth: true });
  const activeFilter = (query && query.get("filter")) || "all";

  if (!bookings.length) {
    view().innerHTML = `<h1 class="section-title">My Bookings</h1><div class="empty">No bookings yet. Go book a movie! 🍿</div>`;
    return;
  }

  view().innerHTML = `
    <h1 class="section-title">My Bookings</h1>
    ${renderBookingList(bookings, activeFilter, "bookings")}`;
}

// ---------------------------------------------------------------------------
// Cancel & refund — preview the policy outcome, confirm, then process.
// ---------------------------------------------------------------------------
async function cancelAndRefund(bookingId) {
  let preview;
  try {
    preview = await api(`/bookings/${bookingId}/refund-preview`, { auth: true });
  } catch (e) {
    toast(e.message, "error");
    return;
  }

  if (!preview.eligible) {
    await confirmDialog({
      title: "Refund not available",
      body: `<p>${esc(preview.reason || "This booking can't be refunded.")}</p>`,
      confirmLabel: "OK",
      cancelLabel: "Close",
    });
    return;
  }

  const hours = preview.hoursUntilShow >= 0 ? `${preview.hoursUntilShow}h before showtime` : "no scheduled show";
  const body = `
    <p>Cancelling this booking will process a refund as per our policy.</p>
    <div class="refund-line"><span>Amount paid</span><span>${inr(preview.paidAmount)}</span></div>
    <div class="refund-line"><span>Refund policy</span><span>${preview.refundPercentage}% · ${esc(hours)}</span></div>
    ${preview.policyDescription ? `<div class="refund-line"><span>Policy</span><span>${esc(preview.policyDescription)}</span></div>` : ""}
    <div class="refund-line total"><span>You'll get back</span><span class="refund-amount">${inr(preview.refundAmount)}</span></div>
    ${preview.refundAmount <= 0 ? `<div class="refund-note">No refund is due for this cancellation, but the booking will still be cancelled.</div>` : ""}`;

  const ok = await confirmDialog({
    title: "Cancel & refund?",
    body,
    confirmLabel: "Cancel booking",
    cancelLabel: "Keep booking",
    danger: true,
  });
  if (!ok) return;

  try {
    const refund = await api(`/bookings/${bookingId}/refund`, {
      method: "POST",
      auth: true,
      body: { reason: "Cancelled by user" },
    });
    toast(refund.amount > 0 ? `Refund of ${inr(refund.amount)} initiated` : "Booking cancelled", "success");
    navigate(`refund/${refund.refundId}`);
  } catch (e) {
    toast(e.message, "error");
  }
}

async function renderRefund(refundId) {
  if (!isLoggedIn()) { await requireLogin(); }
  loading();
  setCrumbs([{ label: "Home", route: "home" }, { label: "My Bookings", route: "bookings" }, { label: "Refund" }]);
  const r = await api(`/refunds/${refundId}`, { auth: true });

  const statusCopy = {
    SUCCESS: "Your refund has been processed successfully.",
    PENDING: "Your refund is being processed.",
    SKIPPED: "No refund was due under the cancellation policy, but your booking is cancelled.",
    FAILED: "The refund could not be completed. Please contact support.",
  };

  view().innerHTML = `
    <h1 class="section-title">Refund status</h1>
    <div class="panel">
      <div class="kv"><span class="k">Refund</span><span>#${r.refundId}</span></div>
      <div class="kv"><span class="k">Booking</span><span>#${r.bookingId}</span></div>
      <div class="kv"><span class="k">Status</span><span class="pill ${r.status}">${r.status}</span></div>
      <div class="kv"><span class="k">Refund amount</span><span class="refund-amount">${inr(r.amount)}</span></div>
      <div class="kv"><span class="k">Refund policy</span><span>${r.refundPercentage}%</span></div>
      ${r.gatewayRefundId ? `<div class="kv"><span class="k">Gateway ref</span><span>${esc(r.gatewayRefundId)}</span></div>` : ""}
      <div class="kv"><span class="k">Booking status</span><span class="pill ${r.bookingStatus}">${r.bookingStatus}</span></div>
    </div>
    <div class="refund-note">${esc(statusCopy[r.status] || "")}</div>
    <div style="text-align:center;margin-top:22px">
      <button class="btn" data-link="bookings">Back to my bookings</button>
    </div>`;
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------
async function renderProfile(_param, query) {
  if (!isLoggedIn()) { const ok = await requireLogin(); if (!ok) return; }
  loading();
  setCrumbs([{ label: "Home", route: "home" }, { label: "Profile" }]);
  const [me, bookings] = await Promise.all([
    api(`/auth/me`, { auth: true }),
    api(`/users/me/bookings`, { auth: true }).catch(() => []),
  ]);
  const activeFilter = (query && query.get("filter")) || "all";
  const initial = (me.email || "?").charAt(0);

  view().innerHTML = `
    <div class="profile-hero">
      <div class="profile-avatar">${esc(initial)}</div>
      <div class="info">
        <h1>${esc(me.email ? me.email.split("@")[0] : "My profile")}</h1>
        <p>${esc(me.email || "")}</p>
        <span class="role-badge">${esc(me.role || "USER")} · ${bookings.length} booking${bookings.length === 1 ? "" : "s"}</span>
      </div>
      <div style="margin-left:auto;display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-sm btn-ghost" id="logoutEverywhereBtn">Log out everywhere</button>
      </div>
    </div>
    <h2 class="section-title">Booking history</h2>
    ${bookings.length ? renderBookingList(bookings, activeFilter, "profile") : `<div class="empty">No bookings yet. 🍿</div>`}`;

  $("#logoutEverywhereBtn").onclick = async () => {
    const ok = await confirmDialog({
      title: "Log out everywhere?",
      body: "<p>This will sign you out of this session on this device. You'll need to log in again.</p>",
      confirmLabel: "Log out",
      cancelLabel: "Stay signed in",
      danger: true,
    });
    if (!ok) return;
    clearSession();
    toast("Logged out of all sessions", "success");
    navigate("home");
  };
}

// ---------------------------------------------------------------------------
// Global event delegation
// ---------------------------------------------------------------------------
document.addEventListener("click", (e) => {
  const retryEl = e.target.closest("[data-retry]");
  if (retryEl) { router(); return; }

  const linkEl = e.target.closest("[data-link]");
  if (linkEl) { navigate(linkEl.dataset.link); return; }

  const navEl = e.target.closest("[data-nav]");
  if (navEl) { navigate(navEl.dataset.nav); return; }

  const movieEl = e.target.closest("[data-movie]");
  if (movieEl) { navigate(`movie/${movieEl.dataset.movie}`); return; }

  const showEl = e.target.closest("[data-show]");
  if (showEl) { navigate(`show/${showEl.dataset.show}`); return; }

  const seatEl = e.target.closest("[data-seat]");
  if (seatEl) { toggleSeat(Number(seatEl.dataset.seat), seatEl); return; }

  const genreEl = e.target.closest("[data-genre]");
  if (genreEl) {
    setHomeQuery({ genre: genreEl.dataset.genre });
    return;
  }

  const cancelRefundEl = e.target.closest("[data-cancel-refund]");
  if (cancelRefundEl) { cancelAndRefund(Number(cancelRefundEl.dataset.cancelRefund)); return; }

  const bookFilterEl = e.target.closest("[data-bookfilter]");
  if (bookFilterEl) {
    const route = bookFilterEl.dataset.bookroute || "bookings";
    replaceQuery({ filter: bookFilterEl.dataset.bookfilter });
    routes[route](null, parseHash().query);
    return;
  }
});

// Auth modal wiring
$("#authModalClose").onclick = closeAuth;
$("#authModal").addEventListener("click", (e) => { if (e.target.id === "authModal") closeAuth(); });
document.querySelectorAll(".tab").forEach((t) => (t.onclick = () => switchAuthTab(t.dataset.tab)));

// Confirm dialog wiring
$("#confirmOk").onclick = () => closeConfirm(true);
$("#confirmCancel").onclick = () => closeConfirm(false);
$("#confirmModal").addEventListener("click", (e) => { if (e.target.id === "confirmModal") closeConfirm(false); });

// Topbar search — debounced; updates ?q= on Home (or jumps to Home with the query).
let searchDebounce;
const searchInput = $("#searchInput");
const searchClear = $("#searchClear");
if (searchInput) {
  searchInput.addEventListener("input", () => {
    if (searchClear) searchClear.hidden = !searchInput.value;
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => setHomeQuery({ q: searchInput.value.trim() }), 280);
  });
}
if (searchClear) {
  searchClear.onclick = () => {
    searchInput.value = "";
    searchClear.hidden = true;
    setHomeQuery({ q: "" });
    searchInput.focus();
  };
}
const searchForm = $("#searchForm");
if (searchForm) searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  clearTimeout(searchDebounce);
  setHomeQuery({ q: searchInput.value.trim() });
});

// Show/hide password toggle.
document.addEventListener("click", (e) => {
  const toggle = e.target.closest("[data-pw-toggle]");
  if (!toggle) return;
  const input = toggle.parentElement.querySelector('input');
  if (!input) return;
  const show = input.type === "password";
  input.type = show ? "text" : "password";
  toggle.textContent = show ? "Hide" : "Show";
  toggle.setAttribute("aria-pressed", show ? "true" : "false");
  toggle.setAttribute("aria-label", show ? "Hide password" : "Show password");
});

// "Fill demo" — populate seed credentials on demand instead of prefilling.
$("#fillDemoBtn").onclick = () => {
  const form = $("#loginForm");
  form.querySelector('[name="email"]').value = "john.seed@example.com";
  form.querySelector('[name="password"]').value = "Password@123";
  clearFieldErrors(form);
  toast("Demo credentials filled");
};

// Keyboard: Esc closes the confirm dialog when it's open.
document.addEventListener("keydown", (e) => {
  const confirm = $("#confirmModal");
  if (!confirm.hidden && e.key === "Escape") { e.preventDefault(); closeConfirm(false); }
});

// Keyboard: Esc closes, Tab is trapped inside the modal.
document.addEventListener("keydown", (e) => {
  const modal = $("#authModal");
  if (modal.hidden) return;
  if (e.key === "Escape") { e.preventDefault(); closeAuth(); return; }
  if (e.key === "Tab") {
    const focusable = modal.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const visible = Array.from(focusable).filter((el) => el.offsetParent !== null);
    if (!visible.length) return;
    const first = visible[0];
    const last = visible[visible.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

// Clear a field's inline error as the user fixes it.
$("#authModal").addEventListener("input", (e) => {
  if (!e.target.matches("input")) return;
  e.target.classList.remove("invalid");
  const small = e.target.closest(".field")?.querySelector(".field-error");
  if (small) small.textContent = "";
});

function setSubmitting(form, on, label) {
  const btn = form.querySelector('button[type="submit"]');
  if (!btn) return;
  if (on) {
    btn.dataset.label = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = `<span class="btn-spinner" aria-hidden="true"></span> ${esc(label || "Please wait…")}`;
  } else {
    btn.disabled = false;
    btn.textContent = btn.dataset.label || label || "Submit";
  }
}

$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  $("#authError").textContent = "";
  if (!validateAuthForm(form, [
    { name: "email", label: "Email", type: "email" },
    { name: "password", label: "Password" },
  ])) return;

  const fd = new FormData(form);
  setSubmitting(form, true, "Logging in…");
  try {
    const token = await api("/auth/login", { method: "POST", body: { email: fd.get("email"), password: fd.get("password") } });
    setSession(token);
    const resolver = authResolver; authResolver = null;
    closeAuth();
    toast(`Welcome, ${token.email.split("@")[0]}!`, "success");
    if (resolver) resolver(true);
    else router();
  } catch (err) {
    $("#authError").textContent = err.message;
  } finally {
    setSubmitting(form, false, "Login");
  }
});

$("#signupForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  $("#authError").textContent = "";
  if (!validateAuthForm(form, [
    { name: "name", label: "Full name" },
    { name: "email", label: "Email", type: "email" },
    { name: "password", label: "Password", minLength: 8 },
  ])) return;

  const fd = new FormData(form);
  setSubmitting(form, true, "Creating account…");
  try {
    await api("/users/signup", { method: "POST", body: { name: fd.get("name"), email: fd.get("email"), password: fd.get("password") } });
    // Auto-login after signup.
    const token = await api("/auth/login", { method: "POST", body: { email: fd.get("email"), password: fd.get("password") } });
    setSession(token);
    const resolver = authResolver; authResolver = null;
    closeAuth();
    toast("Account created!", "success");
    if (resolver) resolver(true);
    else router();
  } catch (err) {
    $("#authError").textContent = err.message;
  } finally {
    setSubmitting(form, false, "Sign up");
  }
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
window.addEventListener("hashchange", router);

(async function init() {
  renderAuthArea();
  try {
    await loadCities();
  } catch (e) {
    toast("Could not load cities — is the backend running?", "error");
  }
  router();
})();
