-- BMSDec24: DDL for real-time show / screen tables (MySQL)
-- Run once against schema BMSDec24 if Hibernate has not created the tables yet.
-- If spring.jpa.hibernate.ddl-auto=update is enabled, starting the app once is enough.
--
-- Re-run notes: ignore "Duplicate column" (1060) and "Duplicate key name" (1061) errors.

USE BMSDec24;

CREATE TABLE IF NOT EXISTS screens (
  id          INT          NOT NULL AUTO_INCREMENT,
  created_at  DATETIME(6)  NULL,
  updated_at  DATETIME(6)  NULL,
  name        VARCHAR(255) NULL,
  theatre_id  INT          NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_screens_theatre FOREIGN KEY (theatre_id) REFERENCES theatres (id)
);

CREATE TABLE IF NOT EXISTS screen_features (
  screen_id INT          NOT NULL,
  feature   VARCHAR(255) NULL,
  CONSTRAINT fk_screen_features_screen FOREIGN KEY (screen_id) REFERENCES screens (id)
);

CREATE TABLE IF NOT EXISTS shows (
  id          INT          NOT NULL AUTO_INCREMENT,
  created_at  DATETIME(6)  NULL,
  updated_at  DATETIME(6)  NULL,
  start_time  DATETIME(6)  NULL,
  movie_id    INT          NULL,
  screen_id   INT          NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_shows_movie  FOREIGN KEY (movie_id)  REFERENCES movies (id),
  CONSTRAINT fk_shows_screen FOREIGN KEY (screen_id) REFERENCES screens (id)
);

CREATE TABLE IF NOT EXISTS show_seats (
  id                 INT          NOT NULL AUTO_INCREMENT,
  created_at         DATETIME(6)  NULL,
  updated_at         DATETIME(6)  NULL,
  seat_status        VARCHAR(255) NULL,
  booked_by_user_id  INT          NULL,
  seat_id            INT          NULL,
  show_id            INT          NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_show_seats_show FOREIGN KEY (show_id)           REFERENCES shows (id),
  CONSTRAINT fk_show_seats_seat FOREIGN KEY (seat_id)           REFERENCES seats (id),
  CONSTRAINT fk_show_seats_user FOREIGN KEY (booked_by_user_id) REFERENCES `user` (id)
);

-- Add show_id to bookings (run once; ignore 1060 if column exists)
-- ALTER TABLE bookings ADD COLUMN show_id INT NULL;
-- ALTER TABLE bookings ADD CONSTRAINT fk_bookings_show FOREIGN KEY (show_id) REFERENCES shows (id);
