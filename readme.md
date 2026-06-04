# BMSDec24 — Book My Show API

Spring Boot 3.4 REST API for movie ticket booking with JWT authentication, seat holds, and pluggable payments (Stripe / Razorpay) using the **Strategy** and **Adapter** patterns.

## Features

- **Catalog discovery** — cities, theatres, movies, live seat layout (public read APIs)
- **User signup** with BCrypt password hashing
- **JWT auth** — login, refresh, and `/api/auth/me`
- **Booking lifecycle** — block seats (5-minute hold), confirm, cancel, cleanup expired holds
- **Payments** — choose Stripe or Razorpay per transaction; mock mode for local/Postman testing
- **Centralized API errors** — consistent `ApiErrorDto` responses

## Tech stack

| Layer | Technology |
|--------|------------|
| Runtime | Java 17 |
| Framework | Spring Boot 3.4, Spring Data JPA, Spring Security |
| Database | MySQL (default) or H2 in-memory (`h2` profile) |
| Auth | JWT (jjwt 0.12) |
| Payments | stripe-java, razorpay-java (mock adapters by default) |

## Prerequisites

- JDK 17+
- Maven 3.9+
- **MySQL** (default profile): database `BMSDec24`, user/password as in `application.properties`
- **Postman** (optional): import `postman/BMSDec24-API.postman_collection.json`

## Quick start

### Option A — H2 (no MySQL)

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=h2
```

- App: http://localhost:8087  
- H2 console: http://localhost:8087/h2-console (JDBC URL `jdbc:h2:mem:bms`)  
- Demo data is loaded automatically via `H2DataSeeder` (same shape as the MySQL seed for theatres 1–2).

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
mvn test
```

Tests use an in-memory H2 database (`src/test/resources/application.properties`).

## Configuration

| Property | Description |
|----------|-------------|
| `bms.security.jwt.secret` | Base64 secret (≥ 32 bytes decoded for HS256) |
| `bms.security.jwt.access-token-validity-minutes` | Access token TTL (default 15) |
| `bms.security.jwt.refresh-token-validity-days` | Refresh token TTL (default 7) |
| `bms.payment.mock-enabled` | `true` = mock Stripe/Razorpay (default) |
| `bms.payment.stripe.*` / `bms.payment.razorpay.*` | Live gateway keys |

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

## API reference

### Public

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/catalog/cities` | List cities |
| GET | `/api/catalog/cities/{cityId}/theatres` | Theatres in a city |
| GET | `/api/catalog/theatres/{theatreId}` | Theatre detail + movies |
| GET | `/api/catalog/movies` | List movies (`?genre=ACTION` optional) |
| GET | `/api/catalog/theatres/{theatreId}/seats` | Seat layout and status |
| POST | `/api/users/signup` | Register |
| POST | `/api/auth/login` | Obtain tokens |
| POST | `/api/auth/refresh` | Refresh access token |

### Authenticated (Bearer JWT)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/me` | Current user |
| GET | `/api/bookings/{bookingId}` | Booking details |
| POST | `/api/bookings/book` | Create booking (seat hold) |
| POST | `/api/bookings/{bookingId}/confirm` | Confirm booking |
| POST | `/api/bookings/{bookingId}/cancel` | Cancel booking |
| POST | `/api/bookings/cleanup-expired` | Release expired holds |
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

- **Theatre 1** (Orion PVR): movies 1–2; seats 1–2 AVAILABLE, 3–4 BOOKED, 5 BLOCKED  
- **Theatre 2** (PVR Phoenix): movies 1, 3; seats 6–9 AVAILABLE  
- **Users:** `john.seed@example.com` / `amy.seed@example.com`, password `Password@123`

## Postman

Import `postman/BMSDec24-API.postman_collection.json`. The collection has **129+ requests** organized into nested folders (Happy path / Edge cases per API area) covering validation, auth, seat conflicts, payment signatures, and JWT security.

Regenerate after editing `postman/build-collection.js`:

```bash
node postman/build-collection.js
```

## Project layout

```text
src/main/java/org/example/bmsdec24/
  controllers/api/   REST controllers (auth, catalog, bookings, payments, health)
  services/          Business logic
  repos/             Spring Data JPA
  models/            JPA entities
  payments/          Strategy + Adapter gateways
  security/          JWT filter and token service
  config/            Security, payment beans, H2 seeder
db/
  seed_bmsdec24.sql              MySQL demo data
  migration_add_denormalized_names.sql
postman/                         API collection + generator
docs/                            Class diagram and design notes
```

## Design patterns

- **Strategy** — `PaymentGateway` implementations (`StripePaymentGateway`, `RazorpayPaymentGateway`) selected via `PaymentGatewayFactory`
- **Adapter** — `StripeClientAdapter` / `RazorpayClientAdapter` wrap SDKs (or mocks)

## Documentation

- [docs/BookMyShow_Class_Diagram.md](docs/BookMyShow_Class_Diagram.md) — Mermaid class diagrams

## License

Educational / demo project.
