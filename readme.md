# BMSDec24 — Book My Show API

Spring Boot 3.4 REST API for movie ticket booking with JWT authentication, seat holds, and pluggable payments (Stripe / Razorpay) using the **Strategy** and **Adapter** patterns.

## Features

- **Catalog discovery** — cities, theatres, movies, search, live seat layout (public read APIs)
- **User signup** with BCrypt password hashing
- **JWT auth** — login, refresh, and `/api/auth/me`
- **Booking lifecycle** — block seats (5-minute hold), confirm, cancel, cleanup expired holds
- **Cancellation & refunds** — policy-based refunds with a no-mutation **refund preview** endpoint
- **Payments** — choose Stripe or Razorpay per transaction; mock mode for local/Postman testing
- **Centralized API errors** — consistent `ApiErrorDto` responses
- **Web UI (SPA)** — React + Vite app built into `static/` with real-time seats, gateway checkout, PWA offline tickets, i18n, and theming — see [Frontend (web UI)](#frontend-web-ui)

## Tech stack

| Layer | Technology |
|--------|------------|
| Runtime | Java 17 |
| Framework | Spring Boot 3.4, Spring Data JPA, Spring Security |
| Frontend | React 19, Vite 6, React Router, i18next, Stripe Elements, Razorpay Checkout |
| Database | MySQL (default) or H2 in-memory (`h2` profile) |
| Auth | JWT (jjwt 0.12) |
| Payments | stripe-java, razorpay-java (mock adapters by default) |
| Testing | JUnit/MockMvc (backend), Vitest + Playwright (frontend) |
| CI | GitHub Actions (`.github/workflows/ci.yml`) |

## Prerequisites

- JDK 17+
- Maven 3.9+
- **Node.js 20+** (optional for frontend dev; Maven downloads Node automatically during `mvn package`)
- **MySQL** (default profile): database `BMSDec24`, user/password as in `application.properties`
- **Postman** (optional): import `postman/BMSDec24-API.postman_collection.json`

## Quick start

### Option A — H2 (no MySQL)

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=h2
```

The Maven build runs `npm install && npm run build` in `frontend/` and copies the production bundle to `src/main/resources/static/` (code-split chunks under `/assets/`).

- App: http://localhost:8087  
- H2 console: http://localhost:8087/h2-console (JDBC URL `jdbc:h2:mem:bms`)  
- Demo data is loaded automatically via `H2DataSeeder` (same shape as the MySQL seed for theatres 1–2). Each theatre has a **5-row seat layout** (rows A–E, 8 seats per row) with mixed seat types — row A/D `GOLD`, B/E `SILVER`, C `PLATINUM` — so every show renders a full seat map.

### Option B — MySQL

1. Create database `BMSDec24` in MySQL.
2. Start the app once so Hibernate creates tables:

   ```bash
   mvn spring-boot:run
   ```

3. Load sample data:

   ```bash
   mysql -u root -p BMSDec24 < db/seed_bmsdec24.sql
   ```

4. API base URL: http://localhost:8080

### Tests

```bash
# Backend (H2)
mvn test

# Frontend unit tests (from frontend/)
cd frontend && npm install && npm test

# E2E booking flow (starts Spring Boot on :8087 in CI)
cd frontend && npm run test:e2e
```

GitHub Actions runs all of the above on push/PR (see `.github/workflows/ci.yml`).

Tests use an in-memory H2 database (`src/test/resources/application.properties`).

## Configuration

| Property | Description |
|----------|-------------|
| `bms.security.jwt.secret` | Base64 secret (≥ 32 bytes decoded for HS256) |
| `bms.security.jwt.access-token-validity-minutes` | Access token TTL (default 15) |
| `bms.security.jwt.refresh-token-validity-days` | Refresh token TTL (default 7) |
| `bms.payment.mock-enabled` | `true` = mock Stripe/Razorpay (default) |
| `bms.payment.stripe.*` / `bms.payment.razorpay.*` | Live gateway keys |
| `VITE_SENTRY_DSN` (frontend `.env`) | Optional Sentry DSN for client error tracking |

For real payment keys without committing secrets:

1. Copy `src/main/resources/application-local.properties.example` → `application-local.properties`
2. Set `bms.payment.mock-enabled=false` and paste test keys from Stripe/Razorpay dashboards.

## End-to-end flow

```text
Signup → Login (JWT) → Browse catalog → Book seats (PENDING hold)
  → Initiate payment (STRIPE | RAZORPAY) → Payment callback → Booking CONFIRMED
```

1. **Signup** — `POST /api/users/signup`
2. **Login** — `POST /api/auth/login` → use `accessToken` as `Authorization: Bearer …`
3. **Discovery** — catalog APIs (no auth required)
4. **Book** — `POST /api/bookings/book` with `userId`, `movieId`, `seatIds`
5. **Pay** — `POST /api/payments/initiate` then `POST /api/payments/callback`
6. **Confirm booking** (if not auto-confirmed via payment) — `POST /api/bookings/{id}/confirm`

## Frontend (web UI)

Source lives in `frontend/` (React + Vite + TypeScript). Production assets are emitted to `src/main/resources/static/` and served by Spring Boot at the app root (e.g. http://localhost:8087 with the `h2` profile).

**Dev server** (proxies `/api` to Spring Boot):

```bash
# Terminal 1 — backend
mvn spring-boot:run -Dspring-boot.run.profiles=h2

# Terminal 2 — hot reload
cd frontend && npm install && npm run dev
```

Flow: **Home (search / filters / Now Showing / Coming Soon)** → **Movie detail (date tabs + theatre groups)** → **Live seat map (SSE)** → **Checkout (Stripe Elements / Razorpay Checkout)** → **Ticket (QR, print, share, offline cache)** → **My Bookings / Profile**.

### v3 features (platform, scale & production-readiness)

- **React + Vite** — componentized SPA with code-split vendor/i18n/stripe chunks, hash routing (`#/home`, `#/show/1`, …), and Vitest unit tests.
- **Real payment UI** — checkout uses **Stripe Elements** (with 3DS redirect via `confirmPayment`) or **Razorpay Checkout SDK**; mock mode shows dev card panels that call `/api/payments/callback` with valid mock signatures.
- **Live seat availability (SSE)** — `GET /api/shows/{showId}/availability/stream` pushes snapshots when seats are held/booked/released; the seat page subscribes via `EventSource` and deselects seats that become unavailable.
- **PWA + offline** — service worker (Workbox) precaches the app shell; confirmed tickets and QR images are cached for offline access (`localStorage` + runtime cache).
- **i18n & currency** — English/Hindi via `react-i18next`; locale-aware `formatMoney` / `formatDateTime` with INR/USD selector (replaces hardcoded `₹`).
- **Design system + theming** — documented tokens in [docs/DESIGN_TOKENS.md](docs/DESIGN_TOKENS.md); light/dark toggle persists in `localStorage`.
- **Observability & resilience** — optional **Sentry** (`VITE_SENTRY_DSN`); API client retry/backoff on 429/5xx; centralized `setAuthRequiredHandler` + `apiWithAuthRetry` replaces per-action re-auth in booking/checkout.
- **CI** — GitHub Actions runs `mvn test`, Vitest, and Playwright E2E against the H2 profile.

### v2 features

- **Search + richer filtering** — a topbar search box (debounced, backed by `GET /api/catalog/movies/search`) plus language and certification dropdowns, genre chips, and a **Coming soon** toggle. All filters are URL-encoded (e.g. `#/home?q=action&genre=ACTION&lang=Hindi&cert=UA&soon=1`) so any filtered view is shareable and restored on reload.
- **Cancellation & refunds** — confirmed bookings show a **Cancel & refund** action that first calls `GET /api/bookings/{id}/refund-preview` to show the policy %, paid amount, and exact refund amount in a confirmation dialog, then processes the refund via `POST /api/bookings/{id}/refund` and lands on a refund-status view (`#/refund/{refundId}` → `GET /api/refunds/{id}`).
- **Ticket improvements** — the ticket page adds **Print / Save PDF** (print stylesheet), **Add to calendar** (downloads an `.ics` event built from the show time + runtime), and **Share** (Web Share API with clipboard fallback).
- **User profile** — `#/profile` uses `GET /api/auth/me` to show the account, role, and full booking history with **Upcoming / Past / Cancelled** filters, plus a **Log out everywhere** action.
- **Showtime grouping** — movie detail groups shows into **day tabs** (Today / Tomorrow / weekday) with a native date picker, and within each day groups showtimes **by theatre**; the selected day is deep-linked (`#/movie/{id}?date=YYYY-MM-DD`).
- **Stackable notifications + confirm dialogs** — toasts now stack and auto-dismiss (each manually dismissible), and destructive actions (cancel booking, log out everywhere) go through an accessible confirmation dialog.
- **Persisted city + deep links** — the selected city persists in `localStorage`, and filter/date state lives in the URL so links restore the same view.

### Polish (v1)

- **Seat-hold countdown** — checkout shows a live `mm:ss` timer driven by the booking's `holdExpiresAt`; on expiry it notifies and redirects home (the 5-minute PENDING hold).
- **Real seat-page header** — the seat map shows the movie title, theatre, screen, and showtime (carried over from the movie page via cached show meta, persisted in `sessionStorage`).
- **Per-seat price + live total** — each available seat renders its price and the sticky summary bar keeps a running total as seats are selected.
- **Skeleton loaders** — card/grid and detail skeletons replace the bare spinner on the home and movie pages.
- **Friendly error state** — failed loads render a retryable error panel (offline-aware) instead of a raw message.
- **Auth modal UX** — show/hide password toggle, inline field validation, a submit spinner, and a **Fill demo credentials** button (no prefilled inputs).
- **Accessibility** — seat buttons expose `aria-pressed`/`aria-label`, the auth and confirm dialogs trap focus and close on `Esc`, and navigation uses real `<a>`/`<button>` elements.
- **Mobile seat map** — rows stay aligned inside a horizontal-scroll container instead of wrapping.

> **Note:** to power per-seat pricing, `GET /api/shows/{showId}/availability` returns `price` and `seatType` on each entry in `seats[]` (in addition to `showSeatId`, `seatId`, `seatNumber`, `seatStatus`, `updatedAtEpochMs`).

## API reference

### Public

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/catalog/cities` | List cities |
| GET | `/api/catalog/cities/{cityId}/theatres` | Theatres in a city |
| GET | `/api/catalog/theatres/{theatreId}` | Theatre detail + movies |
| GET | `/api/catalog/movies` | List movies (`?genre=ACTION` optional) |
| GET | `/api/catalog/movies/search` | Search movies by title/cast (`?q=`) |
| GET | `/api/catalog/movies/now-showing` | Now-showing movies (`?cityId=` optional) |
| GET | `/api/catalog/movies/coming-soon` | Coming-soon movies |
| GET | `/api/catalog/movies/{movieId}` | Movie detail (poster, cast, certification, …) |
| GET | `/api/catalog/theatres/{theatreId}/seats` | Seat layout and status |
| GET | `/api/shows/movies/{movieId}` | Showtimes for a movie |
| GET | `/api/shows/theatres/{theatreId}` | Showtimes at a theatre |
| GET | `/api/shows/{showId}/availability` | Live seat map (`price`, `seatType`, `seatStatus`); `?changedAfterEpochMs=` for delta polls |
| GET | `/api/shows/{showId}/availability/stream` | **SSE** live seat map push (`text/event-stream`; event name `availability`) |
| POST | `/api/users/signup` | Register |
| POST | `/api/auth/login` | Obtain tokens |
| POST | `/api/auth/refresh` | Refresh access token |

### Authenticated (Bearer JWT)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/me` | Current user |
| GET | `/api/users/me/bookings` | My bookings (`?status=` optional) |
| GET | `/api/bookings/{bookingId}` | Booking details |
| POST | `/api/bookings/book` | Create booking (seat hold) |
| POST | `/api/bookings/book-show-seats` | Create booking from showtime seats |
| POST | `/api/bookings/{bookingId}/confirm` | Confirm booking |
| POST | `/api/bookings/{bookingId}/cancel` | Cancel booking |
| GET | `/api/bookings/{bookingId}/refund-preview` | Preview refund policy/amount (no mutation) |
| POST | `/api/bookings/{bookingId}/refund` | Process policy-based refund and cancel |
| GET | `/api/refunds/{refundId}` | Refund details |
| GET | `/api/bookings/{bookingId}/ticket` | Fetch issued ticket |
| POST | `/api/bookings/{bookingId}/issue-ticket` | Issue ticket for confirmed booking |
| POST | `/api/bookings/cleanup-expired` | Release expired holds (ADMIN/PARTNER) |
| GET | `/api/payments/providers` | Available gateways |
| POST | `/api/payments/initiate` | Start payment |
| POST | `/api/payments/callback` | Complete / fail payment |
| GET | `/api/payments/{paymentId}` | Payment status |

## Mock payment callbacks (Postman / local)

When `bms.payment.mock-enabled=true` (default):

| Provider | Success `signature` prefix |
|----------|----------------------------|
| Stripe | `whsec_` (e.g. `whsec_postman_mock`) |
| Razorpay | `rzp_sig_` (e.g. `rzp_sig_postman_mock`) |

Any other non-empty signature is treated as invalid.

## Seed data (MySQL)

After `db/seed_bmsdec24.sql`:

- **All 12 theatres** have a full 5-row layout (rows A–E × 8 seats = 40 seats each, 480 seats total), and **all 15 shows** expose the complete seat map.  
- **Seat types per row:** A/D `GOLD`, B/E `SILVER`, C `PLATINUM`.  
- **Theatre 1** (Orion PVR): pinned seats 1–2 AVAILABLE, 3–4 BOOKED, 5 BLOCKED; remaining rows as seat ids 30–64.  
- **Theatre 2** (PVR Phoenix): pinned seats 6–9 AVAILABLE; remaining rows as seat ids 65–100.  
- **Theatres 3–12:** seats `A1,A2` keep ids 10–29; remaining rows are seat ids 101–480.  
- **Users:** `john.seed@example.com` / `amy.seed@example.com`, password `Password@123`

## Postman

Import `postman/BMSDec24-API.postman_collection.json`. The collection has **240+ requests** organized into nested folders (Happy path / Edge cases per API area) covering validation, auth, seat conflicts, payment signatures, refund policy + preview, and JWT security.

Regenerate after editing `postman/build-collection.js`:

```bash
node postman/build-collection.js
```

## Project layout

```text
src/main/java/org/example/bmsdec24/
  controllers/api/   REST controllers (auth, catalog, bookings, payments, health, SSE)
  services/          Business logic (+ ShowAvailabilityBroadcaster)
  repos/             Spring Data JPA
  models/            JPA entities
  payments/          Strategy + Adapter gateways
  security/          JWT filter and token service
  config/            Security, payment beans, H2 seeder
frontend/              React + Vite source (build → static/)
src/main/resources/static/   Built SPA assets (index.html, assets/, sw.js)
db/
  seed_bmsdec24.sql              MySQL demo data
  migration_add_denormalized_names.sql
postman/                         API collection + generator
.github/workflows/               CI (Maven + Vitest + Playwright)
docs/                            Class diagram, design tokens
```

## Design patterns

- **Strategy** — `PaymentGateway` implementations (`StripePaymentGateway`, `RazorpayPaymentGateway`) selected via `PaymentGatewayFactory`
- **Adapter** — `StripeClientAdapter` / `RazorpayClientAdapter` wrap SDKs (or mocks)

## Documentation

- [docs/BookMyShow_Class_Diagram.md](docs/BookMyShow_Class_Diagram.md) — Mermaid class diagrams
- [docs/DESIGN_TOKENS.md](docs/DESIGN_TOKENS.md) — CSS design tokens (light/dark)

## License

Educational / demo project.
