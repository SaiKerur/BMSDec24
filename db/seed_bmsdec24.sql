-- BMSDec24 full seed data (MySQL)
-- Model: City -> Theatre -> Screen -> Show -> ShowSeat (real-time inventory)
--        Theatre -> Seat; User books via theatre seats OR show seats -> Payment
-- Enums stored as readable text (AVAILABLE, PENDING, STRIPE, TWO_D, etc.).
--
-- Prerequisites:
--   1. Schema BMSDec24 exists
--   2. Run migration_add_realtime_tables.sql once if tables are missing
--      (or start the app once with spring.jpa.hibernate.ddl-auto=update)
--
-- Postman / H2 alignment (theatres 1-2):
--   Show 1 @ Orion  — Action Blast  — showSeats 1-2 AVAILABLE
--   Show 2 @ Orion  — RomCom Nights  — showSeat 3 AVAILABLE, 4 BLOCKED
--   Show 3 @ Phoenix — Action Blast  — showSeats 5-6 AVAILABLE

USE BMSDec24;

SET @OLD_SQL_SAFE_UPDATES = @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE payments;
TRUNCATE TABLE booking_seats;
TRUNCATE TABLE bookings;
TRUNCATE TABLE show_seats;
TRUNCATE TABLE shows;
TRUNCATE TABLE screen_features;
TRUNCATE TABLE screens;
TRUNCATE TABLE theatre_movies;
TRUNCATE TABLE seats;
TRUNCATE TABLE theatres;
TRUNCATE TABLE movies;
TRUNCATE TABLE cities;
TRUNCATE TABLE `user`;

SET FOREIGN_KEY_CHECKS = 1;

-- ===========================================================================
-- Core masters
-- ===========================================================================

INSERT INTO cities (id, name, created_at, updated_at) VALUES
  (1, 'Bengaluru', NOW(), NOW()),
  (2, 'Mumbai',    NOW(), NOW()),
  (3, 'Delhi',     NOW(), NOW()),
  (4, 'Hyderabad', NOW(), NOW()),
  (5, 'Chennai',   NOW(), NOW()),
  (6, 'Kolkata',   NOW(), NOW()),
  (7, 'Pune',      NOW(), NOW());

INSERT INTO movies (id, title, genre, created_at, updated_at) VALUES
  (1,  'Action Blast',        'ACTION',  NOW(), NOW()),
  (2,  'RomCom Nights',       'ROM_COM', NOW(), NOW()),
  (3,  'Laugh Out Loud',      'COMEDY',  NOW(), NOW()),
  (4,  'Skyfall Revenge',     'ACTION',  NOW(), NOW()),
  (5,  'Midnight Chase',      'ACTION',  NOW(), NOW()),
  (6,  'Steel Horizon',       'ACTION',  NOW(), NOW()),
  (7,  'Dragon Fury',         'ACTION',  NOW(), NOW()),
  (8,  'Code Red',            'ACTION',  NOW(), NOW()),
  (9,  'Velocity X',          'ACTION',  NOW(), NOW()),
  (10, 'Love in Paris',       'ROM_COM', NOW(), NOW()),
  (11, 'First Date Diaries',  'ROM_COM', NOW(), NOW()),
  (12, 'Hearts & Coffee',     'ROM_COM', NOW(), NOW()),
  (13, 'Monsoon Melody',      'ROM_COM', NOW(), NOW()),
  (14, 'Forever Yours',       'ROM_COM', NOW(), NOW()),
  (15, 'Stand-Up Sunday',     'COMEDY',  NOW(), NOW()),
  (16, 'Office Chaos',        'COMEDY',  NOW(), NOW()),
  (17, 'Wedding Crashers 2',  'COMEDY',  NOW(), NOW()),
  (18, 'Laugh Riot',          'COMEDY',  NOW(), NOW()),
  (19, 'Funny Bones',         'COMEDY',  NOW(), NOW()),
  (20, 'Prank Patrol',        'COMEDY',  NOW(), NOW()),
  (21, 'Turbo Squad',         'ACTION',  NOW(), NOW()),
  (22, 'Sunset Serenade',     'ROM_COM', NOW(), NOW()),
  (23, 'Giggle Factory',      'COMEDY',  NOW(), NOW());

