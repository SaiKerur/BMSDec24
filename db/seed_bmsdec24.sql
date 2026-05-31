-- BMSDec24 simple seed data (MySQL)
-- Model: City -> Theatre -> Seat; Movies run in Theatres; User books seats -> Payment confirms/cancels booking.
-- Enums stored as readable text (AVAILABLE, PENDING, STRIPE, etc.).
-- Run in MySQL Workbench against schema: BMSDec24

USE BMSDec24;

SET @OLD_SQL_SAFE_UPDATES = @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE payments;
TRUNCATE TABLE booking_seats;
TRUNCATE TABLE bookings;
TRUNCATE TABLE theatre_movies;
TRUNCATE TABLE seats;
TRUNCATE TABLE theatres;
TRUNCATE TABLE movies;
TRUNCATE TABLE cities;
TRUNCATE TABLE `user`;

SET FOREIGN_KEY_CHECKS = 1;

-- Cities (7 total: 2 original + 5 new)
INSERT INTO cities (id, name, created_at, updated_at) VALUES
  (1, 'Bengaluru', NOW(), NOW()),
  (2, 'Mumbai', NOW(), NOW()),
  (3, 'Delhi', NOW(), NOW()),
  (4, 'Hyderabad', NOW(), NOW()),
  (5, 'Chennai', NOW(), NOW()),
  (6, 'Kolkata', NOW(), NOW()),
  (7, 'Pune', NOW(), NOW());

-- Movies (23 total: 3 original + 20 new)
INSERT INTO movies (id, title, genre, created_at, updated_at) VALUES
  (1, 'Action Blast', 'ACTION', NOW(), NOW()),
  (2, 'RomCom Nights', 'ROM_COM', NOW(), NOW()),
  (3, 'Laugh Out Loud', 'COMEDY', NOW(), NOW()),
  (4, 'Skyfall Revenge', 'ACTION', NOW(), NOW()),
  (5, 'Midnight Chase', 'ACTION', NOW(), NOW()),
  (6, 'Steel Horizon', 'ACTION', NOW(), NOW()),
  (7, 'Dragon Fury', 'ACTION', NOW(), NOW()),
  (8, 'Code Red', 'ACTION', NOW(), NOW()),
  (9, 'Velocity X', 'ACTION', NOW(), NOW()),
  (10, 'Love in Paris', 'ROM_COM', NOW(), NOW()),
  (11, 'First Date Diaries', 'ROM_COM', NOW(), NOW()),
  (12, 'Hearts & Coffee', 'ROM_COM', NOW(), NOW()),
  (13, 'Monsoon Melody', 'ROM_COM', NOW(), NOW()),
  (14, 'Forever Yours', 'ROM_COM', NOW(), NOW()),
  (15, 'Stand-Up Sunday', 'COMEDY', NOW(), NOW()),
  (16, 'Office Chaos', 'COMEDY', NOW(), NOW()),
  (17, 'Wedding Crashers 2', 'COMEDY', NOW(), NOW()),
  (18, 'Laugh Riot', 'COMEDY', NOW(), NOW()),
  (19, 'Funny Bones', 'COMEDY', NOW(), NOW()),
  (20, 'Prank Patrol', 'COMEDY', NOW(), NOW()),
  (21, 'Turbo Squad', 'ACTION', NOW(), NOW()),
  (22, 'Sunset Serenade', 'ROM_COM', NOW(), NOW()),
  (23, 'Giggle Factory', 'COMEDY', NOW(), NOW());

-- Theatres (12 total: 2 original + 10 new)
INSERT INTO theatres (id, name, address, city_id, created_at, updated_at) VALUES
  (1, 'Orion PVR', 'Dr Rajkumar Road, Rajajinagar, Bengaluru', 1, NOW(), NOW()),
  (2, 'PVR Phoenix', 'Lower Parel, Mumbai', 2, NOW(), NOW()),
  (3, 'PVR Select Citywalk', 'Saket District Centre, Delhi', 3, NOW(), NOW()),
  (4, 'INOX Nehru Place', 'Nehru Place, South Delhi', 3, NOW(), NOW()),
  (5, 'AMC Forum Sujana Mall', 'Kukatpally, Hyderabad', 4, NOW(), NOW()),
  (6, 'PVR RK Salai', 'Royapettah, Chennai', 5, NOW(), NOW()),
  (7, 'INOX Quest', 'Park Street, Kolkata', 6, NOW(), NOW()),
  (8, 'Carnival Cinemas E-Square', 'University Road, Pune', 7, NOW(), NOW()),
  (9, 'PVR Nexus Koramangala', 'Koramangala, Bengaluru', 1, NOW(), NOW()),
  (10, 'INOX R-City Mall', 'Ghatkopar, Mumbai', 2, NOW(), NOW()),
  (11, 'Cinepolis Manjeera', 'KPHB, Hyderabad', 4, NOW(), NOW()),
  (12, 'Escape Cinemas Express Avenue', 'Royapettah, Chennai', 5, NOW(), NOW());

