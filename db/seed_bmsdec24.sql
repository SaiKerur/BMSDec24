-- BMSDec24 full seed data (MySQL)
-- Populates all tables including join tables.
-- Run in MySQL Workbench against schema: BMSDec24

USE BMSDec24;

SET @OLD_SQL_SAFE_UPDATES = @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE payments;
TRUNCATE TABLE tickets_show_seats;
TRUNCATE TABLE tickets;
TRUNCATE TABLE show_seats;
TRUNCATE TABLE seat_type_shows;
TRUNCATE TABLE shows;
TRUNCATE TABLE screen_features;
TRUNCATE TABLE screen_seats;
TRUNCATE TABLE theatre_screens;
TRUNCATE TABLE city_theatres;
TRUNCATE TABLE movies;
TRUNCATE TABLE theatre;
TRUNCATE TABLE screen;
TRUNCATE TABLE seat;
TRUNCATE TABLE city;
TRUNCATE TABLE `user`;

SET FOREIGN_KEY_CHECKS = 1;

-- 1) Core masters
INSERT INTO city (id, created_at, updated_at, name) VALUES
  (1, NOW(), NOW(), 'Bengaluru'),
  (2, NOW(), NOW(), 'Mumbai');

INSERT INTO theatre (id, created_at, updated_at, address, name) VALUES
  (1, NOW(), NOW(), 'Dr Rajkumar Road, Rajajinagar, Bengaluru', 'Orion PVR'),
  (2, NOW(), NOW(), 'Lower Parel, Mumbai', 'PVR Phoenix');

INSERT INTO city_theatres (city_id, theatres_id) VALUES
  (1, 1),
  (2, 2);

INSERT INTO screen (id, created_at, updated_at, name) VALUES
  (1, NOW(), NOW(), 'Audi 1'),
  (2, NOW(), NOW(), 'Audi 2');

INSERT INTO theatre_screens (theatre_id, screens_id) VALUES
  (1, 1),
  (2, 2);

INSERT INTO seat (id, col_num, row_num, seat_type, created_at, updated_at, name) VALUES
  (1, 1, 1, 1, NOW(), NOW(), 'A1'),
  (2, 2, 1, 1, NOW(), NOW(), 'A2'),
  (3, 3, 1, 1, NOW(), NOW(), 'A3'),
  (4, 4, 1, 0, NOW(), NOW(), 'A4'),
  (5, 5, 1, 2, NOW(), NOW(), 'A5'),
  (6, 1, 1, 1, NOW(), NOW(), 'B1'),
  (7, 2, 1, 1, NOW(), NOW(), 'B2'),
  (8, 3, 1, 0, NOW(), NOW(), 'B3'),
  (9, 4, 1, 0, NOW(), NOW(), 'B4'),
  (10, 5, 1, 2, NOW(), NOW(), 'B5'),
  (11, 6, 1, 2, NOW(), NOW(), 'B6');

INSERT INTO screen_seats (screen_id, seats_id) VALUES
  (1, 1), (1, 2), (1, 3), (1, 4), (1, 5),
  (2, 6), (2, 7), (2, 8), (2, 9), (2, 10), (2, 11);

-- screen_features.features enum ordinal:
-- 0=TWO_D, 1=THREE_D, 2=FOUR_D, 3=IMAX, 4=DOLBY_VISION, 5=DOLBY_ATMOS
INSERT INTO screen_features (screen_id, features) VALUES
  (1, 0), (1, 4), (1, 5),
  (2, 1), (2, 2);

-- movies.genre enum ordinal: 0=COMEDY, 1=ACTION, 2=ROM_COM
INSERT INTO movies (id, genre, created_at, updated_at, name) VALUES
  (1, 1, NOW(), NOW(), 'Action Blast'),
  (2, 2, NOW(), NOW(), 'RomCom Nights');

INSERT INTO shows (id, movie_id, screen_id, created_at, start_time, updated_at) VALUES
  (1, 1, 1, NOW(), '2026-05-26 10:00:00', NOW()),
  (2, 1, 2, NOW(), '2026-05-26 14:00:00', NOW()),
  (3, 2, 1, NOW(), '2026-05-26 18:30:00', NOW());