INSERT INTO theatres (id, name, address, city_id, created_at, updated_at) VALUES
  (1,  'Orion PVR',                    'Dr Rajkumar Road, Rajajinagar, Bengaluru', 1, NOW(), NOW()),
  (2,  'PVR Phoenix',                  'Lower Parel, Mumbai',                      2, NOW(), NOW()),
  (3,  'PVR Select Citywalk',          'Saket District Centre, Delhi',           3, NOW(), NOW()),
  (4,  'INOX Nehru Place',             'Nehru Place, South Delhi',                 3, NOW(), NOW()),
  (5,  'AMC Forum Sujana Mall',        'Kukatpally, Hyderabad',                    4, NOW(), NOW()),
  (6,  'PVR RK Salai',                 'Royapettah, Chennai',                      5, NOW(), NOW()),
  (7,  'INOX Quest',                   'Park Street, Kolkata',                     6, NOW(), NOW()),
  (8,  'Carnival Cinemas E-Square',    'University Road, Pune',                    7, NOW(), NOW()),
  (9,  'PVR Nexus Koramangala',        'Koramangala, Bengaluru',                   1, NOW(), NOW()),
  (10, 'INOX R-City Mall',             'Ghatkopar, Mumbai',                        2, NOW(), NOW()),
  (11, 'Cinepolis Manjeera',           'KPHB, Hyderabad',                          4, NOW(), NOW()),
  (12, 'Escape Cinemas Express Avenue','Royapettah, Chennai',                      5, NOW(), NOW());

INSERT INTO theatre_movies (theatre_id, movie_id, theatre_name, movie_name) VALUES
  (1,  1,  'Orion PVR',                     'Action Blast'),
  (1,  2,  'Orion PVR',                     'RomCom Nights'),
  (2,  1,  'PVR Phoenix',                   'Action Blast'),
  (2,  3,  'PVR Phoenix',                   'Laugh Out Loud'),
  (3,  4,  'PVR Select Citywalk',           'Skyfall Revenge'),
  (3,  10, 'PVR Select Citywalk',           'Love in Paris'),
  (3,  15, 'PVR Select Citywalk',           'Stand-Up Sunday'),
  (4,  5,  'INOX Nehru Place',              'Midnight Chase'),
  (4,  11, 'INOX Nehru Place',              'First Date Diaries'),
  (5,  6,  'AMC Forum Sujana Mall',         'Steel Horizon'),
  (5,  21, 'AMC Forum Sujana Mall',         'Turbo Squad'),
  (5,  16, 'AMC Forum Sujana Mall',         'Office Chaos'),
  (6,  7,  'PVR RK Salai',                  'Dragon Fury'),
  (6,  13, 'PVR RK Salai',                  'Monsoon Melody'),
  (7,  8,  'INOX Quest',                    'Code Red'),
  (7,  18, 'INOX Quest',                    'Laugh Riot'),
  (8,  9,  'Carnival Cinemas E-Square',     'Velocity X'),
  (8,  14, 'Carnival Cinemas E-Square',     'Forever Yours'),
  (9,  1,  'PVR Nexus Koramangala',         'Action Blast'),
  (9,  3,  'PVR Nexus Koramangala',         'Laugh Out Loud'),
  (9,  22, 'PVR Nexus Koramangala',         'Sunset Serenade'),
  (10, 4,  'INOX R-City Mall',              'Skyfall Revenge'),
  (10, 17, 'INOX R-City Mall',              'Wedding Crashers 2'),
  (11, 12, 'Cinepolis Manjeera',            'Hearts & Coffee'),
  (11, 19, 'Cinepolis Manjeera',            'Funny Bones'),
  (11, 23, 'Cinepolis Manjeera',            'Giggle Factory'),
  (12, 20, 'Escape Cinemas Express Avenue', 'Prank Patrol'),
  (12, 7,  'Escape Cinemas Express Avenue', 'Dragon Fury'),
  (12, 2,  'Escape Cinemas Express Avenue', 'RomCom Nights');