-- Movies running in theatres (denormalized theatre_name, movie_name)
INSERT INTO theatre_movies (theatre_id, movie_id, theatre_name, movie_name) VALUES
  (1, 1, 'Orion PVR', 'Action Blast'),
  (1, 2, 'Orion PVR', 'RomCom Nights'),
  (2, 1, 'PVR Phoenix', 'Action Blast'),
  (2, 3, 'PVR Phoenix', 'Laugh Out Loud'),
  (3, 4, 'PVR Select Citywalk', 'Skyfall Revenge'),
  (3, 10, 'PVR Select Citywalk', 'Love in Paris'),
  (3, 15, 'PVR Select Citywalk', 'Stand-Up Sunday'),
  (4, 5, 'INOX Nehru Place', 'Midnight Chase'),
  (4, 11, 'INOX Nehru Place', 'First Date Diaries'),
  (5, 6, 'AMC Forum Sujana Mall', 'Steel Horizon'),
  (5, 21, 'AMC Forum Sujana Mall', 'Turbo Squad'),
  (5, 16, 'AMC Forum Sujana Mall', 'Office Chaos'),
  (6, 7, 'PVR RK Salai', 'Dragon Fury'),
  (6, 13, 'PVR RK Salai', 'Monsoon Melody'),
  (7, 8, 'INOX Quest', 'Code Red'),
  (7, 18, 'INOX Quest', 'Laugh Riot'),
  (8, 9, 'Carnival Cinemas E-Square', 'Velocity X'),
  (8, 14, 'Carnival Cinemas E-Square', 'Forever Yours'),
  (9, 1, 'PVR Nexus Koramangala', 'Action Blast'),
  (9, 3, 'PVR Nexus Koramangala', 'Laugh Out Loud'),
  (9, 22, 'PVR Nexus Koramangala', 'Sunset Serenade'),
  (10, 4, 'INOX R-City Mall', 'Skyfall Revenge'),
  (10, 17, 'INOX R-City Mall', 'Wedding Crashers 2'),
  (11, 12, 'Cinepolis Manjeera', 'Hearts & Coffee'),
  (11, 19, 'Cinepolis Manjeera', 'Funny Bones'),
  (11, 23, 'Cinepolis Manjeera', 'Giggle Factory'),
  (12, 20, 'Escape Cinemas Express Avenue', 'Prank Patrol'),
  (12, 7, 'Escape Cinemas Express Avenue', 'Dragon Fury'),
  (12, 2, 'Escape Cinemas Express Avenue', 'RomCom Nights');

-- Users must exist before seats (booked_by_user_id FK) and bookings
-- Password = BCrypt hash of 'Password@123'
INSERT INTO `user` (id, name, email, password, created_at, updated_at) VALUES
  (1, 'John Seed', 'john.seed@example.com', '$2a$10$4TUqA6m7WkQn3UE6q8xyeecxKMCC7W8e7jQCSNfO8L3v2h4WvW2iC', NOW(), NOW()),
  (2, 'Amy Seed',  'amy.seed@example.com',  '$2a$10$4TUqA6m7WkQn3UE6q8xyeecxKMCC7W8e7jQCSNfO8L3v2h4WvW2iC', NOW(), NOW());

