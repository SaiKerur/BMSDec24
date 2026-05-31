-- Optional: backfill name columns on an existing database (skip if you re-run seed_bmsdec24.sql).
USE BMSDec24;

-- Add columns only if missing (run each ALTER once; ignore "Duplicate column" errors on re-run).
-- ALTER TABLE seats ADD COLUMN booked_by_user_name VARCHAR(255) NULL;
-- ALTER TABLE seats ADD COLUMN theatre_name VARCHAR(255) NULL;
-- ALTER TABLE bookings ADD COLUMN user_name VARCHAR(255) NULL;
-- ALTER TABLE bookings ADD COLUMN movie_name VARCHAR(255) NULL;
-- ALTER TABLE bookings ADD COLUMN theatre_name VARCHAR(255) NULL;
-- ALTER TABLE theatre_movies ADD COLUMN theatre_name VARCHAR(255) NULL;
-- ALTER TABLE theatre_movies ADD COLUMN movie_name VARCHAR(255) NULL;

UPDATE seats s
  JOIN theatres t ON s.theatre_id = t.id
  LEFT JOIN `user` u ON s.booked_by_user_id = u.id
SET s.theatre_name = t.name,
    s.booked_by_user_name = u.name;

UPDATE bookings b
  JOIN `user` u ON b.user_id = u.id
  JOIN movies m ON b.movie_id = m.id
  JOIN theatres t ON b.theatre_id = t.id
SET b.user_name = u.name,
    b.movie_name = m.title,
    b.theatre_name = t.name;

UPDATE theatre_movies tm
  JOIN theatres t ON tm.theatre_id = t.id
  JOIN movies m ON tm.movie_id = m.id
SET tm.theatre_name = t.name,
    tm.movie_name = m.title;