-- Users (password = BCrypt of 'Password@123')
INSERT INTO `user` (id, name, email, password, created_at, updated_at) VALUES
  (1, 'John Seed', 'john.seed@example.com', '$2a$10$4TUqA6m7WkQn3UE6q8xyeecxKMCC7W8e7jQCSNfO8L3v2h4WvW2iC', NOW(), NOW()),
  (2, 'Amy Seed',  'amy.seed@example.com',  '$2a$10$4TUqA6m7WkQn3UE6q8xyeecxKMCC7W8e7jQCSNfO8L3v2h4WvW2iC', NOW(), NOW());

-- Theatre seats (seat_status: AVAILABLE | BLOCKED | BOOKED)
INSERT INTO seats (id, seat_number, seat_type, price, seat_status, theatre_id, booked_by_user_id, theatre_name, booked_by_user_name, created_at, updated_at) VALUES
  (1,  'A1', 'GOLD',     250.0, 'AVAILABLE', 1,  NULL, 'Orion PVR',                     NULL,        NOW(), NOW()),
  (2,  'A2', 'GOLD',     250.0, 'AVAILABLE', 1,  NULL, 'Orion PVR',                     NULL,        NOW(), NOW()),
  (3,  'B1', 'SILVER',   180.0, 'BOOKED',    1,  1,    'Orion PVR',                     'John Seed', NOW(), NOW()),
  (4,  'B2', 'SILVER',   180.0, 'BOOKED',    1,  1,    'Orion PVR',                     'John Seed', NOW(), NOW()),
  (5,  'C1', 'PLATINUM', 330.0, 'BLOCKED',   1,  2,    'Orion PVR',                     'Amy Seed',  NOW(), NOW()),
  (6,  'A1', 'GOLD',     300.0, 'AVAILABLE', 2,  NULL, 'PVR Phoenix',                   NULL,        NOW(), NOW()),
  (7,  'A2', 'GOLD',     300.0, 'AVAILABLE', 2,  NULL, 'PVR Phoenix',                   NULL,        NOW(), NOW()),
  (8,  'B1', 'SILVER',   220.0, 'AVAILABLE', 2,  NULL, 'PVR Phoenix',                   NULL,        NOW(), NOW()),
  (9,  'C1', 'PLATINUM', 380.0, 'AVAILABLE', 2,  NULL, 'PVR Phoenix',                   NULL,        NOW(), NOW()),
  (10, 'A1', 'GOLD',     280.0, 'AVAILABLE', 3,  NULL, 'PVR Select Citywalk',           NULL,        NOW(), NOW()),
  (11, 'A2', 'GOLD',     280.0, 'AVAILABLE', 3,  NULL, 'PVR Select Citywalk',           NULL,        NOW(), NOW()),
  (12, 'B1', 'SILVER',   200.0, 'AVAILABLE', 4,  NULL, 'INOX Nehru Place',              NULL,        NOW(), NOW()),
  (13, 'B2', 'SILVER',   200.0, 'AVAILABLE', 4,  NULL, 'INOX Nehru Place',              NULL,        NOW(), NOW()),
  (14, 'A1', 'GOLD',     270.0, 'AVAILABLE', 5,  NULL, 'AMC Forum Sujana Mall',         NULL,        NOW(), NOW()),
  (15, 'A2', 'PLATINUM', 350.0, 'AVAILABLE', 5,  NULL, 'AMC Forum Sujana Mall',         NULL,        NOW(), NOW()),
  (16, 'C1', 'SILVER',   190.0, 'AVAILABLE', 6,  NULL, 'PVR RK Salai',                  NULL,        NOW(), NOW()),
  (17, 'C2', 'SILVER',   190.0, 'AVAILABLE', 6,  NULL, 'PVR RK Salai',                  NULL,        NOW(), NOW()),
  (18, 'D1', 'GOLD',     260.0, 'AVAILABLE', 7,  NULL, 'INOX Quest',                    NULL,        NOW(), NOW()),
  (19, 'D2', 'GOLD',     260.0, 'AVAILABLE', 7,  NULL, 'INOX Quest',                    NULL,        NOW(), NOW()),
  (20, 'E1', 'SILVER',   210.0, 'AVAILABLE', 8,  NULL, 'Carnival Cinemas E-Square',     NULL,        NOW(), NOW()),
  (21, 'E2', 'PLATINUM', 340.0, 'AVAILABLE', 8,  NULL, 'Carnival Cinemas E-Square',     NULL,        NOW(), NOW()),
  (22, 'F1', 'GOLD',     255.0, 'AVAILABLE', 9,  NULL, 'PVR Nexus Koramangala',         NULL,        NOW(), NOW()),
  (23, 'F2', 'GOLD',     255.0, 'AVAILABLE', 9,  NULL, 'PVR Nexus Koramangala',         NULL,        NOW(), NOW()),
  (24, 'G1', 'SILVER',   215.0, 'AVAILABLE', 10, NULL, 'INOX R-City Mall',              NULL,        NOW(), NOW()),
  (25, 'G2', 'SILVER',   215.0, 'AVAILABLE', 10, NULL, 'INOX R-City Mall',              NULL,        NOW(), NOW()),
  (26, 'H1', 'GOLD',     265.0, 'AVAILABLE', 11, NULL, 'Cinepolis Manjeera',            NULL,        NOW(), NOW()),
  (27, 'H2', 'PLATINUM', 360.0, 'AVAILABLE', 11, NULL, 'Cinepolis Manjeera',            NULL,        NOW(), NOW()),
  (28, 'J1', 'SILVER',   195.0, 'AVAILABLE', 12, NULL, 'Escape Cinemas Express Avenue', NULL,        NOW(), NOW()),
  (29, 'J2', 'GOLD',     275.0, 'AVAILABLE', 12, NULL, 'Escape Cinemas Express Avenue', NULL,        NOW(), NOW());

