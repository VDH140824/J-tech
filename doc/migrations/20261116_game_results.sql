CREATE TABLE IF NOT EXISTS game_result (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  session_id VARCHAR(36) NOT NULL,
  game_type ENUM('VOCABULARY_RAIN','KANJI_FRUIT') NOT NULL,
  title VARCHAR(255) NOT NULL,
  correct_count INT UNSIGNED NOT NULL,
  total_count INT UNSIGNED NOT NULL,
  coin_awarded INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_game_result_user_session (user_id, session_id),
  KEY idx_game_result_user_created (user_id, created_at),
  CONSTRAINT fk_game_result_user FOREIGN KEY (user_id) REFERENCES user_account (id),
  CHECK (total_count > 0),
  CHECK (correct_count <= total_count),
  CHECK (coin_awarded = correct_count * 10)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
