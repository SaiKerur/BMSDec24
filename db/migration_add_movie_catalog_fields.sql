-- Rich movie catalog fields for search, recommendations, and marketing APIs.
-- Safe to run on existing MySQL schema (Hibernate ddl-auto=update also applies these).

ALTER TABLE movies
  ADD COLUMN poster_url VARCHAR(512) NULL AFTER genre,
  ADD COLUMN trailer_url VARCHAR(512) NULL AFTER poster_url,
  ADD COLUMN language VARCHAR(64) NULL AFTER trailer_url,
  ADD COLUMN runtime INT NULL AFTER language,
  ADD COLUMN certification VARCHAR(16) NULL AFTER runtime,
  ADD COLUMN synopsis TEXT NULL AFTER certification,
  ADD COLUMN release_date DATE NULL AFTER synopsis,
  ADD COLUMN status VARCHAR(32) NULL AFTER release_date;

CREATE TABLE IF NOT EXISTS movie_cast (
  movie_id INT NOT NULL,
  cast_member VARCHAR(255) NOT NULL,
  PRIMARY KEY (movie_id, cast_member),
  CONSTRAINT fk_movie_cast_movie FOREIGN KEY (movie_id) REFERENCES movies(id)
);

-- Seed catalog metadata for demo movies (ids 1-3 from seed_bmsdec24.sql).
UPDATE movies SET
  poster_url = 'https://cdn.example.com/posters/action-blast.jpg',
  trailer_url = 'https://cdn.example.com/trailers/action-blast.mp4',
  language = 'English',
  runtime = 142,
  certification = 'UA',
  synopsis = 'A rogue agent races against time to stop a global cyber-attack.',
  release_date = DATE_SUB(CURDATE(), INTERVAL 14 DAY),
  status = 'NOW_SHOWING'
WHERE id = 1;

UPDATE movies SET
  poster_url = 'https://cdn.example.com/posters/romcom-nights.jpg',
  trailer_url = 'https://cdn.example.com/trailers/romcom-nights.mp4',
  language = 'Hindi',
  runtime = 118,
  certification = 'U',
  synopsis = 'Two strangers keep meeting on late-night metro rides and fall in love.',
  release_date = DATE_SUB(CURDATE(), INTERVAL 7 DAY),
  status = 'NOW_SHOWING'
WHERE id = 2;

UPDATE movies SET
  poster_url = 'https://cdn.example.com/posters/laugh-out-loud.jpg',
  trailer_url = 'https://cdn.example.com/trailers/laugh-out-loud.mp4',
  language = 'English',
  runtime = 105,
  certification = 'U',
  synopsis = 'A stand-up comic''s disastrous wedding week turns into his best material yet.',
  release_date = DATE_SUB(CURDATE(), INTERVAL 21 DAY),
  status = 'NOW_SHOWING'
WHERE id = 3;

INSERT IGNORE INTO movie_cast (movie_id, cast_member) VALUES
  (1, 'Alex Rivera'), (1, 'Mia Chen'), (1, 'Vikram Rao'),
  (2, 'Priya Sharma'), (2, 'Arjun Mehta'),
  (3, 'Sam Brooks'), (3, 'Nina Patel');

-- Coming-soon titles for marketing surfaces.
INSERT INTO movies (id, title, genre, poster_url, trailer_url, language, runtime, certification,
                    synopsis, release_date, status, created_at, updated_at)
VALUES
  (24, 'Galactic Dawn', 'ACTION', 'https://cdn.example.com/posters/galactic-dawn.jpg',
   'https://cdn.example.com/trailers/galactic-dawn-teaser.mp4', 'English', 156, 'UA',
   'Humanity''s first interstellar colony faces an unexpected threat from deep space.',
   DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'COMING_SOON', NOW(), NOW()),
  (25, 'Monsoon Letters', 'ROM_COM', 'https://cdn.example.com/posters/monsoon-letters.jpg',
   'https://cdn.example.com/trailers/monsoon-letters-teaser.mp4', 'Hindi', 128, 'U',
   'Old love letters resurface during a rainy season in Kochi.',
   DATE_ADD(CURDATE(), INTERVAL 45 DAY), 'COMING_SOON', NOW(), NOW())
ON DUPLICATE KEY UPDATE
  poster_url = VALUES(poster_url),
  trailer_url = VALUES(trailer_url),
  language = VALUES(language),
  runtime = VALUES(runtime),
  certification = VALUES(certification),
  synopsis = VALUES(synopsis),
  release_date = VALUES(release_date),
  status = VALUES(status),
  updated_at = NOW();

INSERT IGNORE INTO movie_cast (movie_id, cast_member) VALUES
  (24, 'Jordan Lee'), (24, 'Aisha Khan'),
  (25, 'Rhea Das'), (25, 'Kabir Joshi');
