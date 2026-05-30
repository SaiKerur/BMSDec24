-- BMSDec24 simple seed data (MySQL)
-- Model: City -> Theatre -> Seat; Movies run in Theatres; User books seats -> Payment confirms/cancels booking.
-- Enums stored as readable text (AVAILABLE, PENDING, STRIPE, etc.).
-- Run in MySQL Workbench against schema: BMSDec24

USE BMSDec24;

SET @OLD_SQL_SAFE_UPDATES = @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS booking_seats;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS tickets_show_seats;
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS show_seats;
DROP TABLE IF EXISTS seat_type_shows;
DROP TABLE IF EXISTS shows;
DROP TABLE IF EXISTS screen_features;
DROP TABLE IF EXISTS screen_seats;
DROP TABLE IF EXISTS theatre_screens;
DROP TABLE IF EXISTS city_theatres;
DROP TABLE IF EXISTS screen;
DROP TABLE IF EXISTS seat;
DROP TABLE IF EXISTS theatre;
DROP TABLE IF EXISTS city;

TRUNCATE TABLE theatre_movies;
TRUNCATE TABLE seats;
TRUNCATE TABLE theatres;
TRUNCATE TABLE movies;
TRUNCATE TABLE cities;
TRUNCATE TABLE `user`;

SET FOREIGN_KEY_CHECKS = 1;

-- Cities
INSERT INTO cities (id, name, created_at, updated_at) VALUES
  (1, 'Bengaluru', NOW(), NOW()),
  (2, 'Mumbai', NOW(), NOW());

-- Movies
INSERT INTO movies (id, title, genre, created_at, updated_at) VALUES
  (1, 'Action Blast', 'ACTION', NOW(), NOW()),
  (2, 'RomCom Nights', 'ROM_COM', NOW(), NOW()),
  (3, 'Laugh Out Loud', 'COMEDY', NOW(), NOW());

-- Theatres
INSERT INTO theatres (id, name, address, city_id, created_at, updated_at) VALUES
  (1, 'Orion PVR', 'Dr Rajkumar Road, Rajajinagar, Bengaluru', 1, NOW(), NOW()),
  (2, 'PVR Phoenix', 'Lower Parel, Mumbai', 2, NOW(), NOW());

-- Movies running in theatres
INSERT INTO theatre_movies (theatre_id, movie_id) VALUES
  (1, 1),
  (1, 2),
  (2, 1),
  (2, 3);

-- Seats (seat_status: AVAILABLE | BLOCKED | BOOKED)
INSERT INTO seats (id, seat_number, seat_type, price, seat_status, theatre_id, booked_by_user_id, created_at, updated_at) VALUES
  (1, 'A1', 'GOLD',     250.0, 'AVAILABLE', 1, NULL, NOW(), NOW()),
  (2, 'A2', 'GOLD',     250.0, 'AVAILABLE', 1, NULL, NOW(), NOW()),
  (3, 'B1', 'SILVER',   180.0, 'BOOKED',    1, 1,    NOW(), NOW()),
  (4, 'B2', 'SILVER',   180.0, 'BOOKED',    1, 1,    NOW(), NOW()),
  (5, 'C1', 'PLATINUM', 330.0, 'BLOCKED',   1, 2,    NOW(), NOW()),
  (6, 'A1', 'GOLD',     300.0, 'AVAILABLE', 2, NULL, NOW(), NOW()),
  (7, 'A2', 'GOLD',     300.0, 'AVAILABLE', 2, NULL, NOW(), NOW()),
  (8, 'B1', 'SILVER',   220.0, 'AVAILABLE', 2, NULL, NOW(), NOW()),
  (9, 'C1', 'PLATINUM', 380.0, 'AVAILABLE', 2, NULL, NOW(), NOW());

-- Users (password = BCrypt of 'Password@123')
INSERT INTO `user` (id, name, email, password, created_at, updated_at) VALUES
  (1, 'John Seed', 'john.seed@example.com', '$2a$10$4TUqA6m7WkQn3UE6q8xyeecxKMCC7W8e7jQCSNfO8L3v2h4WvW2iC', NOW(), NOW()),
  (2, 'Amy Seed',  'amy.seed@example.com',  '$2a$10$4TUqA6m7WkQn3UE6q8xyeecxKMCC7W8e7jQCSNfO8L3v2h4WvW2iC', NOW(), NOW());

-- Sample confirmed booking (John, Action Blast at Orion PVR, seats B1+B2)
INSERT INTO bookings (id, user_id, movie_id, theatre_id, status, total_amount, hold_expires_at, created_at, updated_at) VALUES
  (1, 1, 1, 1, 'CONFIRMED', 360.0, NULL, NOW(), NOW()),
  (2, 2, 1, 1, 'PENDING',   330.0, DATE_ADD(NOW(), INTERVAL 5 MINUTE), NOW(), NOW());

INSERT INTO booking_seats (booking_id, seat_id) VALUES
  (1, 3),
  (1, 4),
  (2, 5);

-- Sample payment for confirmed booking
INSERT INTO payments (id, amount, currency, provider, status, gateway_order_id, gateway_payment_reference, failure_reason, booking_id, created_at, updated_at) VALUES
  (1, 360.0, 'INR', 'STRIPE', 'SUCCESS', 'pi_seed_stripe_0001', 'pay_seed_stripe_0001', NULL, 1, NOW(), NOW());

SELECT 'Seed complete' AS status;

SET SQL_SAFE_UPDATES = @OLD_SQL_SAFE_UPDATES;
