-- Apply once to existing databases created before course soft deletion was added.
ALTER TABLE course ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL;
