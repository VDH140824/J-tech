-- =========================================================
-- J-Tech Japanese Learning Website
-- Database schema for current backend foundation
-- Current scope: roles, users, profiles, Google OAuth2 authentication tokens,
-- refresh tokens, and login history.
-- Social modules such as posts, follows, chat, notifications,
-- documents, and history topics will be added in later migrations.
-- =========================================================

CREATE DATABASE IF NOT EXISTS jtech
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE jtech;

-- Existing non-destructive local database migration (run separately, do not rerun the schema):
-- ALTER TABLE users MODIFY COLUMN status ENUM('PENDING', 'ACTIVE', 'INACTIVE', 'LOCKED', 'BANNED') DEFAULT 'ACTIVE';

-- =========================================================
-- ROLES
-- =========================================================

CREATE TABLE roles (
    role_id BIGINT AUTO_INCREMENT PRIMARY KEY,

    role_name VARCHAR(30) NOT NULL UNIQUE,

    description VARCHAR(255),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);


-- =========================================================
-- USERS
-- =========================================================

CREATE TABLE users (
    user_id BIGINT AUTO_INCREMENT PRIMARY KEY,

    role_id BIGINT NOT NULL,

    username VARCHAR(50) NOT NULL UNIQUE,

    email VARCHAR(100) NOT NULL UNIQUE,

    phone VARCHAR(30) NULL UNIQUE,

    avatar_url VARCHAR(500),

    status ENUM(
        'PENDING',
        'ACTIVE',
        'INACTIVE',
        'LOCKED',
        'BANNED'
    ) DEFAULT 'ACTIVE',

    email_verified BOOLEAN DEFAULT FALSE,

    last_login DATETIME NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_users_role
        FOREIGN KEY (role_id)
        REFERENCES roles(role_id)
);


-- =========================================================
-- USER PROFILE
-- =========================================================

CREATE TABLE user_profiles (

    profile_id BIGINT AUTO_INCREMENT PRIMARY KEY,

    user_id BIGINT NOT NULL UNIQUE,

    full_name VARCHAR(100),

    birthday DATE,

    gender ENUM(
        'MALE',
        'FEMALE',
        'OTHER'
    ),

    country VARCHAR(100),

    bio TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_profile_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);


-- =========================================================
-- REFRESH TOKENS
-- =========================================================

CREATE TABLE refresh_tokens (

    token_id BIGINT AUTO_INCREMENT PRIMARY KEY,

    user_id BIGINT NOT NULL,

    token VARCHAR(512) NOT NULL,

    expires_at DATETIME NOT NULL,

    revoked BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_refresh_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);



-- =========================================================
-- LOGIN HISTORY
-- =========================================================

CREATE TABLE login_history (

    login_id BIGINT AUTO_INCREMENT PRIMARY KEY,

    user_id BIGINT NOT NULL,

    login_time DATETIME NOT NULL,

    logout_time DATETIME NULL,

    ip_address VARCHAR(45),

    device VARCHAR(255),

    browser VARCHAR(255),

    success BOOLEAN DEFAULT TRUE,

    CONSTRAINT fk_login_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);


-- =========================================================
-- DEFAULT ROLES
-- =========================================================

INSERT INTO roles (role_name, description)
VALUES
('ADMIN', 'System Administrator'),
('MODERATOR', 'Content Moderator'),
('USER', 'Normal User');


