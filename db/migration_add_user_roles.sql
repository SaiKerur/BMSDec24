-- BMSDec24: add role column to user table (MySQL)
-- Run once if Hibernate has not added the column yet.

USE BMSDec24;

-- Ignore error 1060 (Duplicate column name) on re-run.
ALTER TABLE `user` ADD COLUMN role VARCHAR(255) NULL;
UPDATE `user` SET role = 'USER' WHERE role IS NULL;
