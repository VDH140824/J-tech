-- Run once on the existing MySQL database before starting the updated backend.
-- Existing courses remain visible because deleted_at defaults to NULL.
ALTER TABLE course ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL;