-- ===========================================================================
-- Screens & features (real-time layer)
-- ===========================================================================

INSERT INTO screens (id, name, theatre_id, created_at, updated_at) VALUES
  (1,  'Audi 1', 1,  NOW(), NOW()),
  (2,  'Audi 1', 2,  NOW(), NOW()),
  (3,  'Audi 1', 3,  NOW(), NOW()),
  (4,  'Audi 2', 4,  NOW(), NOW()),
  (5,  'Screen 1', 5, NOW(), NOW()),
  (6,  'Audi 1', 6,  NOW(), NOW()),
  (7,  'Audi 1', 7,  NOW(), NOW()),
  (8,  'Audi 1', 8,  NOW(), NOW()),
  (9,  'Audi 1', 9,  NOW(), NOW()),
  (10, 'Audi 1', 10, NOW(), NOW()),
  (11, 'Audi 1', 11, NOW(), NOW()),
  (12, 'Audi 1', 12, NOW(), NOW());

INSERT INTO screen_features (screen_id, feature) VALUES
  (1,  'TWO_D'),
  (1,  'DOLBY_ATMOS'),
  (2,  'IMAX'),
  (2,  'DOLBY_VISION'),
  (3,  'TWO_D'),
  (3,  'DOLBY_VISION'),
  (4,  'THREE_D'),
  (5,  'IMAX'),
  (5,  'DOLBY_ATMOS'),
  (6,  'TWO_D'),
  (7,  'FOUR_D'),
  (8,  'TWO_D'),
  (9,  'DOLBY_ATMOS'),
  (10, 'IMAX'),
  (11, 'THREE_D'),
  (12, 'TWO_D');

