-- UC-26/27/55, BR45/106/112. No sample milestones or invented reward amounts.
-- Qualified learning dates are read from the existing study_session table.
CREATE TABLE IF NOT EXISTS streak_milestone (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  target_days INT NOT NULL,
  coin_amount BIGINT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE KEY uq_streak_days (target_days),
  CHECK (target_days > 0),
  CHECK (coin_amount > 0 AND coin_amount <= 4294967295)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