-- Seats (29 total: 9 original + 20 new) — seat_status: AVAILABLE | BLOCKED | BOOKED
INSERT INTO seats (id, seat_number, seat_type, price, seat_status, theatre_id, booked_by_user_id, theatre_name, booked_by_user_name, created_at, updated_at) VALUES
  (1, 'A1', 'GOLD',     250.0, 'AVAILABLE', 1, NULL, 'Orion PVR', NULL, NOW(), NOW()),
  (2, 'A2', 'GOLD',     250.0, 'AVAILABLE', 1, NULL, 'Orion PVR', NULL, NOW(), NOW()),
  (3, 'B1', 'SILVER',   180.0, 'BOOKED',    1, 1,    'Orion PVR', 'John Seed', NOW(), NOW()),
  (4, 'B2', 'SILVER',   180.0, 'BOOKED',    1, 1,    'Orion PVR', 'John Seed', NOW(), NOW()),
  (5, 'C1', 'PLATINUM', 330.0, 'BLOCKED',   1, 2,    'Orion PVR', 'Amy Seed', NOW(), NOW()),
  (6, 'A1', 'GOLD',     300.0, 'AVAILABLE', 2, NULL, 'PVR Phoenix', NULL, NOW(), NOW()),
  (7, 'A2', 'GOLD',     300.0, 'AVAILABLE', 2, NULL, 'PVR Phoenix', NULL, NOW(), NOW()),
  (8, 'B1', 'SILVER',   220.0, 'AVAILABLE', 2, NULL, 'PVR Phoenix', NULL, NOW(), NOW()),
  (9, 'C1', 'PLATINUM', 380.0, 'AVAILABLE', 2, NULL, 'PVR Phoenix', NULL, NOW(), NOW()),
  (10, 'A1', 'GOLD',     280.0, 'AVAILABLE', 3, NULL, 'PVR Select Citywalk', NULL, NOW(), NOW()),
  (11, 'A2', 'GOLD',     280.0, 'AVAILABLE', 3, NULL, 'PVR Select Citywalk', NULL, NOW(), NOW()),
  (12, 'B1', 'SILVER',   200.0, 'AVAILABLE', 4, NULL, 'INOX Nehru Place', NULL, NOW(), NOW()),
  (13, 'B2', 'SILVER',   200.0, 'AVAILABLE', 4, NULL, 'INOX Nehru Place', NULL, NOW(), NOW()),
  (14, 'A1', 'GOLD',     270.0, 'AVAILABLE', 5, NULL, 'AMC Forum Sujana Mall', NULL, NOW(), NOW()),
  (15, 'A2', 'PLATINUM', 350.0, 'AVAILABLE', 5, NULL, 'AMC Forum Sujana Mall', NULL, NOW(), NOW()),
  (16, 'C1', 'SILVER',   190.0, 'AVAILABLE', 6, NULL, 'PVR RK Salai', NULL, NOW(), NOW()),
  (17, 'C2', 'SILVER',   190.0, 'AVAILABLE', 6, NULL, 'PVR RK Salai', NULL, NOW(), NOW()),
  (18, 'D1', 'GOLD',     260.0, 'AVAILABLE', 7, NULL, 'INOX Quest', NULL, NOW(), NOW()),
  (19, 'D2', 'GOLD',     260.0, 'AVAILABLE', 7, NULL, 'INOX Quest', NULL, NOW(), NOW()),
  (20, 'E1', 'SILVER',   210.0, 'AVAILABLE', 8, NULL, 'Carnival Cinemas E-Square', NULL, NOW(), NOW()),
  (21, 'E2', 'PLATINUM', 340.0, 'AVAILABLE', 8, NULL, 'Carnival Cinemas E-Square', NULL, NOW(), NOW()),
  (22, 'F1', 'GOLD',     255.0, 'AVAILABLE', 9, NULL, 'PVR Nexus Koramangala', NULL, NOW(), NOW()),
  (23, 'F2', 'GOLD',     255.0, 'AVAILABLE', 9, NULL, 'PVR Nexus Koramangala', NULL, NOW(), NOW()),
  (24, 'G1', 'SILVER',   215.0, 'AVAILABLE', 10, NULL, 'INOX R-City Mall', NULL, NOW(), NOW()),
  (25, 'G2', 'SILVER',   215.0, 'AVAILABLE', 10, NULL, 'INOX R-City Mall', NULL, NOW(), NOW()),
  (26, 'H1', 'GOLD',     265.0, 'AVAILABLE', 11, NULL, 'Cinepolis Manjeera', NULL, NOW(), NOW()),
  (27, 'H2', 'PLATINUM', 360.0, 'AVAILABLE', 11, NULL, 'Cinepolis Manjeera', NULL, NOW(), NOW()),
  (28, 'J1', 'SILVER',   195.0, 'AVAILABLE', 12, NULL, 'Escape Cinemas Express Avenue', NULL, NOW(), NOW()),
  (29, 'J2', 'GOLD',     275.0, 'AVAILABLE', 12, NULL, 'Escape Cinemas Express Avenue', NULL, NOW(), NOW());

-- Sample bookings (denormalized user_name, movie_name, theatre_name)
INSERT INTO bookings (id, user_id, movie_id, theatre_id, user_name, movie_name, theatre_name, status, total_amount, hold_expires_at, created_at, updated_at) VALUES
  (1, 1, 1, 1, 'John Seed', 'Action Blast', 'Orion PVR', 'CONFIRMED', 360.0, NULL, NOW(), NOW()),
  (2, 2, 1, 1, 'Amy Seed',  'Action Blast', 'Orion PVR', 'PENDING',   330.0, DATE_ADD(NOW(), INTERVAL 5 MINUTE), NOW(), NOW());

INSERT INTO booking_seats (booking_id, seat_id) VALUES
  (1, 3),
  (1, 4),
  (2, 5);

-- Sample payment for confirmed booking
INSERT INTO payments (id, amount, currency, provider, status, gateway_order_id, gateway_payment_reference, failure_reason, booking_id, created_at, updated_at) VALUES
  (1, 360.0, 'INR', 'STRIPE', 'SUCCESS', 'pi_seed_stripe_0001', 'pay_seed_stripe_0001', NULL, 1, NOW(), NOW());

SELECT 'Seed complete' AS status,
       (SELECT COUNT(*) FROM cities) AS cities,
       (SELECT COUNT(*) FROM movies) AS movies,
       (SELECT COUNT(*) FROM theatres) AS theatres,
       (SELECT COUNT(*) FROM seats) AS seats;

SET SQL_SAFE_UPDATES = @OLD_SQL_SAFE_UPDATES;