-- ===========================================================================
-- Shows (showtimes)
-- ===========================================================================

INSERT INTO shows (id, screen_id, movie_id, start_time, created_at, updated_at) VALUES
  -- Postman-aligned (theatres 1-2)
  (1,  1,  1,  DATE_ADD(NOW(), INTERVAL 2 HOUR),  NOW(), NOW()),
  (2,  1,  2,  DATE_ADD(NOW(), INTERVAL 8 HOUR),  NOW(), NOW()),
  (3,  2,  1,  DATE_ADD(NOW(), INTERVAL 5 HOUR),  NOW(), NOW()),
  (4,  2,  3,  DATE_ADD(NOW(), INTERVAL 11 HOUR), NOW(), NOW()),
  -- Additional showtimes at other theatres
  (5,  3,  4,  DATE_ADD(NOW(), INTERVAL 3 HOUR),  NOW(), NOW()),
  (6,  3,  10, DATE_ADD(NOW(), INTERVAL 9 HOUR),  NOW(), NOW()),
  (7,  4,  5,  DATE_ADD(NOW(), INTERVAL 4 HOUR),  NOW(), NOW()),
  (8,  5,  6,  DATE_ADD(NOW(), INTERVAL 6 HOUR),  NOW(), NOW()),
  (9,  6,  7,  DATE_ADD(NOW(), INTERVAL 7 HOUR),  NOW(), NOW()),
  (10, 7,  8,  DATE_ADD(NOW(), INTERVAL 10 HOUR), NOW(), NOW()),
  (11, 8,  9,  DATE_ADD(NOW(), INTERVAL 12 HOUR), NOW(), NOW()),
  (12, 9,  1,  DATE_ADD(NOW(), INTERVAL 13 HOUR), NOW(), NOW()),
  (13, 10, 4,  DATE_ADD(NOW(), INTERVAL 14 HOUR), NOW(), NOW()),
  (14, 11, 12, DATE_ADD(NOW(), INTERVAL 15 HOUR), NOW(), NOW()),
  (15, 12, 2,  DATE_ADD(NOW(), INTERVAL 16 HOUR), NOW(), NOW());

-- ===========================================================================
-- Show seats (per-showtime inventory)
-- ===========================================================================

