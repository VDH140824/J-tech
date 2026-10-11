CREATE DATABASE IF NOT EXISTS jtech CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE jtech;


DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS user_account;
DROP TABLE IF EXISTS role;

CREATE TABLE role (
  id TINYINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255) NULL
) ENGINE=InnoDB;

CREATE TABLE user_account (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  role_id TINYINT UNSIGNED NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  google_sub VARCHAR(64) NULL UNIQUE,
  full_name VARCHAR(50) NULL,
  avatar_url VARCHAR(500) NULL,
  avatar_public_id VARCHAR(255) NULL,
  date_of_birth DATE NULL,
  status ENUM('PENDING','ACTIVE','REJECTED','LOCKED') NOT NULL DEFAULT 'PENDING',
  status_reason VARCHAR(500) NULL,
  coin_balance INT UNSIGNED NOT NULL DEFAULT 0,
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  created_by BIGINT UNSIGNED NULL,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_account_role FOREIGN KEY (role_id) REFERENCES role(id),
  CONSTRAINT fk_user_account_reviewer FOREIGN KEY (reviewed_by) REFERENCES user_account(id),
  CONSTRAINT fk_user_account_creator FOREIGN KEY (created_by) REFERENCES user_account(id)
) ENGINE=InnoDB;

CREATE TABLE refresh_tokens (
  token_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  token VARCHAR(512) NOT NULL,
  expires_at DATETIME NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_refresh_user FOREIGN KEY (user_id) REFERENCES user_account(id) ON DELETE CASCADE
);



INSERT INTO role (id, code, name, description) VALUES
(1, 'STUDENT', 'Học viên', 'Tài khoản học viên'),
(2, 'MODERATOR', 'Kiểm duyệt viên', 'Quản lý nội dung'),
(3, 'ADMIN', 'Quản trị viên', 'Quản trị hệ thống');
