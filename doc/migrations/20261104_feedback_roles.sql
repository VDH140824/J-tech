CREATE TABLE IF NOT EXISTS feedback_handling_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  feedback_id BIGINT UNSIGNED NOT NULL,
  status VARCHAR(20) NOT NULL,
  resolution_note TEXT NOT NULL,
  handled_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX ix_feedback_history(feedback_id, created_at)
);