INSERT INTO show_seats (id, show_id, seat_id, seat_status, booked_by_user_id, created_at, updated_at) VALUES
  -- Show 1: Orion Action Blast — seats A1, A2 both AVAILABLE (Postman showSeats 1-2)
  (1,  1, 1, 'AVAILABLE', NULL, NOW(), NOW()),
  (2,  1, 2, 'AVAILABLE', NULL, NOW(), NOW()),
  -- Show 2: Orion RomCom — A1 AVAILABLE, A2 BLOCKED (Postman showSeats 3-4)
  (3,  2, 1, 'AVAILABLE', NULL, NOW(), NOW()),
  (4,  2, 2, 'BLOCKED',   2,    NOW(), NOW()),
  -- Show 3: Phoenix Action Blast — A1, A2 AVAILABLE (Postman showSeats 5-6)
  (5,  3, 6, 'AVAILABLE', NULL, NOW(), NOW()),
  (6,  3, 7, 'AVAILABLE', NULL, NOW(), NOW()),
  -- Show 4: Phoenix Comedy — all phoenix seats AVAILABLE
  (7,  4, 6, 'AVAILABLE', NULL, NOW(), NOW()),
  (8,  4, 7, 'AVAILABLE', NULL, NOW(), NOW()),
  (9,  4, 8, 'AVAILABLE', NULL, NOW(), NOW()),
  (10, 4, 9, 'AVAILABLE', NULL, NOW(), NOW()),
  -- Shows 5-15: first two seats at each theatre, all AVAILABLE
  (11, 5,  10, 'AVAILABLE', NULL, NOW(), NOW()),
  (12, 5,  11, 'AVAILABLE', NULL, NOW(), NOW()),
  (13, 6,  10, 'AVAILABLE', NULL, NOW(), NOW()),
  (14, 6,  11, 'AVAILABLE', NULL, NOW(), NOW()),
  (15, 7,  12, 'AVAILABLE', NULL, NOW(), NOW()),
  (16, 7,  13, 'AVAILABLE', NULL, NOW(), NOW()),
  (17, 8,  14, 'AVAILABLE', NULL, NOW(), NOW()),
  (18, 8,  15, 'AVAILABLE', NULL, NOW(), NOW()),
  (19, 9,  16, 'AVAILABLE', NULL, NOW(), NOW()),
  (20, 9,  17, 'AVAILABLE', NULL, NOW(), NOW()),
  (21, 10, 18, 'AVAILABLE', NULL, NOW(), NOW()),
  (22, 10, 19, 'AVAILABLE', NULL, NOW(), NOW()),
  (23, 11, 20, 'AVAILABLE', NULL, NOW(), NOW()),
  (24, 11, 21, 'AVAILABLE', NULL, NOW(), NOW()),
  (25, 12, 22, 'AVAILABLE', NULL, NOW(), NOW()),
  (26, 12, 23, 'AVAILABLE', NULL, NOW(), NOW()),
  (27, 13, 24, 'AVAILABLE', NULL, NOW(), NOW()),
  (28, 13, 25, 'AVAILABLE', NULL, NOW(), NOW()),
  (29, 14, 26, 'AVAILABLE', NULL, NOW(), NOW()),
  (30, 14, 27, 'AVAILABLE', NULL, NOW(), NOW()),
  (31, 15, 28, 'AVAILABLE', NULL, NOW(), NOW()),
  (32, 15, 29, 'AVAILABLE', NULL, NOW(), NOW());

-- ===========================================================================
-- Bookings & payments (theatre-level samples; show_id NULL)
-- ===========================================================================

INSERT INTO bookings (id, user_id, movie_id, theatre_id, show_id, user_name, movie_name, theatre_name, status, total_amount, hold_expires_at, created_at, updated_at) VALUES
  (1, 1, 1, 1, NULL, 'John Seed', 'Action Blast', 'Orion PVR', 'CONFIRMED', 360.0, NULL,                              NOW(), NOW()),
  (2, 2, 1, 1, NULL, 'Amy Seed',  'Action Blast', 'Orion PVR', 'PENDING',   330.0, DATE_ADD(NOW(), INTERVAL 5 MINUTE), NOW(), NOW());

INSERT INTO booking_seats (booking_id, seat_id) VALUES
  (1, 3),
  (1, 4),
  (2, 5);

INSERT INTO payments (id, amount, currency, provider, status, gateway_order_id, gateway_payment_reference, failure_reason, booking_id, created_at, updated_at) VALUES
  (1, 360.0, 'INR', 'STRIPE', 'SUCCESS', 'pi_seed_stripe_0001', 'pay_seed_stripe_0001', NULL, 1, NOW(), NOW());

-- ===========================================================================
-- Summary
-- ===========================================================================

SELECT 'Seed complete' AS status,
       (SELECT COUNT(*) FROM cities)       AS cities,
       (SELECT COUNT(*) FROM movies)       AS movies,
       (SELECT COUNT(*) FROM theatres)     AS theatres,
       (SELECT COUNT(*) FROM seats)        AS seats,
       (SELECT COUNT(*) FROM screens)      AS screens,
       (SELECT COUNT(*) FROM shows)        AS shows,
       (SELECT COUNT(*) FROM show_seats)   AS show_seats,
       (SELECT COUNT(*) FROM bookings)     AS bookings;

SET SQL_SAFE_UPDATES = @OLD_SQL_SAFE_UPDATES;
