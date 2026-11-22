CREATE TABLE IF NOT EXISTS learning_reminder_sent (
  user_id BIGINT UNSIGNED NOT NULL,
  reminder_date DATE NOT NULL,
  sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, reminder_date),
  CONSTRAINT fk_learning_reminder_user FOREIGN KEY (user_id) REFERENCES user_account(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