-- seat_type enum ordinal: 0=GOLD, 1=SILVER, 2=PLATINUM
INSERT INTO seat_type_shows (id, price, seat_type, show_id, created_at, updated_at) VALUES
  (1, 180.0, 1, 1, NOW(), NOW()),
  (2, 250.0, 0, 1, NOW(), NOW()),
  (3, 330.0, 2, 1, NOW(), NOW()),
  (4, 220.0, 1, 2, NOW(), NOW()),
  (5, 300.0, 0, 2, NOW(), NOW()),
  (6, 380.0, 2, 2, NOW(), NOW()),
  (7, 200.0, 1, 3, NOW(), NOW()),
  (8, 260.0, 0, 3, NOW(), NOW()),
  (9, 340.0, 2, 3, NOW(), NOW());

INSERT INTO `user` (id, created_at, updated_at, email, name, password) VALUES
  (1, NOW(), NOW(), 'john.seed@example.com', 'John Seed', '$2a$10$4TUqA6m7WkQn3UE6q8xyeecxKMCC7W8e7jQCSNfO8L3v2h4WvW2iC'),
  (2, NOW(), NOW(), 'amy.seed@example.com', 'Amy Seed', '$2a$10$4TUqA6m7WkQn3UE6q8xyeecxKMCC7W8e7jQCSNfO8L3v2h4WvW2iC');

-- show_seats.seat_status enum ordinal: 0=AVAILABLE, 1=BLOCKED, 2=BOOKED
INSERT INTO show_seats (id, booked_by_id, seat_id, seat_status, show_id, created_at, updated_at) VALUES
  (1, NULL, 1, 0, 1, NOW(), NOW()),
  (2, NULL, 2, 0, 1, NOW(), NOW()),
  (3, 1,    3, 2, 1, NOW(), NOW()),
  (4, 1,    4, 2, 1, NOW(), NOW()),
  (5, 2,    5, 1, 1, NOW(), NOW()),
  (6, NULL, 6, 0, 2, NOW(), NOW()),
  (7, NULL, 7, 0, 2, NOW(), NOW()),
  (8, NULL, 8, 0, 2, NOW(), NOW()),
  (9, NULL, 9, 0, 2, NOW(), NOW()),
  (10, NULL, 10, 0, 2, NOW(), NOW()),
  (11, NULL, 11, 0, 2, NOW(), NOW()),
  (12, NULL, 1, 0, 3, NOW(), NOW()),
  (13, NULL, 2, 0, 3, NOW(), NOW()),
  (14, NULL, 3, 0, 3, NOW(), NOW()),
  (15, NULL, 4, 0, 3, NOW(), NOW()),
  (16, NULL, 5, 0, 3, NOW(), NOW());

-- tickets.status enum ordinal: 0=PENDING, 1=CONFIRMED, 2=CANCELLED
INSERT INTO tickets (id, movie_id, show_id, status, user_id, created_at, hold_expires_at, updated_at) VALUES
  (1, 1, 1, 1, 1, NOW(), NULL, NOW()),
  (2, 1, 1, 0, 2, NOW(), DATE_SUB(NOW(), INTERVAL 10 MINUTE), NOW()),
  (3, 2, 3, 2, 2, NOW(), NULL, NOW());

INSERT INTO tickets_show_seats (show_seats_id, tickets_id) VALUES
  (3, 1),
  (4, 1),
  (5, 2),
  (12, 3);

-- payments.provider enum ordinal: 0=STRIPE, 1=RAZORPAY
-- payments.status enum ordinal:   0=PENDING, 1=SUCCESS, 2=FAILED
-- Ticket 1 (CONFIRMED) was paid successfully via Stripe; ticket 3 (CANCELLED)
-- had a failed Razorpay attempt.
INSERT INTO payments (id, amount, currency, provider, status, gateway_order_id, gateway_payment_reference, failure_reason, ticket_id, created_at, updated_at) VALUES
  (1, 430.0, 'INR', 0, 1, 'pi_seed_stripe_0001', 'pay_seed_stripe_0001', NULL, 1, NOW(), NOW()),
  (2, 200.0, 'INR', 1, 2, 'order_seed_rzp_0001', NULL, 'Razorpay reported the payment as failed', 3, NOW(), NOW());

SELECT 'Seed complete' AS status;

SET SQL_SAFE_UPDATES = @OLD_SQL_SAFE_UPDATES;
