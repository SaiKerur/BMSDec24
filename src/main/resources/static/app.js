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
// Tiny helpers
// ---------------------------------------------------------------------------
const $ = (sel) => document.querySelector(sel);
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

function loading() { view().innerHTML = `<div class="spinner"></div>`; }

function setCrumbs(items) {
  const bc = $("#breadcrumbs");
  bc.innerHTML = items
    .map((it, i) => {
      const sep = i > 0 ? `<span class="sep">/</span>` : "";
      return it.route
        ? `${sep}<a data-link="${esc(it.route)}">${esc(it.label)}</a>`
        : `${sep}<span>${esc(it.label)}</span>`;
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

async function router() {
  const { head, param } = parseHash();
  const handler = routes[head] || renderHome;
  try {
    await handler(param);
  } catch (e) {
    view().innerHTML = `<div class="empty">⚠️ ${esc(e.message)}</div>`;
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

function openAuth(tab = "login") {
  $("#authModal").hidden = false;
  switchAuthTab(tab);
  $("#authError").textContent = "";
}
function closeAuth() { $("#authModal").hidden = true; }

function switchAuthTab(tab) {
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === tab));
  $("#loginForm").hidden = tab !== "login";
  $("#signupForm").hidden = tab !== "signup";
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
  loading();
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
  return `<span class="chip ${active === value ? "active" : ""}" data-genre="${value}">${label}</span>`;
}

function movieGrid(movies, comingSoon = false) {
  return `<div class="movie-grid">${movies.map((m) => movieCard(m, comingSoon)).join("")}</div>`;
}

function movieCard(m, comingSoon) {
  const initials = esc(m.title);
  return `
    <div class="movie-card" data-movie="${m.id}">
      <div class="poster">
        <span class="badge">${m.certification ? esc(m.certification) : (comingSoon ? "Soon" : "")}</span>
        🎞️
      </div>
      <div class="meta">
        <h3>${initials}</h3>
        <p>${esc(m.language || "")} · ${esc(prettyGenre(m.genre))}${m.runtime ? ` · ${m.runtime}m` : ""}</p>
      </div>
    </div>`;
}

function prettyGenre(g) {
  return ({ ACTION: "Action", COMEDY: "Comedy", ROM_COM: "Rom-Com" }[g]) || g || "";
}

async function renderMovie(id) {
  loading();
  const [movie, shows] = await Promise.all([
    api(`/catalog/movies/${id}`),
    api(`/shows/movies/${id}`),
  ]);
  setCrumbs([{ label: "Home", route: "home" }, { label: movie.title }]);

  const cityName = (state.cities.find((c) => String(c.id) === String(state.cityId)) || {}).name;
  const future = shows
    .filter((s) => new Date(s.startTime).getTime() > Date.now() - 60 * 60 * 1000)
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

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

  // Fetch show meta for header (best-effort).
  let header = `Show #${id}`;
  try {
    // availability has no movie/theatre names; show row data isn't available here, so keep simple.
  } catch {}

  setCrumbs([{ label: "Home", route: "home" }, { label: "Seat selection" }]);
  drawSeatMap(avail, header);
}

function drawSeatMap(avail, header) {
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
          const cls = s.seatStatus === "BOOKED" ? "booked" : s.seatStatus === "BLOCKED" ? "blocked" : "";
          const disabled = cls ? "" : `data-seat="${s.showSeatId}"`;
          return `<button class="seat ${cls}" ${disabled} title="${esc(s.seatNumber)}">${esc(s.seatNumber)}</button>`;
        })
        .join("");
      return `<div class="seat-row">${cells}</div>`;
    })
    .join("");

  view().innerHTML = `
    <h1 class="section-title">Choose your seats</h1>
    <p class="section-sub">${avail.availableSeats} of ${avail.totalSeats} seats available</p>
    <div class="screen-banner">Screen this way</div>
    <div class="seat-map">${rowHtml || '<div class="empty">No seats configured for this show.</div>'}</div>
    <div class="legend">
      <span><i class="swatch avail"></i> Available</span>
      <span><i class="swatch sel"></i> Selected</span>
      <span><i class="swatch booked"></i> Booked</span>
      <span><i class="swatch blocked"></i> Blocked</span>
    </div>
    <div class="summary-bar">
      <div>
        <div class="label">Selected seats</div>
        <div class="total" id="seatCount">0</div>
      </div>
      <button class="btn btn-primary" id="proceedBtn" disabled>Proceed</button>
    </div>
  `;

  $("#proceedBtn").onclick = onProceedBooking;
}

function toggleSeat(showSeatId, btn) {
  const idx = state.selectedSeats.indexOf(showSeatId);
  if (idx >= 0) {
    state.selectedSeats.splice(idx, 1);
    btn.classList.remove("selected");
  } else {
    state.selectedSeats.push(showSeatId);
    btn.classList.add("selected");
  }
  $("#seatCount").textContent = String(state.selectedSeats.length);
  $("#proceedBtn").disabled = state.selectedSeats.length === 0;
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

  view().innerHTML = `
    <h1 class="section-title">Checkout</h1>
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
  const linkEl = e.target.closest("[data-link]");
  if (linkEl) { navigate(linkEl.dataset.link); return; }

  const navEl = e.target.closest("[data-nav]");
  if (navEl) { navigate(navEl.dataset.nav); return; }

  const crumb = e.target.closest("#breadcrumbs a[data-link]");
  if (crumb) { navigate(crumb.dataset.link); return; }

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

$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  $("#authError").textContent = "";
  try {
    const token = await api("/auth/login", { method: "POST", body: { email: fd.get("email"), password: fd.get("password") } });
    setSession(token);
    closeAuth();
    toast(`Welcome, ${token.email.split("@")[0]}!`, "success");
    if (authResolver) { authResolver(true); authResolver = null; }
    else router();
  } catch (err) {
    $("#authError").textContent = err.message;
  }
});

$("#signupForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  $("#authError").textContent = "";
  try {
    await api("/users/signup", { method: "POST", body: { name: fd.get("name"), email: fd.get("email"), password: fd.get("password") } });
    // Auto-login after signup.
    const token = await api("/auth/login", { method: "POST", body: { email: fd.get("email"), password: fd.get("password") } });
    setSession(token);
    closeAuth();
    toast("Account created!", "success");
    if (authResolver) { authResolver(true); authResolver = null; }
    else router();
  } catch (err) {
    $("#authError").textContent = err.message;
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
