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

let toastTimer;
function toast(msg, type = "") {
  const el = $("#toast");
  el.textContent = msg;
  el.className = `toast ${type}`;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 3200);
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
};

function navigate(route) { window.location.hash = `#/${route}`; }

function parseHash() {
  const raw = window.location.hash.replace(/^#\/?/, "");
  const [head, ...rest] = raw.split("/");
  return { head: head || "", param: rest.join("/") };
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
  const { head, param } = parseHash();
  const handler = routes[head] || renderHome;
  try {
    await handler(param);
  } catch (e) {
    if (e && e.authFailed) return; // login modal already prompted
    errorState(e && e.message);
  }
}

// ---------------------------------------------------------------------------
// Auth area + modal
// ---------------------------------------------------------------------------
function renderAuthArea() {
  const area = $("#authArea");
  if (isLoggedIn()) {
    area.innerHTML = `
      <span class="user-chip">Hi, <b>${esc(state.user.email.split("@")[0])}</b></span>
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
    if ((parseHash().head || "home") === "home" || parseHash().head === "") renderHome();
  };
}

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------
async function renderHome(filter) {
  setCrumbs([{ label: "Home" }]);
  skeletonHome();
  const genre = sessionStorage.getItem("bms_genre") || "";
  const cityQ = state.cityId ? `?cityId=${state.cityId}` : "";
  const [nowShowing, comingSoon] = await Promise.all([
    api(`/catalog/movies/now-showing${cityQ}`),
    api(`/catalog/movies/coming-soon`),
  ]);

  const filtered = genre ? nowShowing.filter((m) => m.genre === genre) : nowShowing;

  view().innerHTML = `
    <h1 class="section-title">Now Showing</h1>
    <div class="filters">
      ${genreChip("", "All", genre)}
      ${genreChip("ACTION", "Action", genre)}
      ${genreChip("COMEDY", "Comedy", genre)}
      ${genreChip("ROM_COM", "Rom-Com", genre)}
    </div>
    ${filtered.length ? movieGrid(filtered) : `<div class="empty">No movies showing in this city.</div>`}
    ${comingSoon.length ? `<h1 class="section-title" style="margin-top:40px">Coming Soon</h1>${movieGrid(comingSoon, true)}` : ""}
  `;
}

function genreChip(value, label, active) {
  const isActive = active === value;
  return `<button type="button" class="chip ${isActive ? "active" : ""}" data-genre="${value}" aria-pressed="${isActive}">${label}</button>`;
}

function movieGrid(movies, comingSoon = false) {
  return `<div class="movie-grid">${movies.map((m) => movieCard(m, comingSoon)).join("")}</div>`;
}

function movieCard(m, comingSoon) {
  const initials = esc(m.title);
  return `
    <a class="movie-card" href="#/movie/${m.id}" aria-label="${esc(m.title)} — view details">
      <div class="poster">
        <span class="badge">${m.certification ? esc(m.certification) : (comingSoon ? "Soon" : "")}</span>
        🎞️
      </div>
      <div class="meta">
        <h3>${initials}</h3>
        <p>${esc(m.language || "")} · ${esc(prettyGenre(m.genre))}${m.runtime ? ` · ${m.runtime}m` : ""}</p>
      </div>
    </a>`;
}

function prettyGenre(g) {
  return ({ ACTION: "Action", COMEDY: "Comedy", ROM_COM: "Rom-Com" }[g]) || g || "";
}

async function renderMovie(id) {
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

  view().innerHTML = `
    <div class="detail-hero">
      <div class="poster">🎞️</div>
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
    </div>
    <h2 class="section-title">Showtimes ${cityName ? `in ${esc(cityName)}` : ""}</h2>
    ${
      future.length
        ? `<div class="show-list">${future.map(showRow).join("")}</div>`
        : `<div class="empty">No upcoming shows for this movie.</div>`
    }
  `;
}

function showRow(s) {
  return `
    <div class="show-row">
      <div>
        <div class="when">${fmtDateTime(s.startTime)}</div>
        <div class="where">${esc(s.theatreName)} · ${esc(s.screenName)}</div>
      </div>
      <button class="btn btn-primary btn-sm" data-show="${s.id}">Select seats</button>
    </div>`;
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
  // Ensure ticket is issued, then fetch it.
  let ticket;
  try {
    ticket = await api(`/bookings/${bookingId}/ticket`, { auth: true });
  } catch {
    ticket = await api(`/bookings/${bookingId}/issue-ticket`, { method: "POST", auth: true });
  }
  setCrumbs([{ label: "Home", route: "home" }, { label: "Ticket" }]);

  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(ticket.qrPayload || ticket.bookingReference || bookingId)}`;
  view().innerHTML = `
    <div class="ticket">
      <h2 style="margin:0 0 6px">${esc(ticket.movieName || "Your ticket")}</h2>
      <div class="section-sub" style="margin:0">${esc(ticket.theatreName || "")}</div>
      <div class="qr"><img src="${qrSrc}" alt="QR" /></div>
      <div class="ref">${esc(ticket.bookingReference || `BMS-${bookingId}`)}</div>
      <div class="kv" style="margin-top:18px"><span class="k">Status</span><span class="pill ${ticket.status}">${ticket.status}</span></div>
      <div class="kv"><span class="k">Seats</span><span>${ticket.seatCount ?? "—"}</span></div>
      <div class="kv"><span class="k">Issued</span><span>${ticket.issuedAt ? fmtDateTime(ticket.issuedAt) : "—"}</span></div>
    </div>
    <div style="text-align:center;margin-top:22px">
      <button class="btn" data-link="bookings">View my bookings</button>
    </div>
  `;
}

async function renderMyBookings() {
  if (!isLoggedIn()) { const ok = await requireLogin(); if (!ok) return; }
  loading();
  setCrumbs([{ label: "Home", route: "home" }, { label: "My Bookings" }]);
  const bookings = await api(`/users/me/bookings`, { auth: true });

  if (!bookings.length) {
    view().innerHTML = `<h1 class="section-title">My Bookings</h1><div class="empty">No bookings yet. Go book a movie! 🍿</div>`;
    return;
  }

  view().innerHTML = `
    <h1 class="section-title">My Bookings</h1>
    ${bookings
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((b) => {
        const seats = (b.seats || []).map((s) => s.seatNumber).join(", ");
        const action =
          b.status === "PENDING"
            ? `<button class="btn btn-primary btn-sm" data-link="checkout/${b.id}">Complete payment</button>`
            : b.status === "CONFIRMED"
            ? `<button class="btn btn-sm" data-link="ticket/${b.id}">View ticket</button>`
            : "";
        return `
          <div class="booking-card">
            <div class="row">
              <div>
                <h3>${esc(b.movieName || (b.movie && b.movie.title) || "Booking #" + b.id)}</h3>
                <div class="sub">${esc(b.theatreName || "")}${seats ? " · Seats: " + esc(seats) : ""}</div>
                <div class="sub">${inr(b.totalAmount)}</div>
              </div>
              <div style="text-align:right">
                <span class="pill ${b.status}">${b.status}</span>
                <div style="margin-top:10px">${action}</div>
              </div>
            </div>
          </div>`;
      })
      .join("")}
  `;
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
    sessionStorage.setItem("bms_genre", genreEl.dataset.genre);
    renderHome();
    return;
  }
});

// Auth modal wiring
$("#authModalClose").onclick = closeAuth;
$("#authModal").addEventListener("click", (e) => { if (e.target.id === "authModal") closeAuth(); });
document.querySelectorAll(".tab").forEach((t) => (t.onclick = () => switchAuthTab(t.dataset.tab)));

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
