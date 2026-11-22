-- =============================================================================
-- J-TECH DATABASE SCHEMA (MYSQL 8.0+)
-- Tổng số bảng: 37 bảng theo Phần III của tài liệu thiết kế J-Tech
-- Charset: utf8mb4 / Collation: utf8mb4_unicode_ci / Engine: InnoDB
-- Hãy sao lưu dữ liệu trước khi chạy nếu database đang có dữ liệu cần giữ.
-- =============================================================================
-- DROP DATABASE jtech
CREATE DATABASE IF NOT EXISTS jtech CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE jtech;

SET FOREIGN_KEY_CHECKS = 0;

-- NHÓM 8: THÔNG BÁO VÀ QUẢN TRỊ HỆ THỐNG
DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS system_setting;
DROP TABLE IF EXISTS notification;

-- NHÓM 7: THEO DÕI HỌC TẬP VÀ PHẢN HỒI
DROP TABLE IF EXISTS feedback;
DROP TABLE IF EXISTS study_session;
DROP TABLE IF EXISTS learning_item_progress;

-- NHÓM 6: LỚP HỌC
DROP TABLE IF EXISTS class_post_comment;
DROP TABLE IF EXISTS class_post;
DROP TABLE IF EXISTS classroom_member;
DROP TABLE IF EXISTS classroom;

-- NHÓM 5: GAME, XU VÀ CỬA HÀNG
DROP TABLE IF EXISTS flashcard_progress;
DROP TABLE IF EXISTS user_inventory;
DROP TABLE IF EXISTS store_item;
DROP TABLE IF EXISTS coin_transaction;
DROP TABLE IF EXISTS game_session;
DROP TABLE IF EXISTS game;

-- NHÓM 4: CÂU HỎI, BÀI TẬP, KIỂM TRA VÀ TIẾN ĐỘ
DROP TABLE IF EXISTS speaking_session;
DROP TABLE IF EXISTS reading_session;
DROP TABLE IF EXISTS lesson_section_progress;
DROP TABLE IF EXISTS practice_attempt;
DROP TABLE IF EXISTS test_attempt;
DROP TABLE IF EXISTS test_question;
DROP TABLE IF EXISTS test;
DROP TABLE IF EXISTS question;

-- NHÓM 3: ĐỌC – NGHE – NÓI
DROP TABLE IF EXISTS speaking_scenario;
DROP TABLE IF EXISTS listening_exercise;
DROP TABLE IF EXISTS reading_passage;

-- NHÓM 2: CẤU TRÚC NỘI DUNG HỌC TẬP
DROP TABLE IF EXISTS conjugation_form;
DROP TABLE IF EXISTS kanji;
DROP TABLE IF EXISTS vocabulary;
DROP TABLE IF EXISTS grammar;
DROP TABLE IF EXISTS lesson;
DROP TABLE IF EXISTS chapter;
DROP TABLE IF EXISTS course;

-- NHÓM 1: TÀI KHOẢN VÀ PHÂN QUYỀN
DROP TABLE IF EXISTS refresh_token;
DROP TABLE IF EXISTS user_account;
DROP TABLE IF EXISTS role;

SET FOREIGN_KEY_CHECKS = 1;


-- =============================================================================
-- NHÓM 1: TÀI KHOẢN VÀ PHÂN QUYỀN
-- =============================================================================

CREATE TABLE role (
  id TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(50) NOT NULL,
  description VARCHAR(255) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_role_code (code),
  UNIQUE KEY uq_role_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_account (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  role_id TINYINT UNSIGNED NOT NULL,
  email VARCHAR(255) NOT NULL,
  google_sub VARCHAR(64) NULL,
  full_name VARCHAR(50) NULL,
  avatar_url VARCHAR(500) NULL,
  avatar_public_id VARCHAR(255) NULL,
  date_of_birth DATE NULL,
  status ENUM('PENDING','ACTIVE','REJECTED','LOCKED') NOT NULL DEFAULT 'PENDING',
  status_reason VARCHAR(500) NULL,
  coin_balance INT UNSIGNED NOT NULL DEFAULT 0,
  current_streak INT UNSIGNED NOT NULL DEFAULT 0,
  longest_streak INT UNSIGNED NOT NULL DEFAULT 0,
  last_study_date DATE NULL DEFAULT NULL,
  reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_time TIME NOT NULL DEFAULT '20:00:00',
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  created_by BIGINT UNSIGNED NULL,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_account_email (email),
  UNIQUE KEY uq_user_account_google_sub (google_sub),
  FOREIGN KEY (role_id) REFERENCES role (id),
  FOREIGN KEY (reviewed_by) REFERENCES user_account (id),
  FOREIGN KEY (created_by) REFERENCES user_account (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE refresh_token (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token VARCHAR(512) NOT NULL,
  expires_at DATETIME NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_refresh_token_token (token),
  FOREIGN KEY (user_id) REFERENCES user_account (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- NHÓM 2: CẤU TRÚC NỘI DUNG HỌC TẬP
-- =============================================================================

CREATE TABLE course (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT NULL,
  thumbnail_url VARCHAR(500) NULL,
  thumbnail_public_id VARCHAR(255) NULL,
  display_order INT NOT NULL DEFAULT 0,
  status ENUM('DRAFT','PUBLISHED','HIDDEN','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  deleted_at DATETIME NULL DEFAULT NULL,
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_course_code (code),
  FOREIGN KEY (created_by) REFERENCES user_account (id),
  FOREIGN KEY (updated_by) REFERENCES user_account (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE chapter (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  course_id BIGINT UNSIGNED NOT NULL,
  chapter_no SMALLINT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NULL,
  display_order INT NOT NULL DEFAULT 0,
  status ENUM('DRAFT','PUBLISHED','HIDDEN','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_chapter_course_no (course_id,chapter_no),
  FOREIGN KEY (course_id) REFERENCES course (id),
  FOREIGN KEY (created_by) REFERENCES user_account (id),
  FOREIGN KEY (updated_by) REFERENCES user_account (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lesson (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  chapter_id BIGINT UNSIGNED NOT NULL,
  skill_type ENUM('KANJI','VOCABULARY','GRAMMAR','LISTENING','READING'),
  lesson_no SMALLINT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NULL,
  documents JSON NULL DEFAULT NULL,
  display_order INT NOT NULL DEFAULT 0,
  status ENUM('DRAFT','PUBLISHED','HIDDEN','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_lesson_chapter_id (chapter_id),
  KEY idx_lesson_chapter_skill_no (chapter_id,skill_type,lesson_no),
  FOREIGN KEY (chapter_id) REFERENCES chapter (id),
  FOREIGN KEY (created_by) REFERENCES user_account (id),
  FOREIGN KEY (updated_by) REFERENCES user_account (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE grammar (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  lesson_id BIGINT UNSIGNED NOT NULL,
  structure_name VARCHAR(150) NOT NULL,
  meaning_vi VARCHAR(255) NOT NULL,
  usage_explanation TEXT NOT NULL,
  example_jp TEXT NOT NULL,
  example_vi TEXT NOT NULL,
  video_url VARCHAR(500) NULL,
  video_public_id VARCHAR(255) NULL,
  video_duration_sec INT UNSIGNED NULL,
  display_order INT NOT NULL DEFAULT 0,
  status ENUM('DRAFT','PUBLISHED','HIDDEN','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (lesson_id) REFERENCES lesson (id),
  FOREIGN KEY (created_by) REFERENCES user_account (id),
  FOREIGN KEY (updated_by) REFERENCES user_account (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE vocabulary (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  lesson_id BIGINT UNSIGNED NOT NULL,
  word VARCHAR(100) NOT NULL,
  reading VARCHAR(100) NOT NULL,
  meaning_vi VARCHAR(255) NOT NULL,
  word_type VARCHAR(50) NULL,
  example_jp VARCHAR(500) NULL,
  example_vi VARCHAR(500) NULL,
  display_order INT NOT NULL DEFAULT 0,
  status ENUM('DRAFT','PUBLISHED','HIDDEN','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (lesson_id) REFERENCES lesson (id),
  FOREIGN KEY (created_by) REFERENCES user_account (id),
  FOREIGN KEY (updated_by) REFERENCES user_account (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE kanji (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  lesson_id BIGINT UNSIGNED NOT NULL,
  character_text VARCHAR(10) NOT NULL,
  sino_vietnamese VARCHAR(50) NULL,
  onyomi VARCHAR(100) NULL,
  kunyomi VARCHAR(100) NULL,
  meaning_vi VARCHAR(255) NOT NULL,
  examples TEXT NULL,
  image_url VARCHAR(500) NULL,
  image_public_id VARCHAR(255) NULL,
  mnemonic_story TEXT NULL,
  display_order INT NOT NULL DEFAULT 0,
  status ENUM('DRAFT','PUBLISHED','HIDDEN','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (lesson_id) REFERENCES lesson (id),
  FOREIGN KEY (created_by) REFERENCES user_account (id),
  FOREIGN KEY (updated_by) REFERENCES user_account (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE conjugation_form (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(30) NOT NULL,
  name_vi VARCHAR(100) NOT NULL,
  name_jp VARCHAR(100) NOT NULL,
  description TEXT NULL,
  material_content MEDIUMTEXT NOT NULL,
  questions_per_practice SMALLINT UNSIGNED NOT NULL DEFAULT 10,
  display_order INT NOT NULL DEFAULT 0,
  status ENUM('DRAFT','PUBLISHED','HIDDEN','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_conjugation_form_code (code),
  FOREIGN KEY (created_by) REFERENCES user_account (id),
  FOREIGN KEY (updated_by) REFERENCES user_account (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- NHÓM 3: ĐỌC – NGHE – NÓI
-- =============================================================================

CREATE TABLE reading_passage (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  chapter_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  content_jp MEDIUMTEXT NOT NULL,
  translation_vi MEDIUMTEXT NULL,
  display_order INT NOT NULL DEFAULT 0,
  status ENUM('DRAFT','PUBLISHED','HIDDEN','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (chapter_id) REFERENCES chapter (id),
  FOREIGN KEY (created_by) REFERENCES user_account (id),
  FOREIGN KEY (updated_by) REFERENCES user_account (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE listening_exercise (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  chapter_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  video_url VARCHAR(500) NOT NULL,
  video_public_id VARCHAR(255) NOT NULL,
  video_duration_sec INT UNSIGNED NULL,
  script_jp MEDIUMTEXT NOT NULL,
  script_vi MEDIUMTEXT NULL,
  display_order INT NOT NULL DEFAULT 0,
  status ENUM('DRAFT','PUBLISHED','HIDDEN','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (chapter_id) REFERENCES chapter (id),
  FOREIGN KEY (created_by) REFERENCES user_account (id),
  FOREIGN KEY (updated_by) REFERENCES user_account (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE speaking_scenario (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  chapter_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  situation TEXT NOT NULL,
  ai_role VARCHAR(100) NOT NULL,
  student_role VARCHAR(100) NOT NULL,
  max_turns TINYINT UNSIGNED NOT NULL DEFAULT 20,
  sample_script JSON NULL DEFAULT NULL,
  display_order INT NOT NULL DEFAULT 0,
  status ENUM('DRAFT','PUBLISHED','HIDDEN','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (chapter_id) REFERENCES chapter (id),
  FOREIGN KEY (created_by) REFERENCES user_account (id),
  FOREIGN KEY (updated_by) REFERENCES user_account (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- NHÓM 4: CÂU HỎI, BÀI TẬP, KIỂM TRA VÀ TIẾN ĐỘ
-- =============================================================================

CREATE TABLE question (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  skill ENUM('VOCABULARY','KANJI','GRAMMAR','LISTENING','CONJUGATION') NOT NULL,
  question_type ENUM('MCQ','FILL_IN','MATCHING') NOT NULL,
  lesson_id BIGINT UNSIGNED NULL,
  grammar_id BIGINT UNSIGNED NULL,
  listening_exercise_id BIGINT UNSIGNED NULL,
  conjugation_form_id BIGINT UNSIGNED NULL,
  content TEXT NOT NULL,
  media_url VARCHAR(500) NULL,
  media_public_id VARCHAR(255) NULL,
  explanation TEXT NULL,
  answer_data JSON NOT NULL,
  difficulty ENUM('EASY','MEDIUM','HARD') NOT NULL DEFAULT 'EASY',
  is_exercise_question BOOLEAN NOT NULL DEFAULT TRUE,
  display_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('ACTIVE','ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_question_difficulty (difficulty),
  KEY idx_question_grammar (grammar_id, skill, status, display_order),
  CONSTRAINT fk_question_grammar FOREIGN KEY (grammar_id) REFERENCES grammar (id) ON DELETE SET NULL,
  FOREIGN KEY (lesson_id) REFERENCES lesson (id),
  FOREIGN KEY (listening_exercise_id) REFERENCES listening_exercise (id),
  FOREIGN KEY (conjugation_form_id) REFERENCES conjugation_form (id),
  FOREIGN KEY (created_by) REFERENCES user_account (id),
  FOREIGN KEY (updated_by) REFERENCES user_account (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE test (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  test_type ENUM('MINI_TEST','LESSON_TEST','CHAPTER_TEST') NOT NULL,
  skill ENUM('VOCABULARY','KANJI','GRAMMAR','ALL') NOT NULL DEFAULT 'ALL',
  lesson_id BIGINT UNSIGNED NULL,
  chapter_id BIGINT UNSIGNED NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NULL,
  duration_minutes SMALLINT UNSIGNED NOT NULL,
  passing_score DECIMAL(5,2) NOT NULL,
  part_config JSON NULL DEFAULT NULL,
  status ENUM('DRAFT','PUBLISHED','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (lesson_id) REFERENCES lesson (id),
  FOREIGN KEY (chapter_id) REFERENCES chapter (id),
  FOREIGN KEY (created_by) REFERENCES user_account (id),
  FOREIGN KEY (updated_by) REFERENCES user_account (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE test_question (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  test_id BIGINT UNSIGNED NOT NULL,
  question_id BIGINT UNSIGNED NOT NULL,
  part_type ENUM('VOCABULARY','KANJI','GRAMMAR') NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_test_question (test_id,question_id),
  FOREIGN KEY (test_id) REFERENCES test (id),
  FOREIGN KEY (question_id) REFERENCES question (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE test_attempt (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  test_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  attempt_no INT UNSIGNED NOT NULL DEFAULT 1,
  difficulty_level ENUM('EASY','MEDIUM','HARD','MIXED') NULL DEFAULT NULL,
  content_version VARCHAR(64) NOT NULL DEFAULT '1',
  status ENUM('IN_PROGRESS','SUBMITTED','AUTO_SUBMITTED') NOT NULL DEFAULT 'IN_PROGRESS',
  current_question_index SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  time_spent_sec INT UNSIGNED NOT NULL DEFAULT 0,
  total_questions SMALLINT UNSIGNED NOT NULL,
  correct_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  score DECIMAL(5,2) NULL DEFAULT NULL,
  part_scores JSON NULL DEFAULT NULL,
  answers_data JSON NOT NULL,
  is_passed BOOLEAN NULL DEFAULT NULL,
  coin_awarded INT UNSIGNED NOT NULL DEFAULT 0,
  started_at DATETIME NOT NULL,
  deadline_at DATETIME NOT NULL,
  last_saved_at DATETIME NULL DEFAULT NULL,
  submitted_at DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (test_id) REFERENCES test (id),
  FOREIGN KEY (user_id) REFERENCES user_account (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE practice_attempt (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  activity_type ENUM('LESSON_EXERCISE','LISTENING','CONJUGATION') NOT NULL,
  lesson_id BIGINT UNSIGNED NULL,
  skill ENUM('VOCABULARY','KANJI','GRAMMAR','LISTENING','CONJUGATION') NOT NULL,
  difficulty_level ENUM('EASY','MEDIUM','HARD','MIXED') NULL DEFAULT 'EASY',
  listening_exercise_id BIGINT UNSIGNED NULL,
  conjugation_form_id BIGINT UNSIGNED NULL,
  attempt_no INT UNSIGNED NOT NULL DEFAULT 1,
  status ENUM('IN_PROGRESS','COMPLETED','ABANDONED') NOT NULL DEFAULT 'IN_PROGRESS',
  current_question_index SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  time_spent_sec INT UNSIGNED NOT NULL DEFAULT 0,
  total_questions SMALLINT UNSIGNED NOT NULL,
  correct_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  score DECIMAL(5,2) NULL DEFAULT NULL,
  coin_awarded INT UNSIGNED NOT NULL DEFAULT 0,
  answers_data JSON NOT NULL,
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_saved_at DATETIME NULL DEFAULT NULL,
  submitted_at DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_practice_attempt_status (status),
  FOREIGN KEY (user_id) REFERENCES user_account (id),
  FOREIGN KEY (lesson_id) REFERENCES lesson (id),
  FOREIGN KEY (listening_exercise_id) REFERENCES listening_exercise (id),
  FOREIGN KEY (conjugation_form_id) REFERENCES conjugation_form (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lesson_section_progress (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  lesson_id BIGINT UNSIGNED NOT NULL,
  section_type ENUM('VOCABULARY','KANJI','GRAMMAR') NOT NULL,
  document_viewed_at DATETIME NULL DEFAULT NULL,
  video_completed_at DATETIME NULL DEFAULT NULL,
  exercise_completed_at DATETIME NULL DEFAULT NULL,
  completed_at DATETIME NULL DEFAULT NULL,
  best_exercise_score DECIMAL(5,2) NULL DEFAULT NULL,
  level_progress JSON NULL DEFAULT NULL,
  updated_at DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_lesson_section_user (user_id,lesson_id,section_type),
  FOREIGN KEY (user_id) REFERENCES user_account (id),
  FOREIGN KEY (lesson_id) REFERENCES lesson (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE reading_session (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  reading_passage_id BIGINT UNSIGNED NOT NULL,
  status ENUM('GENERATED','SUBMITTED','FAILED') NOT NULL DEFAULT 'GENERATED',
  total_questions SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  correct_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  questions_data JSON NOT NULL,
  input_tokens INT UNSIGNED NOT NULL DEFAULT 0,
  output_tokens INT UNSIGNED NOT NULL DEFAULT 0,
  coin_awarded INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  submitted_at DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES user_account (id),
  FOREIGN KEY (reading_passage_id) REFERENCES reading_passage (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE speaking_session (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  scenario_id BIGINT UNSIGNED NOT NULL,
  status ENUM('IN_PROGRESS','COMPLETED','ABANDONED','FAILED') NOT NULL DEFAULT 'IN_PROGRESS',
  turn_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  overall_feedback TEXT NULL DEFAULT NULL,
  turns_data JSON NULL DEFAULT NULL,
  input_tokens INT UNSIGNED NOT NULL DEFAULT 0,
  output_tokens INT UNSIGNED NOT NULL DEFAULT 0,
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES user_account (id),
  FOREIGN KEY (scenario_id) REFERENCES speaking_scenario (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- NHÓM 5: GAME, XU VÀ CỬA HÀNG
-- =============================================================================

CREATE TABLE game (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  supported_content SET('VOCABULARY','KANJI','GRAMMAR') NOT NULL,
  questions_per_session SMALLINT UNSIGNED NOT NULL DEFAULT 10,
  time_limit_sec INT UNSIGNED NULL DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by BIGINT UNSIGNED NULL,
  updated_at DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_game_code (code),
  FOREIGN KEY (updated_by) REFERENCES user_account (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE game_session (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  game_id BIGINT UNSIGNED NOT NULL,
  scope_type ENUM('LESSON','CHAPTER','ALL') NOT NULL,
  lesson_id BIGINT UNSIGNED NULL,
  chapter_id BIGINT UNSIGNED NULL,
  content_type ENUM('VOCABULARY','KANJI','GRAMMAR','MIXED') NOT NULL,
  status ENUM('IN_PROGRESS','COMPLETED','ABANDONED') NOT NULL DEFAULT 'IN_PROGRESS',
  score INT UNSIGNED NOT NULL DEFAULT 0,
  correct_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  total_questions SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  answers_data JSON NULL DEFAULT NULL,
  coin_awarded INT UNSIGNED NOT NULL DEFAULT 0,
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES user_account (id),
  FOREIGN KEY (game_id) REFERENCES game (id),
  FOREIGN KEY (lesson_id) REFERENCES lesson (id),
  FOREIGN KEY (chapter_id) REFERENCES chapter (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE coin_transaction (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  direction ENUM('EARN','SPEND','ADJUST') NOT NULL,
  amount INT UNSIGNED NOT NULL,
  balance_after INT UNSIGNED NOT NULL,
  source_type ENUM('TEST','PRACTICE','GAME','STORE','ADMIN','STREAK','OTHER') NOT NULL,
  source_ref_id BIGINT UNSIGNED NULL DEFAULT NULL,
  award_key VARCHAR(120) NULL DEFAULT NULL,
  description VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_coin_transaction_award_key (award_key),
  FOREIGN KEY (user_id) REFERENCES user_account (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE store_item (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_type ENUM('BADGE','AVATAR_FRAME','THEME','AVATAR') NOT NULL,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(500) NULL,
  image_url VARCHAR(500) NOT NULL,
  image_public_id VARCHAR(255) NOT NULL,
  theme_config JSON NULL DEFAULT NULL,
  coin_price INT UNSIGNED NOT NULL,
  status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (created_by) REFERENCES user_account (id),
  FOREIGN KEY (updated_by) REFERENCES user_account (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_inventory (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  store_item_id BIGINT UNSIGNED NOT NULL,
  coin_transaction_id BIGINT UNSIGNED NOT NULL,
  is_equipped BOOLEAN NOT NULL DEFAULT FALSE,
  acquired_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES user_account (id),
  FOREIGN KEY (store_item_id) REFERENCES store_item (id),
  FOREIGN KEY (coin_transaction_id) REFERENCES coin_transaction (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE flashcard_progress (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  vocabulary_id BIGINT UNSIGNED NULL,
  kanji_id BIGINT UNSIGNED NULL,
  flip_status ENUM('NOT_REMEMBERED','REMEMBERED') NULL DEFAULT NULL,
  srs_state ENUM('NEW','LEARNING','REVIEW') NOT NULL DEFAULT 'NEW',
  ease_factor DECIMAL(4,2) NOT NULL DEFAULT 2.50,
  interval_days INT UNSIGNED NOT NULL DEFAULT 0,
  repetition_count INT UNSIGNED NOT NULL DEFAULT 0,
  due_at DATETIME NULL DEFAULT NULL,
  last_reviewed_at DATETIME NULL DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (id),
  CHECK ((vocabulary_id IS NOT NULL AND kanji_id IS NULL) OR (vocabulary_id IS NULL AND kanji_id IS NOT NULL)),
  UNIQUE KEY uq_flashcard_user_vocabulary (user_id,vocabulary_id),
  UNIQUE KEY uq_flashcard_user_kanji (user_id,kanji_id),
  FOREIGN KEY (user_id) REFERENCES user_account (id),
  FOREIGN KEY (vocabulary_id) REFERENCES vocabulary (id),
  FOREIGN KEY (kanji_id) REFERENCES kanji (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- NHÓM 6: LỚP HỌC
-- =============================================================================

CREATE TABLE classroom (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(30) NOT NULL,
  moderator_id BIGINT UNSIGNED NOT NULL,
  description TEXT NULL DEFAULT NULL,
  status ENUM('ACTIVE','ARCHIVED','CLOSED') NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_classroom_code (code),
  FOREIGN KEY (moderator_id) REFERENCES user_account (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE classroom_member (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  classroom_id BIGINT UNSIGNED NOT NULL,
  student_id BIGINT UNSIGNED NOT NULL,
  joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_classroom_student (classroom_id,student_id),
  FOREIGN KEY (classroom_id) REFERENCES classroom (id),
  FOREIGN KEY (student_id) REFERENCES user_account (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE class_post (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  classroom_id BIGINT UNSIGNED NOT NULL,
  author_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  attachment_url VARCHAR(500) NULL DEFAULT NULL,
  attachment_public_id VARCHAR(255) NULL DEFAULT NULL,
  due_at DATETIME NULL DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (classroom_id) REFERENCES classroom (id),
  FOREIGN KEY (author_id) REFERENCES user_account (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE class_post_comment (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  post_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  content TEXT NULL DEFAULT NULL,
  audio_url VARCHAR(500) NULL DEFAULT NULL,
  audio_public_id VARCHAR(255) NULL DEFAULT NULL,
  parent_id BIGINT UNSIGNED NULL DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (post_id) REFERENCES class_post (id),
  FOREIGN KEY (user_id) REFERENCES user_account (id),
  FOREIGN KEY (parent_id) REFERENCES class_post_comment (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- NHÓM 7: THEO DÕI HỌC TẬP VÀ PHẢN HỒI
-- =============================================================================

CREATE TABLE learning_item_progress (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  vocabulary_id BIGINT UNSIGNED NULL DEFAULT NULL,
  kanji_id BIGINT UNSIGNED NULL DEFAULT NULL,
  grammar_id BIGINT UNSIGNED NULL DEFAULT NULL,
  first_completed_at DATETIME NULL DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (id),
  CHECK ((vocabulary_id IS NOT NULL) + (kanji_id IS NOT NULL) + (grammar_id IS NOT NULL) = 1),
  UNIQUE KEY uq_progress_vocab (user_id,vocabulary_id),
  UNIQUE KEY uq_progress_kanji (user_id,kanji_id),
  UNIQUE KEY uq_progress_grammar (user_id,grammar_id),
  FOREIGN KEY (user_id) REFERENCES user_account (id),
  FOREIGN KEY (vocabulary_id) REFERENCES vocabulary (id),
  FOREIGN KEY (kanji_id) REFERENCES kanji (id),
  FOREIGN KEY (grammar_id) REFERENCES grammar (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE study_session (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  activity_key VARCHAR(64) NOT NULL,
  activity_type VARCHAR(30) NOT NULL,
  vocabulary_id BIGINT UNSIGNED NULL DEFAULT NULL,
  kanji_id BIGINT UNSIGNED NULL DEFAULT NULL,
  grammar_id BIGINT UNSIGNED NULL DEFAULT NULL,
  practice_attempt_id BIGINT UNSIGNED NULL DEFAULT NULL,
  test_attempt_id BIGINT UNSIGNED NULL DEFAULT NULL,
  reading_session_id BIGINT UNSIGNED NULL DEFAULT NULL,
  speaking_session_id BIGINT UNSIGNED NULL DEFAULT NULL,
  game_session_id BIGINT UNSIGNED NULL DEFAULT NULL,
  chapter_id BIGINT UNSIGNED NULL DEFAULT NULL,
  lesson_id BIGINT UNSIGNED NULL DEFAULT NULL,
  section_type ENUM('VOCABULARY','KANJI','GRAMMAR','READING','LISTENING','SPEAKING','GAME','TEST','PRACTICE') NULL DEFAULT NULL,
  study_date DATE NOT NULL,
  started_at DATETIME NOT NULL,
  last_active_at DATETIME NULL DEFAULT NULL,
  ended_at DATETIME NULL DEFAULT NULL,
  completed_at DATETIME NULL DEFAULT NULL,
  completion_data JSON NULL DEFAULT NULL,
  active_seconds INT UNSIGNED NOT NULL DEFAULT 0,
  is_qualified BOOLEAN NOT NULL DEFAULT FALSE,
  status ENUM('ACTIVE','COMPLETED','ABANDONED') NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_study_activity_key (user_id,activity_key),
  FOREIGN KEY (user_id) REFERENCES user_account (id),
  FOREIGN KEY (vocabulary_id) REFERENCES vocabulary (id),
  FOREIGN KEY (kanji_id) REFERENCES kanji (id),
  FOREIGN KEY (grammar_id) REFERENCES grammar (id),
  FOREIGN KEY (practice_attempt_id) REFERENCES practice_attempt (id),
  FOREIGN KEY (test_attempt_id) REFERENCES test_attempt (id),
  FOREIGN KEY (reading_session_id) REFERENCES reading_session (id),
  FOREIGN KEY (speaking_session_id) REFERENCES speaking_session (id),
  FOREIGN KEY (game_session_id) REFERENCES game_session (id),
  FOREIGN KEY (chapter_id) REFERENCES chapter (id),
  FOREIGN KEY (lesson_id) REFERENCES lesson (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE feedback (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  feedback_type ENUM('CONTENT','TECHNICAL') NOT NULL,
  category VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  lesson_id BIGINT UNSIGNED NULL DEFAULT NULL,
  question_id BIGINT UNSIGNED NULL DEFAULT NULL,
  attachment_url VARCHAR(500) NULL DEFAULT NULL,
  attachment_public_id VARCHAR(255) NULL DEFAULT NULL,
  status ENUM('PENDING','IN_PROGRESS','RESOLVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  handled_by BIGINT UNSIGNED NULL DEFAULT NULL,
  resolution_note TEXT NULL DEFAULT NULL,
  resolved_at DATETIME NULL DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES user_account (id),
  FOREIGN KEY (lesson_id) REFERENCES lesson (id),
  FOREIGN KEY (question_id) REFERENCES question (id),
  FOREIGN KEY (handled_by) REFERENCES user_account (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- NHÓM 8: THÔNG BÁO VÀ QUẢN TRỊ HỆ THỐNG
-- =============================================================================

CREATE TABLE notification (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  content VARCHAR(1000) NOT NULL,
  link_url VARCHAR(500) NULL DEFAULT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES user_account (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE system_setting (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT NULL DEFAULT NULL,
  is_secret BOOLEAN NOT NULL DEFAULT FALSE,
  description VARCHAR(255) NULL DEFAULT NULL,
  updated_by BIGINT UNSIGNED NULL,
  updated_at DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_system_setting_setting_key (setting_key),
  FOREIGN KEY (updated_by) REFERENCES user_account (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE audit_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL DEFAULT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NULL DEFAULT NULL,
  entity_id BIGINT UNSIGNED NULL DEFAULT NULL,
  level ENUM('INFO','WARNING','ERROR') NOT NULL DEFAULT 'INFO',
  detail JSON NULL DEFAULT NULL,
  ip_address VARCHAR(45) NULL DEFAULT NULL,
  user_agent VARCHAR(255) NULL DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES user_account (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====INSERT DATA===
-- DỮ LIỆU KHỞI TẠO VÀ NỘI DUNG HỌC TẬP JPD113 / JPD123
-- Nguồn: Tu_vung_JPD113_JPD123.docx
-- Nguồn: Tong_hop_kanji_Nhat_Bai_1_2_3_4_5_6_7.docx
-- Nguồn: Tong_hop_ngu_phap_Nhat_Bai_1_2_3.docx
-- Nguồn: Tong_hop_ngu_phap_Nhat_Bai_4_5_6_7.docx
-- JPD113: chapter 1-3; JPD123: chapter 4-7. Mỗi mẫu ngữ pháp là 1 lesson GRAMMAR riêng.
-- Ngữ pháp trong mỗi chapter chia đều thành 3 nhóm lesson_no = 1, 2, 3 theo display_order.
-- Số mẫu trong Bài 1/2/3: chapter 1 = 3/3/2; 2 = 6/6/6; 3 = 5/5/4;
-- chapter 4 = 7/7/7; 5 = 6/6/5; 6 = 5/5/5; 7 = 5/5/5.
-- Tổng cộng: 2 course, 7 chapter, 122 lesson (7 kanji, 7 từ vựng, 108 ngữ pháp), 77 kanji, 260 vocabulary, 108 grammar.
-- Các INSERT dùng mã course, chapter_no và skill_type để tìm liên kết; không gán cứng ID.
-- vocabulary.reading giữ cách viết trong tài liệu vì không có cột cách đọc riêng.
-- grammar.structure_name = công thức; meaning_vi = tên/công dụng của mẫu.
-- grammar.usage_explanation giữ mô tả và Slot từ tài liệu, không bổ sung quy tắc mới.
-- Quy ước ngữ pháp: N = danh từ; V = động từ; A = tính từ; N1/N2 = các danh từ.
-- Ví dụ kanji đầy đủ dùng từng dòng: từ tiếng Nhật | cách đọc | nghĩa tiếng Việt.
-- Giữ nguyên ví dụ/ghi chú chưa đủ thành phần; bỏ tên file slide lẫn trong ví dụ chữ 京.
-- Thứ tự nội dung tính từ 1 trong từng lesson. Nội dung học được PUBLISHED.
-- Ảnh, video, câu chuyện ghi nhớ và tài liệu đính kèm không có nguồn để mặc định NULL.

INSERT INTO role (id, code, name, description) VALUES
  (1, 'STUDENT', 'Học viên', 'Tài khoản học viên'),
  (2, 'MODERATOR', 'Kiểm duyệt viên', 'Quản lý nội dung'),
  (3, 'ADMIN', 'Quản trị viên', 'Quản trị hệ thống');

INSERT INTO course (code, name, description, display_order, status) VALUES
  ('JPD113', 'Nhật 1', 'Môn Nhật 1. Bài 1, 2, 3.', 1, 'PUBLISHED'),
  ('JPD123', 'Nhật 2', 'Môn Nhật 2. Bài 4, 5, 6, 7.', 2, 'PUBLISHED');

INSERT INTO chapter (course_id, chapter_no, title, description, display_order, status)
SELECT c.id, seed.chapter_no, seed.title, seed.description, seed.display_order, seed.status
FROM (
    SELECT 'JPD113' AS course_code, 1 AS chapter_no, 'Chương 1: はじめまして' AS title, 'Các Slot: 9, 10 và 13  •  Giới thiệu bản thân, nghề nghiệp, sở thích' AS description, 1 AS display_order, 'PUBLISHED' AS status
    UNION ALL
    SELECT 'JPD113', 2, 'Chương 2: 買い物・食事', 'Các Slot: 17, 18, 19, 20, 21 và 22  •  Hỏi vị trí, mua sắm, gọi món', 2, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD113', 3, 'Chương 3: スケジュール', 'Các Slot: 24, 26, 27, 28 và 29  •  Thời gian, kế hoạch, thói quen', 3, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 4, 'Chương 4: 私の国・町', 'Các Slot: 1–32 đến 5–36  •  Vị trí, tính từ, miêu tả địa điểm và thời tiết', 1, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 5, 'Chương 5: 休みの日', 'Các Slot: 8–39 đến 13–44  •  Quá khứ, cảm nhận, lý do và mong muốn', 2, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 6, 'Chương 6: 一緒に！', 'Các Slot: 16–46 đến 20–50  •  Rủ rê, hẹn gặp và so sánh', 3, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 7, 'Chương 7: 友達の家で', 'Các Slot: 23–53 đến 27–57  •  Vị trí, thể て, yêu cầu và giúp đỡ', 4, 'PUBLISHED'
) AS seed
JOIN course AS c ON c.code = seed.course_code;

INSERT INTO lesson (chapter_id, skill_type, lesson_no, title, description, display_order, status)
SELECT ch.id, seed.skill_type, seed.lesson_no, seed.title, seed.description, seed.display_order, seed.status
FROM (
    SELECT 'JPD113' AS course_code, 1 AS chapter_no, 'KANJI' AS skill_type, 1 AS lesson_no, 'Kanji bài 1' AS title, '9 kanji. Slot 12. Nguồn: Tong_hop_kanji_Nhat_Bai_1_2_3_4_5_6_7.docx.' AS description, 1 AS display_order, 'PUBLISHED' AS status
    UNION ALL
    SELECT 'JPD113', 1, 'VOCABULARY', 1, 'Từ vựng bài 1', '27 mục từ vựng. Nguồn: Tu_vung_JPD113_JPD123.docx.', 2, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD113', 2, 'KANJI', 1, 'Kanji bài 2', '14 kanji. Slot 18. Nguồn: Tong_hop_kanji_Nhat_Bai_1_2_3_4_5_6_7.docx.', 1, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD113', 2, 'VOCABULARY', 1, 'Từ vựng bài 2', '39 mục từ vựng. Nguồn: Tu_vung_JPD113_JPD123.docx.', 2, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD113', 3, 'KANJI', 1, 'Kanji bài 3', '12 kanji. Slot 25. Nguồn: Tong_hop_kanji_Nhat_Bai_1_2_3_4_5_6_7.docx.', 1, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD113', 3, 'VOCABULARY', 1, 'Từ vựng bài 3', '37 mục từ vựng. Nguồn: Tu_vung_JPD113_JPD123.docx.', 2, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 4, 'KANJI', 1, 'Kanji bài 4', '9 kanji. Slot 4. Nguồn: Tong_hop_kanji_Nhat_Bai_1_2_3_4_5_6_7.docx.', 1, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 4, 'VOCABULARY', 1, 'Từ vựng bài 4', '48 mục từ vựng. Nguồn: Tu_vung_JPD113_JPD123.docx.', 2, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 5, 'KANJI', 1, 'Kanji bài 5', '12 kanji. Slot 5. Nguồn: Tong_hop_kanji_Nhat_Bai_1_2_3_4_5_6_7.docx.', 1, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 5, 'VOCABULARY', 1, 'Từ vựng bài 5', '40 mục từ vựng. Nguồn: Tu_vung_JPD113_JPD123.docx.', 2, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 6, 'KANJI', 1, 'Kanji bài 6', '14 kanji. Slot 19. Nguồn: Tong_hop_kanji_Nhat_Bai_1_2_3_4_5_6_7.docx.', 1, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 6, 'VOCABULARY', 1, 'Từ vựng bài 6', '24 mục từ vựng. Nguồn: Tu_vung_JPD113_JPD123.docx.', 2, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 7, 'KANJI', 1, 'Kanji bài 7', '7 kanji. Slot 26. Nguồn: Tong_hop_kanji_Nhat_Bai_1_2_3_4_5_6_7.docx.', 1, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 7, 'VOCABULARY', 1, 'Từ vựng bài 7', '45 mục từ vựng. Nguồn: Tu_vung_JPD113_JPD123.docx.', 2, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD113', 1, 'GRAMMAR', 1, 'Câu khẳng định danh từ', 'Công thức: N1 は N2 です。 Slot 9.', 1, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD113', 1, 'GRAMMAR', 1, 'Hỏi quốc gia, quê quán', 'Công thức: おくには どちらですか。 Slot 9.', 2, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD113', 1, 'GRAMMAR', 1, 'Câu phủ định danh từ', 'Công thức: N1 は N2 じゃありません。 Slot 10.', 3, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD113', 1, 'GRAMMAR', 2, 'Câu nghi vấn danh từ', 'Công thức: N1 は N2 ですか。 Slot 10.', 4, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD113', 1, 'GRAMMAR', 2, 'Trợ từ の – quan hệ sở thuộc', 'Công thức: N1 は N2 の N3 です。 Slot 10.', 5, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD113', 1, 'GRAMMAR', 2, 'Hỏi cái gì, sự việc gì', 'Công thức: N は なんですか。 Slot 13.', 6, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD113', 1, 'GRAMMAR', 3, 'Trợ từ と – liệt kê đầy đủ', 'Công thức: N1 と N2 Slot 13.', 7, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD113', 1, 'GRAMMAR', 3, 'Trợ từ も – cũng', 'Công thức: N1 は N2 です。N3 も N2 です。 Slot 13.', 8, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD113', 2, 'GRAMMAR', 1, 'Nói vị trí tầng', 'Công thức: N は số + かいです。 Slot 17.', 1, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD113', 2, 'GRAMMAR', 1, 'Hỏi tầng', 'Công thức: N は なんかいですか。 Slot 17.', 2, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD113', 2, 'GRAMMAR', 1, 'Chỉ vị trí', 'Công thức: N は ここ／そこ／あそこです。 Slot 18.', 3, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD113', 2, 'GRAMMAR', 1, 'Hỏi vị trí', 'Công thức: N は どこですか。 Slot 18.', 4, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD113', 2, 'GRAMMAR', 1, 'Giới thiệu địa điểm', 'Công thức: ここ／そこ／あそこ は N です。 Slot 18.', 5, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD113', 2, 'GRAMMAR', 1, 'Chỉ phương hướng lịch sự', 'Công thức: N は こちら／そちら／あちらです。 Slot 18.', 6, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD113', 2, 'GRAMMAR', 2, 'Hỏi vị trí lịch sự', 'Công thức: N は どちらですか。 Slot 18.', 7, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD113', 2, 'GRAMMAR', 2, 'Đại từ chỉ thị', 'Công thức: これ／それ／あれ は N です。 Slot 19.', 8, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD113', 2, 'GRAMMAR', 2, 'Hỏi giá tiền', 'Công thức: N は いくらですか。 Slot 19.', 9, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD113', 2, 'GRAMMAR', 2, 'Hỏi tên đồ vật', 'Công thức: これは なんですか。 Slot 19.', 10, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD113', 2, 'GRAMMAR', 2, 'Từ chỉ thị bổ nghĩa danh từ', 'Công thức: この／その／あの + N Slot 19.', 11, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD113', 2, 'GRAMMAR', 2, 'Yêu cầu lấy hoặc mua đồ', 'Công thức: N を ください。 Slot 20.', 12, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD113', 2, 'GRAMMAR', 3, 'Trợ từ の – nguyên liệu', 'Công thức: N1 の N2 Slot 21.', 13, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD113', 2, 'GRAMMAR', 3, 'Hỏi nguyên liệu', 'Công thức: N1 は なんの N2 ですか。 Slot 21.', 14, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD113', 2, 'GRAMMAR', 3, 'Hỏi từ trong ngôn ngữ khác', 'Công thức: N は ～ごで なんですか。 Slot 21.', 15, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD113', 2, 'GRAMMAR', 3, 'Trợ từ の – nguồn gốc, xuất xứ', 'Công thức: N1 の N2 Slot 21.', 16, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD113', 2, 'GRAMMAR', 3, 'Yêu cầu số lượng', 'Công thức: N を số lượng (～つ) ください。 Slot 21.', 17, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD113', 2, 'GRAMMAR', 3, 'Trợ từ の – sở hữu, hỏi của ai', 'Công thức: N1 の N2／だれの N2 ですか。 Slot 22.', 18, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD113', 3, 'GRAMMAR', 1, 'Hỏi giờ', 'Công thức: いま なんじですか。 Slot 24.', 1, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD113', 3, 'GRAMMAR', 1, 'Chỉ khoảng thời gian', 'Công thức: N は thời gian 1 から thời gian 2 までです。 Slot 24.', 2, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD113', 3, 'GRAMMAR', 1, 'Hỏi thời điểm', 'Công thức: N は いつですか。 Slot 24.', 3, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD113', 3, 'GRAMMAR', 1, 'Động từ khẳng định dạng ます', 'Công thức: N は Vます。 Slot 26.', 4, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD113', 3, 'GRAMMAR', 1, 'Trợ từ を – đối tượng tác động', 'Công thức: N を Vます。 Slot 26.', 5, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD113', 3, 'GRAMMAR', 2, 'Trợ từ へ – hướng di chuyển', 'Công thức: Địa điểm へ いきます／かえります。 Slot 26.', 6, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD113', 3, 'GRAMMAR', 2, 'Động từ phủ định', 'Công thức: Vます → Vません。 Slot 27.', 7, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD113', 3, 'GRAMMAR', 2, 'Trợ từ で – nơi diễn ra hành động', 'Công thức: Địa điểm で N を Vます。 Slot 27.', 8, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD113', 3, 'GRAMMAR', 2, 'Thời gian chỉ thói quen', 'Công thức: まいにち／まいあさ／まいばん + Vます。 Slot 28.', 9, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD113', 3, 'GRAMMAR', 2, 'Trợ từ や～など – liệt kê mở', 'Công thức: N1 や N2 など Slot 28.', 10, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD113', 3, 'GRAMMAR', 3, 'Phủ định hoàn toàn với なにも', 'Công thức: なにも Vません。 Slot 28.', 11, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD113', 3, 'GRAMMAR', 3, 'Trợ từ に – mốc thời gian', 'Công thức: Thời gian に Vます。 Slot 28.', 12, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD113', 3, 'GRAMMAR', 3, 'Khoảng thời gian làm hành động', 'Công thức: Thời gian 1 から thời gian 2 まで Vます。 Slot 29.', 13, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD113', 3, 'GRAMMAR', 3, 'Phủ định hoàn toàn với どこも', 'Công thức: どこ（へ）も いきません。 Slot 29.', 14, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 4, 'GRAMMAR', 1, 'Nói vị trí theo phương hướng', 'Công thức: N1 は N2 の + phương hướng + です。 Slot 1–32.', 1, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 4, 'GRAMMAR', 1, 'Hỏi vị trí trong một quốc gia', 'Công thức: N のどこですか。 Slot 1–32.', 2, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 4, 'GRAMMAR', 1, 'Hỏi thời gian di chuyển', 'Công thức: N1 から N2 までどのくらいですか。 Slot 1–32.', 3, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 4, 'GRAMMAR', 1, 'Nói thời gian di chuyển', 'Công thức: N1 から N2 まで + thời gian + くらいです。 Slot 1–32.', 4, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 4, 'GRAMMAR', 1, 'Trợ từ で chỉ phương tiện', 'Công thức: Phương tiện で Vます。 Slot 1–32.', 5, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 4, 'GRAMMAR', 1, 'Tính từ い – khẳng định', 'Công thức: N は Aいです。 Slot 3–34.', 6, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 4, 'GRAMMAR', 1, 'Tính từ な – khẳng định', 'Công thức: N は Aな (bỏ な) です。 Slot 3–34.', 7, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 4, 'GRAMMAR', 2, 'Tính từ い – phủ định', 'Công thức: Aい → Aくないです。 Slot 3–34.', 8, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 4, 'GRAMMAR', 2, 'Tính từ な – phủ định', 'Công thức: Aな → Aじゃありません。 Slot 3–34.', 9, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 4, 'GRAMMAR', 2, 'Tính từ い bổ nghĩa danh từ', 'Công thức: Aい + N Slot 3–34.', 10, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 4, 'GRAMMAR', 2, 'Tính từ な bổ nghĩa danh từ', 'Công thức: Aな (gốc từ) + な + N Slot 3–34.', 11, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 4, 'GRAMMAR', 2, 'Hỏi đặc điểm', 'Công thức: N はどんな N ですか。 Slot 3–34.', 12, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 4, 'GRAMMAR', 2, 'Diễn tả nhiều hoặc ít', 'Công thức: N が多い／少ないです。 Slot 3–34.', 13, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 4, 'GRAMMAR', 2, 'Sự tồn tại của đồ vật', 'Công thức: Địa điểm に N があります。 Slot 4–35.', 14, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 4, 'GRAMMAR', 3, 'Nối hai câu cùng hướng ý nghĩa', 'Công thức: S1。そして、S2。 Slot 4–35.', 15, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 4, 'GRAMMAR', 3, 'Nối hai ý tương phản', 'Công thức: S1 が、S2。 Slot 4–35.', 16, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 4, 'GRAMMAR', 3, 'Trợ từ cuối câu ね', 'Công thức: S + ね。 Slot 5–36.', 17, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 4, 'GRAMMAR', 3, 'Miêu tả thời tiết theo thời gian', 'Công thức: N は thời gian、Aです。 Slot 5–36.', 18, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 4, 'GRAMMAR', 3, 'Diễn tả mức độ rất hoặc hơi', 'Công thức: とても／少し + A Slot 5–36.', 19, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 4, 'GRAMMAR', 3, 'Phủ định mức độ', 'Công thức: あまり + A phủ định Slot 5–36.', 20, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 4, 'GRAMMAR', 3, 'Hỏi cảm nhận, đặc điểm', 'Công thức: N はどうですか。 Slot 5–36.', 21, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 5, 'GRAMMAR', 1, 'Động từ quá khứ khẳng định', 'Công thức: Vます → Vました。 Slot 8–39.', 1, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 5, 'GRAMMAR', 1, 'Động từ quá khứ phủ định', 'Công thức: Vません → Vませんでした。 Slot 8–39.', 2, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 5, 'GRAMMAR', 1, 'Diễn tả đi đâu đó', 'Công thức: どこか（へ）Vます／Vましたか。 Slot 8–39.', 3, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 5, 'GRAMMAR', 1, 'Làm hành động cùng ai', 'Công thức: Người と Vます／Vました。 Slot 8–39.', 4, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 5, 'GRAMMAR', 1, 'Nối các hành động theo trình tự', 'Công thức: S1。それから、S2。 Slot 9–40.', 5, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 5, 'GRAMMAR', 1, 'Tính từ い – quá khứ khẳng định', 'Công thức: Aい → Aかったです。 Slot 10–41.', 6, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 5, 'GRAMMAR', 2, 'Tính từ い – quá khứ phủ định', 'Công thức: Aい → Aくなかったです。 Slot 10–41.', 7, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 5, 'GRAMMAR', 2, 'Tính từ な – quá khứ khẳng định', 'Công thức: Aな → Aでした。 Slot 10–41.', 8, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 5, 'GRAMMAR', 2, 'Tính từ な – quá khứ phủ định', 'Công thức: Aな → Aじゃありませんでした。 Slot 10–41.', 9, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 5, 'GRAMMAR', 2, 'Danh từ – quá khứ', 'Công thức: Nでした／Nじゃありませんでした。 Slot 10–41.', 10, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 5, 'GRAMMAR', 2, 'Hỏi cảm nhận trong quá khứ', 'Công thức: N はどうでしたか。 Slot 10–41.', 11, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 5, 'GRAMMAR', 2, 'Hỏi và giải thích nguyên nhân', 'Công thức: どうして～か。／Lý do + から。 Slot 11–42.', 12, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 5, 'GRAMMAR', 3, 'Mong muốn sở hữu', 'Công thức: N がほしいです。 Slot 12–43.', 13, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 5, 'GRAMMAR', 3, 'Phủ định mong muốn sở hữu', 'Công thức: N がほしくないです。 Slot 12–43.', 14, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 5, 'GRAMMAR', 3, 'Thích hoặc ghét', 'Công thức: N が好き／嫌いです。 Slot 12–43.', 15, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 5, 'GRAMMAR', 3, 'Muốn thực hiện hành động', 'Công thức: Vます bỏ ます + たいです。 Slot 12–43.', 16, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 5, 'GRAMMAR', 3, 'Đi đến đâu để thực hiện hành động', 'Công thức: Địa điểm へ + Vます bỏ ます + に行きます。 Slot 13–44.', 17, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 6, 'GRAMMAR', 1, 'Rủ rê, mời người khác', 'Công thức: Vます → Vませんか。 Slot 16–46.', 1, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 6, 'GRAMMAR', 1, 'Đề nghị cùng làm hành động', 'Công thức: Vます → Vましょう。 Slot 16–46.', 2, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 6, 'GRAMMAR', 1, 'Từ chối lời mời lịch sự', 'Công thức: Thời gian はちょっと……。 Slot 16–46.', 3, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 6, 'GRAMMAR', 1, 'Diễn tả sự kiện ở địa điểm', 'Công thức: Địa điểm で Sự kiện があります。 Slot 17–47.', 4, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 6, 'GRAMMAR', 1, 'Trợ số từ 枚（まい）', 'Công thức: N が số + 枚 あります。 Slot 17–47.', 5, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 6, 'GRAMMAR', 2, 'So sánh nhất trong một nhóm', 'Công thức: N1 で N2 がいちばん Aです。 Slot 18–48.', 6, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 6, 'GRAMMAR', 2, 'Hỏi so sánh giữa hai đối tượng', 'Công thức: N1 と N2 とどちらが Aですか。 Slot 18–48.', 7, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 6, 'GRAMMAR', 2, 'Trả lời so sánh hơn', 'Công thức: N のほうが Aです。 Slot 18–48.', 8, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 6, 'GRAMMAR', 2, 'Cả hai đều có cùng đặc điểm', 'Công thức: どちらも Aです。 Slot 18–48.', 9, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 6, 'GRAMMAR', 2, 'So sánh hơn với より', 'Công thức: N1 は N2 より Aです。 Slot 19–49.', 10, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 6, 'GRAMMAR', 3, 'Hỏi đã làm hành động chưa', 'Công thức: もう Vましたか。 Slot 20–50.', 11, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 6, 'GRAMMAR', 3, 'Trả lời chưa thực hiện hành động', 'Công thức: いいえ、まだです。 Slot 20–50.', 12, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 6, 'GRAMMAR', 3, 'Trợ từ よ – thông báo, nhấn mạnh', 'Công thức: S + よ。 Slot 20–50.', 13, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 6, 'GRAMMAR', 3, 'Đưa ra lời gợi ý', 'Công thức: N はどうですか。 Slot 20–50.', 14, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 6, 'GRAMMAR', 3, 'Trợ từ ね – xác nhận thông tin', 'Công thức: S + ね。 Slot 20–50.', 15, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 7, 'GRAMMAR', 1, 'Sự tồn tại của người, động vật', 'Công thức: Địa điểm に N がいます。 Slot 23–53.', 1, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 7, 'GRAMMAR', 1, 'Nói vị trí tồn tại', 'Công thức: N は địa điểm にあります／います。 Slot 23–53.', 2, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 7, 'GRAMMAR', 1, 'Nói vị trí tương đối', 'Công thức: N1 は N2 の + vị trí + にあります／います。 Slot 23–53.', 3, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 7, 'GRAMMAR', 1, 'Phủ định hoàn toàn với だれも', 'Công thức: だれもいません。 Slot 24–54.', 4, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 7, 'GRAMMAR', 1, 'Phủ định hoàn toàn với なにも', 'Công thức: なにもありません。 Slot 24–54.', 5, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 7, 'GRAMMAR', 2, 'Chuyển động từ sang thể て', 'Công thức: Vます → Vて Slot 25–55.', 6, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 7, 'GRAMMAR', 2, 'Yêu cầu, nhờ vả lịch sự', 'Công thức: Vてください。 Slot 25–55.', 7, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 7, 'GRAMMAR', 2, 'Trợ từ で chỉ công cụ, cách thức', 'Công thức: Công cụ で Vます／Vてください。 Slot 25–55.', 8, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 7, 'GRAMMAR', 2, 'Diễn tả cách làm việc gì', 'Công thức: Vます bỏ ます + 方（かた） Slot 26–56.', 9, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 7, 'GRAMMAR', 2, 'Hỏi danh từ nào', 'Công thức: どの + N ですか。 Slot 26–56.', 10, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 7, 'GRAMMAR', 3, 'Hỏi cái nào', 'Công thức: どれですか。 Slot 26–56.', 11, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 7, 'GRAMMAR', 3, 'Hành động đang diễn ra', 'Công thức: Vています。 Slot 27–57.', 12, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 7, 'GRAMMAR', 3, 'Chủ động đề nghị giúp đỡ', 'Công thức: Vます → Vましょうか。 Slot 27–57.', 13, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 7, 'GRAMMAR', 3, 'Hỏi ai thực hiện hành động', 'Công thức: だれが Vましたか。 Slot 27–57.', 14, 'PUBLISHED'
    UNION ALL
    SELECT 'JPD123', 7, 'GRAMMAR', 3, 'Diễn tả vẫn còn hoặc đã hết', 'Công thức: まだあります／もうありません。 Slot 27–57.', 15, 'PUBLISHED'
) AS seed
JOIN course AS c ON c.code = seed.course_code
JOIN chapter AS ch ON ch.course_id = c.id AND ch.chapter_no = seed.chapter_no;

-- =============================================================================
-- KANJI
-- =============================================================================

-- JPD113 / Chapter 1 / Kanji: 9 mục.
INSERT INTO kanji (lesson_id, character_text, sino_vietnamese, onyomi, kunyomi, meaning_vi, examples, display_order, status)
SELECT l.id, seed.character_text, seed.sino_vietnamese, seed.onyomi, seed.kunyomi, seed.meaning_vi, seed.examples, seed.display_order, seed.status
FROM (
    SELECT '私' AS character_text, 'Tư' AS sino_vietnamese, 'し' AS onyomi, 'わたし' AS kunyomi, 'Tôi, riêng tư' AS meaning_vi, '私 | わたし | Tôi' AS examples, 1 AS display_order, 'PUBLISHED' AS status
    UNION ALL
    SELECT '人', 'Nhân', 'にん / じん', 'ひと', 'Người', '３人 | さんにん | 3 người
タイ人 | タイじん | Người Thái', 2, 'PUBLISHED'
    UNION ALL
    SELECT '才', 'Tài', 'さい', NULL, 'Giỏi, tài năng, tuổi', '１才 | いっさい | 1 tuổi
２５才 | にじゅうごさい | 25 tuổi', 3, 'PUBLISHED'
    UNION ALL
    SELECT '学', 'Học', 'がく', NULL, 'Khoa học, dạy dỗ', '大学 | だいがく | Đại học', 4, 'PUBLISHED'
    UNION ALL
    SELECT '生', 'Sinh', 'せい', NULL, 'Sinh sống, sản xuất', '学生 | がくせい | Học sinh
大学生 | だいがくせい | sinh viên đại học
先生 | せんせい | Giáo viên', 5, 'PUBLISHED'
    UNION ALL
    SELECT '校', 'Hiệu', 'こう', NULL, 'Trường học', '学校 (がっこう)', 6, 'PUBLISHED'
    UNION ALL
    SELECT '日', 'Nhật', 'にち / じつ', 'ひ', 'Ngày, mặt trời', '日 | ひ | Ngày
３日 | みっか | Ngày mùng 3
１１日 | じゅういちにち | Ngày 11', 7, 'PUBLISHED'
    UNION ALL
    SELECT '本', 'Bản', 'ほん', NULL, 'Sách, gốc', '本 | ほん | Sách
日本 | にほん | Nhật Bản
日本人 | にほんじん | Người Nhật', 8, 'PUBLISHED'
    UNION ALL
    SELECT '語', 'Ngữ', 'ご', NULL, 'Ngôn ngữ, từ', '日本語 | にほんご | Tiếng nhật
ベトナム語 | ベトナムご | Tiếng Việt', 9, 'PUBLISHED'
) AS seed
JOIN course AS c ON c.code = 'JPD113'
JOIN chapter AS ch ON ch.course_id = c.id AND ch.chapter_no = 1
JOIN lesson AS l ON l.chapter_id = ch.id AND l.skill_type = 'KANJI' AND l.lesson_no = 1;

-- JPD113 / Chapter 2 / Kanji: 14 mục.
INSERT INTO kanji (lesson_id, character_text, sino_vietnamese, onyomi, kunyomi, meaning_vi, examples, display_order, status)
SELECT l.id, seed.character_text, seed.sino_vietnamese, seed.onyomi, seed.kunyomi, seed.meaning_vi, seed.examples, seed.display_order, seed.status
FROM (
    SELECT '一' AS character_text, 'Nhất' AS sino_vietnamese, 'いち' AS onyomi, 'ひと・つ' AS kunyomi, 'Một' AS meaning_vi, '一月 | いちがつ | Tháng 1
一日 | ついたち / いちにち | Mồng 1 / 1 ngày
一人 | ひとり | 1 người
一才 | いっさい | 1 tuổi' AS examples, 1 AS display_order, 'PUBLISHED' AS status
    UNION ALL
    SELECT '二', 'Nhị', 'に', 'ふた・つ', 'Hai', '二月 | にがつ | Tháng 2
二日 | ふつか | Mồng 2 (hoặc 2 ngày)
二人 | ふたり | 2 người', 2, 'PUBLISHED'
    UNION ALL
    SELECT '三', 'Tam', 'さん', 'みっ・つ', 'Ba', '三月 | さんがつ | Tháng 3
三日 | みっか | Mồng 3 (hoặc 3 ngày)
三人 | さんにん | 3 người', 3, 'PUBLISHED'
    UNION ALL
    SELECT '四', 'Tứ', 'し', 'よん, よっ・つ', 'Bốn', '四月 | しがつ | Tháng 4
四日 | よっか | Mồng 4 (hoặc 4 ngày)
四人 | よにん | 4 người', 4, 'PUBLISHED'
    UNION ALL
    SELECT '五', 'Ngũ', 'ご', 'いつ・つ', 'Năm', '五月 | ごがつ | Tháng 5
五日 | いつか | Mồng 5 (hoặc 5 ngày)
五人 | ごにん | 5 người', 5, 'PUBLISHED'
    UNION ALL
    SELECT '六', 'Lục', 'ろく', 'むっ・つ', 'Sáu', '六月 | ろくがつ | Tháng 6
六日 | むいか | Mồng 6 (hoặc 6 ngày)
六人 | ろくにん | 6 người', 6, 'PUBLISHED'
    UNION ALL
    SELECT '七', 'Thất', 'しち', 'なな・つ', 'Bảy', '七月 | しちがつ | Tháng 7
七日 | なのか | Mồng 7 (hoặc 7 ngày)
七人 | ななにん | 7 người', 7, 'PUBLISHED'
    UNION ALL
    SELECT '八', 'Bát', 'はち', 'やっ・つ', 'Tám', '八月 | はちがつ | Tháng 8
八日 | ようか | Mồng 8 (hoặc 8 ngày)
八人 | はちにん | 8 người', 8, 'PUBLISHED'
    UNION ALL
    SELECT '九', 'Cửu', 'きゅう / く', 'ここの・つ', 'Chín', '九月 | くがつ | Tháng 9
九日 | ここのか | Mồng 9 (hoặc 9 ngày)
九人 | きゅうにん | 9 người', 9, 'PUBLISHED'
    UNION ALL
    SELECT '十', 'Thập', 'じゅう', 'とお', 'Mười', '十月 | じゅうがつ | Tháng 10
十日 | とおか | Mồng 10 (hoặc 10 ngày)
十人 | じゅうにん | 10 người', 10, 'PUBLISHED'
    UNION ALL
    SELECT '百', 'Bách', 'ひゃく', NULL, 'Trăm', '三百 | さんびゃく | 300
六百 | ろっぴゃく | 600
八百 | はっぴゃく | 800
百人 | ひゃくにん | 100 người', 11, 'PUBLISHED'
    UNION ALL
    SELECT '千', 'Thiên', 'せん', NULL, 'Nghìn, ngàn', '三千 | さんぜん | 3.000
八千 | はっせん | 8.000
千人 | せんにん | 1.000 người', 12, 'PUBLISHED'
    UNION ALL
    SELECT '万', 'Vạn', 'まん', NULL, 'Mười nghìn, vạn', '一万 | いちまん | 10.000 (1 vạn)
百万 | ひゃくまん | 1.000.000 (1 triệu)
一千万 | いっせんまん | 10.000.000 (10 triệu)', 13, 'PUBLISHED'
    UNION ALL
    SELECT '円', 'Viên / Tròn', 'えん', NULL, 'Yên (tiền Nhật), tròn', '百円 | ひゃくえん | 100 yên
千円 | せんえん | 1.000 yên
一万円 | いちまんえん | 10.000 yên', 14, 'PUBLISHED'
) AS seed
JOIN course AS c ON c.code = 'JPD113'
JOIN chapter AS ch ON ch.course_id = c.id AND ch.chapter_no = 2
JOIN lesson AS l ON l.chapter_id = ch.id AND l.skill_type = 'KANJI' AND l.lesson_no = 1;

-- JPD113 / Chapter 3 / Kanji: 12 mục.
INSERT INTO kanji (lesson_id, character_text, sino_vietnamese, onyomi, kunyomi, meaning_vi, examples, display_order, status)
SELECT l.id, seed.character_text, seed.sino_vietnamese, seed.onyomi, seed.kunyomi, seed.meaning_vi, seed.examples, seed.display_order, seed.status
FROM (
    SELECT '月' AS character_text, 'Nguyệt' AS sino_vietnamese, 'がつ / げつ' AS onyomi, 'つき' AS kunyomi, 'Ánh trăng, tháng' AS meaning_vi, '一月 | いちがつ | Tháng 1' AS examples, 1 AS display_order, 'PUBLISHED' AS status
    UNION ALL
    SELECT '火', 'Hỏa', 'か', 'ひ', 'Lửa', '火 | ひ | Lửa', 2, 'PUBLISHED'
    UNION ALL
    SELECT '水', 'Thủy', 'すい', 'みず', 'Nước', '水 | みず | Nước', 3, 'PUBLISHED'
    UNION ALL
    SELECT '木', 'Mộc', 'もく', 'き', 'Cây, gỗ', '木 | き | Cây, gỗ', 4, 'PUBLISHED'
    UNION ALL
    SELECT '金', 'Kim', 'きん', 'かね', 'Tiền, vàng', 'お金 | おかね | Tiền
金 | きん | Vàng', 5, 'PUBLISHED'
    UNION ALL
    SELECT '土', 'Thổ', 'ど', 'つち', 'Đất đai', '土 | つち | Đất', 6, 'PUBLISHED'
    UNION ALL
    SELECT '曜', 'Diệu', 'よう', NULL, 'Ngày', '月曜日 | げつようび | Thứ Hai
火曜日 | かようび | Thứ Ba
水曜日 | すいようび | Thứ Tư
木曜日 | もくようび | Thứ Năm
金曜日 | きんようび | Thứ Sáu
土曜日 | どようび | Thứ Bảy
日曜日 | にちようび | Chủ Nhật', 7, 'PUBLISHED'
    UNION ALL
    SELECT '何', 'Hà', 'か', 'なに', 'Cái gì', '何曜日 | なんようび | Thứ mấy
何月 | なんがつ | Tháng mấy
何日 | なんにち | Mấy ngày / Ngày mấy
何才 | なんさい | Mấy tuổi', 8, 'PUBLISHED'
    UNION ALL
    SELECT '年', 'Niên', 'ねん', 'とし', 'Năm, tuổi', '一年 | いちねん | 1 năm
四年 | よねん | 4 năm
何年 | なんねん | Mấy năm
何年生 | なんねんせい | Học sinh năm mấy / Khối mấy
生年月日 | せいねんがっぴ | Ngày tháng năm sinh', 9, 'PUBLISHED'
    UNION ALL
    SELECT '時', 'Thời', 'じ', 'とき', 'Giờ, thời gian', '四時 | よじ | 4 giờ
何時 | なんじ | Mấy giờ', 10, 'PUBLISHED'
    UNION ALL
    SELECT '間', 'Gian', 'かん / けん', 'あいだ', 'Trung gian, ở giữa', '時間 | じかん | Thời gian
人間 | にんげん | Con người', 11, 'PUBLISHED'
    UNION ALL
    SELECT '分', 'Phân', 'ぶん / ふん', 'わ・かります', 'Phút, phân chia, hiểu biết', '三分 | さんぷん | 3 phút
何分 | なんぷん | Mấy phút
分かります | わかります | Hiểu', 12, 'PUBLISHED'
) AS seed
JOIN course AS c ON c.code = 'JPD113'
JOIN chapter AS ch ON ch.course_id = c.id AND ch.chapter_no = 3
JOIN lesson AS l ON l.chapter_id = ch.id AND l.skill_type = 'KANJI' AND l.lesson_no = 1;

-- JPD123 / Chapter 4 / Kanji: 9 mục.
INSERT INTO kanji (lesson_id, character_text, sino_vietnamese, onyomi, kunyomi, meaning_vi, examples, display_order, status)
SELECT l.id, seed.character_text, seed.sino_vietnamese, seed.onyomi, seed.kunyomi, seed.meaning_vi, seed.examples, seed.display_order, seed.status
FROM (
    SELECT '東' AS character_text, 'Đông' AS sino_vietnamese, 'とう' AS onyomi, 'ひがし' AS kunyomi, 'Hướng đông' AS meaning_vi, '東 | ひがし | Phía đông
東京 | とうきょう | Tokyo' AS examples, 1 AS display_order, 'PUBLISHED' AS status
    UNION ALL
    SELECT '京', 'Kinh', 'きょう', NULL, 'Kinh đô, kinh thành', '東京 | とうきょう | Tokyo', 2, 'PUBLISHED'
    UNION ALL
    SELECT '名', 'Danh', 'めい', 'な', 'Tên, nổi tiếng, danh dự', '名前 | なまえ | Tên', 3, 'PUBLISHED'
    UNION ALL
    SELECT '前', 'Tiền', 'ぜん', 'まえ', 'Trước, phía trước', '前 | まえ | Phía trước / trước
名前 | なまえ | Tên
前日 | ぜんじつ | Ngày hôm trước
午前 | ごぜん | Buổi sáng (AM)', 4, 'PUBLISHED'
    UNION ALL
    SELECT '国', 'Quốc', 'こく', 'くに', 'Đất nước', '国 | くに | Đất nước
外国 | がいこく | Nước ngoài', 5, 'PUBLISHED'
    UNION ALL
    SELECT '男', 'Nam', 'だん', 'おとこ', 'Đàn ông, con trai', '男 | おとこ | Đàn ông
男の人 | おとこのひと | Người đàn ông', 6, 'PUBLISHED'
    UNION ALL
    SELECT '女', 'Nữ', 'じょ', 'おんな', 'Phụ nữ, con gái', '女 | おんな | Phụ nữ
女の人 | おんなのひと | Người phụ nữ
男女 | だんじょ | Nam nữ', 7, 'PUBLISHED'
    UNION ALL
    SELECT '区', 'Khu', 'く', NULL, 'Vùng, quận', '～区 | ~く | Quận ~', 8, 'PUBLISHED'
    UNION ALL
    SELECT '市', 'Thị', 'し', NULL, 'Chợ, thành phố', '～市 | ~し | Thành phố ~', 9, 'PUBLISHED'
) AS seed
JOIN course AS c ON c.code = 'JPD123'
JOIN chapter AS ch ON ch.course_id = c.id AND ch.chapter_no = 4
JOIN lesson AS l ON l.chapter_id = ch.id AND l.skill_type = 'KANJI' AND l.lesson_no = 1;

-- JPD123 / Chapter 5 / Kanji: 12 mục.
INSERT INTO kanji (lesson_id, character_text, sino_vietnamese, onyomi, kunyomi, meaning_vi, examples, display_order, status)
SELECT l.id, seed.character_text, seed.sino_vietnamese, seed.onyomi, seed.kunyomi, seed.meaning_vi, seed.examples, seed.display_order, seed.status
FROM (
    SELECT '先' AS character_text, 'Tiên' AS sino_vietnamese, 'せん' AS onyomi, 'さき' AS kunyomi, 'Trước' AS meaning_vi, '先生 | せんせい | Giáo viên
先月 | せんげつ | Tháng trước
先日 | せんじつ | Hôm trước' AS examples, 1 AS display_order, 'PUBLISHED' AS status
    UNION ALL
    SELECT '週', 'Chu', 'しゅう', NULL, 'Tuần', '先週 | せんしゅう | Tuần trước
一週間 | いっしゅうかん | 1 tuần', 2, 'PUBLISHED'
    UNION ALL
    SELECT '毎', 'Mỗi', 'まい', NULL, 'Các, mỗi, một', '毎日 | まいにち | Mỗi ngày
毎週 | まいしゅう | Mỗi tuần
毎月 | まいつき | Mỗi tháng
毎年 | まいとし | Mỗi năm', 3, 'PUBLISHED'
    UNION ALL
    SELECT '午', 'Ngọ', 'ご', NULL, 'Buổi trưa', '午前 | ごぜん | Buổi sáng (AM)', 4, 'PUBLISHED'
    UNION ALL
    SELECT '後', 'Hậu', 'ご, ぜん', 'うしろ, あと', 'Sau', '午後 | ごご | Buổi chiều (PM)
前後 | ぜんご | Trước sau', 5, 'PUBLISHED'
    UNION ALL
    SELECT '見', 'Kiến', 'けん', 'み・ます', 'Nhìn, xem, ngắm', '見学 | けんがく | Kiến học / Tham quan học tập', 6, 'PUBLISHED'
    UNION ALL
    SELECT '食', 'Thực', 'しょく', 'た・べます', 'Ăn', '食事 | しょくじ | Bữa ăn', 7, 'PUBLISHED'
    UNION ALL
    SELECT '飲', 'Ẩm', 'いん', 'の・みます', 'Uống', '飲食 | いんしょく | Ăn uống
飲み水 | のみみず | Nước uống', 8, 'PUBLISHED'
    UNION ALL
    SELECT '買', 'Mãi', 'ばい', 'か・います', 'Mua sắm', '(Chữ Hán chỉ hành động mua sắm)', 9, 'PUBLISHED'
    UNION ALL
    SELECT '物', 'Vật', 'ぶつ / もつ', 'もの', 'Đồ vật, động vật', '買い物 | かいもの | Mua sắm
食べ物 | たべもの | Đồ ăn
飲み物 | のみもの | Thức uống
人物 | じんぶつ | Nhân vật
見物 | けんぶつ | Tham quan, ngắm cảnh', 10, 'PUBLISHED'
    UNION ALL
    SELECT '行', 'Hành', 'こう', 'い・きます', 'Đi', '(Chữ Hán chỉ hành động di chuyển)', 11, 'PUBLISHED'
    UNION ALL
    SELECT '休', 'Hưu', 'きゅう', 'やす・み, やす・みます', 'Nghỉ ngơi', '休日 | きゅうじつ | Ngày nghỉ
休みの日 | やすみのひ | Ngày nghỉ', 12, 'PUBLISHED'
) AS seed
JOIN course AS c ON c.code = 'JPD123'
JOIN chapter AS ch ON ch.course_id = c.id AND ch.chapter_no = 5
JOIN lesson AS l ON l.chapter_id = ch.id AND l.skill_type = 'KANJI' AND l.lesson_no = 1;

-- JPD123 / Chapter 6 / Kanji: 14 mục.
INSERT INTO kanji (lesson_id, character_text, sino_vietnamese, onyomi, kunyomi, meaning_vi, examples, display_order, status)
SELECT l.id, seed.character_text, seed.sino_vietnamese, seed.onyomi, seed.kunyomi, seed.meaning_vi, seed.examples, seed.display_order, seed.status
FROM (
    SELECT '来' AS character_text, 'Lai' AS sino_vietnamese, 'らい' AS onyomi, 'き・ます' AS kunyomi, 'Đến, tương lai' AS meaning_vi, '来週 | らいしゅう | Tuần sau
来月 | らいげつ | Tháng sau
来年 | らいねん | Năm sau
来日 | らいにち | Đến Nhật' AS examples, 1 AS display_order, 'PUBLISHED' AS status
    UNION ALL
    SELECT '帰', 'Quy', 'き', 'かえ・ります', 'Trở về', '日帰り | ひがえり | Đi về trong ngày
帰国 | きこく | Về nước', 2, 'PUBLISHED'
    UNION ALL
    SELECT '会', 'Hội', 'かい', 'あ・います', 'Gặp gỡ, xã hội', '飲み会 | のみかい | Buổi nhậu / Tiệc rượu
国会 | こっかい | Quốc hội
会見 | かいけん | Buổi họp báo / Gặp mặt phỏng vấn', 3, 'PUBLISHED'
    UNION ALL
    SELECT '社', 'Xã', 'しゃ', NULL, 'Công ty, đền thần đạo', '会社 | かいしゃ | Công ty
社会 | しゃかい | Xã hội', 4, 'PUBLISHED'
    UNION ALL
    SELECT '聞', 'Văn', 'ぶん', 'き・きます', 'Nghe', '新聞 | しんぶん | Báo', 5, 'PUBLISHED'
    UNION ALL
    SELECT '読', 'Độc', 'どく', 'よ・みます', 'Đọc', '読み物 | よみもの | Tài liệu đọc / Thú đọc sách
読書 | どくしょ | Đọc sách', 6, 'PUBLISHED'
    UNION ALL
    SELECT '書', 'Thư', 'しょ', 'か・きます', 'Viết', '読書 | どくしょ | Đọc sách
辞書 | じしょ | Từ điển
書き物 | かきもの | Văn bản / Đồ viết', 7, 'PUBLISHED'
    UNION ALL
    SELECT '話', 'Thoại', 'わ', 'はなし, は・します', 'Nói chuyện', '会話 | かいわ | Hội thoại
電話 | でんわ | Điện thoại', 8, 'PUBLISHED'
    UNION ALL
    SELECT '寺', 'Tự', 'じ', 'てら', 'Chùa', '(Chữ Hán chỉ ngôi chùa)', 9, 'PUBLISHED'
    UNION ALL
    SELECT '言', 'Ngôn', 'げん / ごん', 'い・います', 'Nói', '言葉 | ことば | Từ vựng / Tiếng nói
言語 | げんご | Ngôn ngữ', 10, 'PUBLISHED'
    UNION ALL
    SELECT '貝', 'Bối', NULL, 'かい', 'Con sò', '(Chữ Hán chỉ con sò)', 11, 'PUBLISHED'
    UNION ALL
    SELECT '田', 'Điền', 'でん', 'た', 'Ruộng', '田んぼ | たんぼ | Ruộng lúa
水田 | すいでん | Ruộng nước', 12, 'PUBLISHED'
    UNION ALL
    SELECT '力', 'Lực', 'りょく / りき', 'ちから', 'Sức lực', '水力 | すいりょく | Thủy lực (sức nước)
火力 | かりょく | Hỏa lực (sức lửa)', 13, 'PUBLISHED'
    UNION ALL
    SELECT '門', 'Môn', 'もん', NULL, 'Cánh cổng', '学校の門 | がっこうのもん | Cổng trường học
大学の門 | だいがくのもん | Cổng trường đại học', 14, 'PUBLISHED'
) AS seed
JOIN course AS c ON c.code = 'JPD123'
JOIN chapter AS ch ON ch.course_id = c.id AND ch.chapter_no = 6
JOIN lesson AS l ON l.chapter_id = ch.id AND l.skill_type = 'KANJI' AND l.lesson_no = 1;

-- JPD123 / Chapter 7 / Kanji: 7 mục.
INSERT INTO kanji (lesson_id, character_text, sino_vietnamese, onyomi, kunyomi, meaning_vi, examples, display_order, status)
SELECT l.id, seed.character_text, seed.sino_vietnamese, seed.onyomi, seed.kunyomi, seed.meaning_vi, seed.examples, seed.display_order, seed.status
FROM (
    SELECT '肉' AS character_text, 'Nhục' AS sino_vietnamese, 'にく' AS onyomi, NULL AS kunyomi, 'Thịt' AS meaning_vi, '牛肉 | ぎゅうにく | Thịt bò
豚肉 | ぶたにく | Thịt heo
鶏肉 | とりにく | Thịt gà' AS examples, 1 AS display_order, 'PUBLISHED' AS status
    UNION ALL
    SELECT '料', 'Liệu', 'りょう', NULL, 'Tài liệu, vật liệu, chi phí', '料金 | りょうきん | Tiền phí, cước phí', 2, 'PUBLISHED'
    UNION ALL
    SELECT '理', 'Lý', 'り', NULL, 'Lý luận, nguyên lý, lý do', '料理 | りょうり | Món ăn, nấu ăn', 3, 'PUBLISHED'
    UNION ALL
    SELECT '野', 'Dã', 'や', 'の', 'Đồng bằng, hoang dã', '野菜 | やさい | Rau
長野 | ながの | Nagano (tên địa danh)', 4, 'PUBLISHED'
    UNION ALL
    SELECT '半', 'Bán', 'はん', 'なか・ば', 'Nửa, nửa chừng', '一時半 | いちじはん | 1 giờ rưỡi
半分 | はんぶん | Một nửa
半日 | はんじつ / はんにち | Nửa ngày
半月 | はんつき | Nửa tháng
半年 | はんとし | Nửa năm', 5, 'PUBLISHED'
    UNION ALL
    SELECT '大', 'Đại', 'だい / たい', 'おお・きい', 'To lớn', '大学 | だいがく | Đại học
大人 | おとな | Người lớn
大学生 | だいがくせい | Sinh viên đại học
大会 | たいかい | Đại hội
大半 | たいはん | Phần lớn', 6, 'PUBLISHED'
    UNION ALL
    SELECT '小', 'Tiểu', 'しょう', 'ちい・さい', 'Nhỏ, bé', '小学校 | しょうがっこう | Trường tiểu học
小学生 | しょうがくせい | Học sinh tiểu học
小人 | こびと | Người lùn / trẻ em', 7, 'PUBLISHED'
) AS seed
JOIN course AS c ON c.code = 'JPD123'
JOIN chapter AS ch ON ch.course_id = c.id AND ch.chapter_no = 7
JOIN lesson AS l ON l.chapter_id = ch.id AND l.skill_type = 'KANJI' AND l.lesson_no = 1;

-- =============================================================================
-- TỪ VỰNG
-- =============================================================================

-- JPD113 / Chapter 1 / Từ vựng: 27 mục.
INSERT INTO vocabulary (lesson_id, word, reading, meaning_vi, word_type, example_jp, example_vi, display_order, status)
SELECT l.id, seed.word, seed.reading, seed.meaning_vi, seed.word_type, seed.example_jp, seed.example_vi, seed.display_order, seed.status
FROM (
    SELECT 'ベトナム' AS word, 'ベトナム' AS reading, 'Việt Nam' AS meaning_vi, 'Danh từ riêng' AS word_type, 'わたしはベトナムからきました。' AS example_jp, 'Tôi đến từ Việt Nam.' AS example_vi, 1 AS display_order, 'PUBLISHED' AS status
    UNION ALL
    SELECT 'にほん', 'にほん', 'Nhật Bản', 'Danh từ riêng', 'わたしはにほんからきました。', 'Tôi đến từ Nhật Bản.', 2, 'PUBLISHED'
    UNION ALL
    SELECT 'アメリカ', 'アメリカ', 'Mỹ', 'Danh từ riêng', 'わたしはアメリカからきました。', 'Tôi đến từ Mỹ.', 3, 'PUBLISHED'
    UNION ALL
    SELECT 'イタリア', 'イタリア', 'Ý', 'Danh từ riêng', 'わたしはイタリアからきました。', 'Tôi đến từ Ý.', 4, 'PUBLISHED'
    UNION ALL
    SELECT 'オーストラリア', 'オーストラリア', 'Úc', 'Danh từ riêng', 'わたしはオーストラリアからきました。', 'Tôi đến từ Úc.', 5, 'PUBLISHED'
    UNION ALL
    SELECT 'かんこく', 'かんこく', 'Hàn Quốc', 'Danh từ riêng', 'わたしはかんこくからきました。', 'Tôi đến từ Hàn Quốc.', 6, 'PUBLISHED'
    UNION ALL
    SELECT 'タイ', 'タイ', 'Thái Lan', 'Danh từ riêng', 'わたしはタイからきました。', 'Tôi đến từ Thái Lan.', 7, 'PUBLISHED'
    UNION ALL
    SELECT 'ちゅうごく', 'ちゅうごく', 'Trung Quốc', 'Danh từ riêng', 'わたしはちゅうごくからきました。', 'Tôi đến từ Trung Quốc.', 8, 'PUBLISHED'
    UNION ALL
    SELECT 'ロシア', 'ロシア', 'Nga', 'Danh từ riêng', 'わたしはロシアからきました。', 'Tôi đến từ Nga.', 9, 'PUBLISHED'
    UNION ALL
    SELECT 'こうこう', 'こうこう', 'trường trung học phổ thông', 'Danh từ', 'わたしはこうこうがすきです。', 'Tôi thích trường trung học phổ thông.', 10, 'PUBLISHED'
    UNION ALL
    SELECT 'だいがく', 'だいがく', 'trường đại học', 'Danh từ', 'わたしはだいがくがすきです。', 'Tôi thích trường đại học.', 11, 'PUBLISHED'
    UNION ALL
    SELECT 'にほんごがっこう', 'にほんごがっこう', 'trường tiếng Nhật', 'Danh từ', 'わたしはにほんごがっこうがすきです。', 'Tôi thích trường tiếng Nhật.', 12, 'PUBLISHED'
    UNION ALL
    SELECT 'がくせい', 'がくせい', 'học sinh, sinh viên', 'Danh từ', 'わたしはがくせいがすきです。', 'Tôi thích học sinh, sinh viên.', 13, 'PUBLISHED'
    UNION ALL
    SELECT 'せんせい', 'せんせい', 'giáo viên', 'Danh từ', 'わたしはせんせいがすきです。', 'Tôi thích giáo viên.', 14, 'PUBLISHED'
    UNION ALL
    SELECT 'きょうし', 'きょうし', 'giáo viên, nhà giáo', 'Danh từ', 'わたしはきょうしがすきです。', 'Tôi thích giáo viên, nhà giáo.', 15, 'PUBLISHED'
    UNION ALL
    SELECT 'かいしゃいん', 'かいしゃいん', 'nhân viên công ty', 'Danh từ', 'わたしはかいしゃいんがすきです。', 'Tôi thích nhân viên công ty.', 16, 'PUBLISHED'
    UNION ALL
    SELECT 'ぎんこういん', 'ぎんこういん', 'nhân viên ngân hàng', 'Danh từ', 'わたしはぎんこういんがすきです。', 'Tôi thích nhân viên ngân hàng.', 17, 'PUBLISHED'
    UNION ALL
    SELECT 'いしゃ', 'いしゃ', 'bác sĩ', 'Danh từ', 'わたしはいしゃがすきです。', 'Tôi thích bác sĩ.', 18, 'PUBLISHED'
    UNION ALL
    SELECT 'しゅみ', 'しゅみ', 'sở thích', 'Danh từ', 'わたしはしゅみがすきです。', 'Tôi thích sở thích.', 19, 'PUBLISHED'
    UNION ALL
    SELECT 'サッカー', 'サッカー', 'bóng đá', 'Danh từ', 'わたしはサッカーがすきです。', 'Tôi thích bóng đá.', 20, 'PUBLISHED'
    UNION ALL
    SELECT 'テニス', 'テニス', 'quần vợt', 'Danh từ', 'わたしはテニスがすきです。', 'Tôi thích quần vợt.', 21, 'PUBLISHED'
    UNION ALL
    SELECT 'すいえい', 'すいえい', 'bơi lội', 'Danh từ', 'わたしはすいえいがすきです。', 'Tôi thích bơi lội.', 22, 'PUBLISHED'
    UNION ALL
    SELECT 'えいが', 'えいが', 'phim', 'Danh từ', 'わたしはえいががすきです。', 'Tôi thích phim.', 23, 'PUBLISHED'
    UNION ALL
    SELECT 'おんがく', 'おんがく', 'âm nhạc', 'Danh từ', 'わたしはおんがくがすきです。', 'Tôi thích âm nhạc.', 24, 'PUBLISHED'
    UNION ALL
    SELECT 'りょこう', 'りょこう', 'du lịch', 'Danh từ', 'わたしはりょこうがすきです。', 'Tôi thích du lịch.', 25, 'PUBLISHED'
    UNION ALL
    SELECT 'どくしょ', 'どくしょ', 'đọc sách', 'Danh từ', 'わたしはどくしょがすきです。', 'Tôi thích đọc sách.', 26, 'PUBLISHED'
    UNION ALL
    SELECT 'りょうり', 'りょうり', 'nấu ăn, món ăn', 'Danh từ', 'わたしはりょうりがすきです。', 'Tôi thích nấu ăn, món ăn.', 27, 'PUBLISHED'
) AS seed
JOIN course AS c ON c.code = 'JPD113'
JOIN chapter AS ch ON ch.course_id = c.id AND ch.chapter_no = 1
JOIN lesson AS l ON l.chapter_id = ch.id AND l.skill_type = 'VOCABULARY' AND l.lesson_no = 1;

-- JPD113 / Chapter 2 / Từ vựng: 39 mục.
INSERT INTO vocabulary (lesson_id, word, reading, meaning_vi, word_type, example_jp, example_vi, display_order, status)
SELECT l.id, seed.word, seed.reading, seed.meaning_vi, seed.word_type, seed.example_jp, seed.example_vi, seed.display_order, seed.status
FROM (
    SELECT 'ATM' AS word, 'ATM' AS reading, 'máy ATM' AS meaning_vi, 'Danh từ' AS word_type, 'わたしはATMがすきです。' AS example_jp, 'Tôi thích máy ATM.' AS example_vi, 1 AS display_order, 'PUBLISHED' AS status
    UNION ALL
    SELECT 'エスカレーター', 'エスカレーター', 'thang cuốn', 'Danh từ', 'わたしはエスカレーターがすきです。', 'Tôi thích thang cuốn.', 2, 'PUBLISHED'
    UNION ALL
    SELECT 'エレベーター', 'エレベーター', 'thang máy', 'Danh từ', 'わたしはエレベーターがすきです。', 'Tôi thích thang máy.', 3, 'PUBLISHED'
    UNION ALL
    SELECT 'きつえんじょ', 'きつえんじょ', 'khu vực hút thuốc', 'Danh từ', 'わたしはきつえんじょがすきです。', 'Tôi thích khu vực hút thuốc.', 4, 'PUBLISHED'
    UNION ALL
    SELECT 'トイレ', 'トイレ', 'nhà vệ sinh', 'Danh từ', 'わたしはトイレがすきです。', 'Tôi thích nhà vệ sinh.', 5, 'PUBLISHED'
    UNION ALL
    SELECT 'レジ', 'レジ', 'quầy thu ngân', 'Danh từ', 'わたしはレジがすきです。', 'Tôi thích quầy thu ngân.', 6, 'PUBLISHED'
    UNION ALL
    SELECT 'きっさてん', 'きっさてん', 'quán cà phê', 'Danh từ', 'わたしはきっさてんがすきです。', 'Tôi thích quán cà phê.', 7, 'PUBLISHED'
    UNION ALL
    SELECT 'スーパー', 'スーパー', 'siêu thị', 'Danh từ', 'わたしはスーパーがすきです。', 'Tôi thích siêu thị.', 8, 'PUBLISHED'
    UNION ALL
    SELECT 'ひゃくえんショップ', 'ひゃくえんショップ', 'cửa hàng 100 yên', 'Danh từ', 'わたしはひゃくえんショップがすきです。', 'Tôi thích cửa hàng 100 yên.', 9, 'PUBLISHED'
    UNION ALL
    SELECT 'レストラン', 'レストラン', 'nhà hàng', 'Danh từ', 'わたしはレストランがすきです。', 'Tôi thích nhà hàng.', 10, 'PUBLISHED'
    UNION ALL
    SELECT 'カメラ', 'カメラ', 'máy ảnh', 'Danh từ', 'わたしはカメラがすきです。', 'Tôi thích máy ảnh.', 11, 'PUBLISHED'
    UNION ALL
    SELECT 'けいたいでんわ', 'けいたいでんわ', 'điện thoại di động', 'Danh từ', 'わたしはけいたいでんわがすきです。', 'Tôi thích điện thoại di động.', 12, 'PUBLISHED'
    UNION ALL
    SELECT 'でんしじしょ', 'でんしじしょ', 'từ điển điện tử', 'Danh từ', 'わたしはでんしじしょがすきです。', 'Tôi thích từ điển điện tử.', 13, 'PUBLISHED'
    UNION ALL
    SELECT 'くつ', 'くつ', 'giày', 'Danh từ', 'わたしはくつがすきです。', 'Tôi thích giày.', 14, 'PUBLISHED'
    UNION ALL
    SELECT 'けしゴム', 'けしゴム', 'cục tẩy', 'Danh từ', 'わたしはけしゴムがすきです。', 'Tôi thích cục tẩy.', 15, 'PUBLISHED'
    UNION ALL
    SELECT 'ペン', 'ペン', 'bút', 'Danh từ', 'わたしはペンがすきです。', 'Tôi thích bút.', 16, 'PUBLISHED'
    UNION ALL
    SELECT 'ほん', 'ほん', 'sách', 'Danh từ', 'わたしはほんがすきです。', 'Tôi thích sách.', 17, 'PUBLISHED'
    UNION ALL
    SELECT 'あぶら', 'あぶら', 'dầu ăn', 'Danh từ', 'わたしはあぶらがすきです。', 'Tôi thích dầu ăn.', 18, 'PUBLISHED'
    UNION ALL
    SELECT 'ケーキ', 'ケーキ', 'bánh ngọt', 'Danh từ', 'わたしはケーキがすきです。', 'Tôi thích bánh ngọt.', 19, 'PUBLISHED'
    UNION ALL
    SELECT 'こめ', 'こめ', 'gạo', 'Danh từ', 'わたしはこめがすきです。', 'Tôi thích gạo.', 20, 'PUBLISHED'
    UNION ALL
    SELECT 'たまご', 'たまご', 'trứng', 'Danh từ', 'わたしはたまごがすきです。', 'Tôi thích trứng.', 21, 'PUBLISHED'
    UNION ALL
    SELECT 'パン', 'パン', 'bánh mì', 'Danh từ', 'わたしはパンがすきです。', 'Tôi thích bánh mì.', 22, 'PUBLISHED'
    UNION ALL
    SELECT 'かばん', 'かばん', 'cặp, túi xách', 'Danh từ', 'わたしはかばんがすきです。', 'Tôi thích cặp, túi xách.', 23, 'PUBLISHED'
    UNION ALL
    SELECT 'ズボン', 'ズボン', 'quần dài', 'Danh từ', 'わたしはズボンがすきです。', 'Tôi thích quần dài.', 24, 'PUBLISHED'
    UNION ALL
    SELECT 'Tシャツ', 'Tシャツ', 'áo thun', 'Danh từ', 'わたしはTシャツがすきです。', 'Tôi thích áo thun.', 25, 'PUBLISHED'
    UNION ALL
    SELECT 'とけい', 'とけい', 'đồng hồ', 'Danh từ', 'わたしはとけいがすきです。', 'Tôi thích đồng hồ.', 26, 'PUBLISHED'
    UNION ALL
    SELECT 'さかな', 'さかな', 'cá', 'Danh từ', 'わたしはさかながすきです。', 'Tôi thích cá.', 27, 'PUBLISHED'
    UNION ALL
    SELECT 'やさい', 'やさい', 'rau', 'Danh từ', 'わたしはやさいがすきです。', 'Tôi thích rau.', 28, 'PUBLISHED'
    UNION ALL
    SELECT 'にく', 'にく', 'thịt', 'Danh từ', 'わたしはにくがすきです。', 'Tôi thích thịt.', 29, 'PUBLISHED'
    UNION ALL
    SELECT 'イチゴ', 'イチゴ', 'dâu tây', 'Danh từ', 'わたしはイチゴがすきです。', 'Tôi thích dâu tây.', 30, 'PUBLISHED'
    UNION ALL
    SELECT 'リンゴ', 'リンゴ', 'táo', 'Danh từ', 'わたしはリンゴがすきです。', 'Tôi thích táo.', 31, 'PUBLISHED'
    UNION ALL
    SELECT 'カレー', 'カレー', 'cà ri', 'Danh từ', 'わたしはカレーがすきです。', 'Tôi thích cà ri.', 32, 'PUBLISHED'
    UNION ALL
    SELECT 'とんかつ', 'とんかつ', 'thịt heo chiên xù', 'Danh từ', 'わたしはとんかつがすきです。', 'Tôi thích thịt heo chiên xù.', 33, 'PUBLISHED'
    UNION ALL
    SELECT 'おちゃ', 'おちゃ', 'trà xanh', 'Danh từ', 'わたしはおちゃがすきです。', 'Tôi thích trà xanh.', 34, 'PUBLISHED'
    UNION ALL
    SELECT 'こうちゃ', 'こうちゃ', 'trà đen', 'Danh từ', 'わたしはこうちゃがすきです。', 'Tôi thích trà đen.', 35, 'PUBLISHED'
    UNION ALL
    SELECT 'ビール', 'ビール', 'bia', 'Danh từ', 'わたしはビールがすきです。', 'Tôi thích bia.', 36, 'PUBLISHED'
    UNION ALL
    SELECT 'ワイン', 'ワイン', 'rượu vang', 'Danh từ', 'わたしはワインがすきです。', 'Tôi thích rượu vang.', 37, 'PUBLISHED'
    UNION ALL
    SELECT 'コーヒー', 'コーヒー', 'cà phê', 'Danh từ', 'わたしはコーヒーがすきです。', 'Tôi thích cà phê.', 38, 'PUBLISHED'
    UNION ALL
    SELECT 'ジュース', 'ジュース', 'nước ép, nước ngọt', 'Danh từ', 'わたしはジュースがすきです。', 'Tôi thích nước ép, nước ngọt.', 39, 'PUBLISHED'
) AS seed
JOIN course AS c ON c.code = 'JPD113'
JOIN chapter AS ch ON ch.course_id = c.id AND ch.chapter_no = 2
JOIN lesson AS l ON l.chapter_id = ch.id AND l.skill_type = 'VOCABULARY' AND l.lesson_no = 1;

-- JPD113 / Chapter 3 / Từ vựng: 37 mục.
INSERT INTO vocabulary (lesson_id, word, reading, meaning_vi, word_type, example_jp, example_vi, display_order, status)
SELECT l.id, seed.word, seed.reading, seed.meaning_vi, seed.word_type, seed.example_jp, seed.example_vi, seed.display_order, seed.status
FROM (
    SELECT 'ごぜん' AS word, 'ごぜん' AS reading, 'buổi sáng, trước trưa' AS meaning_vi, 'Danh từ' AS word_type, 'わたしはごぜんがすきです。' AS example_jp, 'Tôi thích buổi sáng, trước trưa.' AS example_vi, 1 AS display_order, 'PUBLISHED' AS status
    UNION ALL
    SELECT 'ごご', 'ごご', 'buổi chiều, sau trưa', 'Danh từ', 'わたしはごごがすきです。', 'Tôi thích buổi chiều, sau trưa.', 2, 'PUBLISHED'
    UNION ALL
    SELECT 'ぎんこう', 'ぎんこう', 'ngân hàng', 'Danh từ', 'わたしはぎんこうがすきです。', 'Tôi thích ngân hàng.', 3, 'PUBLISHED'
    UNION ALL
    SELECT 'たいいくかん', 'たいいくかん', 'nhà thi đấu thể thao', 'Danh từ', 'わたしはたいいくかんがすきです。', 'Tôi thích nhà thi đấu thể thao.', 4, 'PUBLISHED'
    UNION ALL
    SELECT 'としょかん', 'としょかん', 'thư viện', 'Danh từ', 'わたしはとしょかんがすきです。', 'Tôi thích thư viện.', 5, 'PUBLISHED'
    UNION ALL
    SELECT 'びょういん', 'びょういん', 'bệnh viện', 'Danh từ', 'わたしはびょういんがすきです。', 'Tôi thích bệnh viện.', 6, 'PUBLISHED'
    UNION ALL
    SELECT 'ゆうびんきょく', 'ゆうびんきょく', 'bưu điện', 'Danh từ', 'わたしはゆうびんきょくがすきです。', 'Tôi thích bưu điện.', 7, 'PUBLISHED'
    UNION ALL
    SELECT 'テスト', 'テスト', 'bài kiểm tra', 'Danh từ', 'わたしはテストがすきです。', 'Tôi thích bài kiểm tra.', 8, 'PUBLISHED'
    UNION ALL
    SELECT 'スキー', 'スキー', 'trượt tuyết', 'Danh từ', 'わたしはスキーがすきです。', 'Tôi thích trượt tuyết.', 9, 'PUBLISHED'
    UNION ALL
    SELECT 'バーベキュー', 'バーベキュー', 'tiệc nướng', 'Danh từ', 'わたしはバーベキューがすきです。', 'Tôi thích tiệc nướng.', 10, 'PUBLISHED'
    UNION ALL
    SELECT 'はなび', 'はなび', 'pháo hoa', 'Danh từ', 'わたしははなびがすきです。', 'Tôi thích pháo hoa.', 11, 'PUBLISHED'
    UNION ALL
    SELECT 'はなみ', 'はなみ', 'ngắm hoa', 'Danh từ', 'わたしははなみがすきです。', 'Tôi thích ngắm hoa.', 12, 'PUBLISHED'
    UNION ALL
    SELECT 'さくら', 'さくら', 'hoa anh đào', 'Danh từ', 'わたしはさくらがすきです。', 'Tôi thích hoa anh đào.', 13, 'PUBLISHED'
    UNION ALL
    SELECT 'すし', 'すし', 'sushi', 'Danh từ', 'わたしはすしがすきです。', 'Tôi thích sushi.', 14, 'PUBLISHED'
    UNION ALL
    SELECT 'おべんとう', 'おべんとう', 'cơm hộp', 'Danh từ', 'わたしはおべんとうがすきです。', 'Tôi thích cơm hộp.', 15, 'PUBLISHED'
    UNION ALL
    SELECT 'おまつり', 'おまつり', 'lễ hội', 'Danh từ', 'わたしはおまつりがすきです。', 'Tôi thích lễ hội.', 16, 'PUBLISHED'
    UNION ALL
    SELECT 'いきます', 'いきます', 'đi', 'Động từ', 'まいにちいきます。', 'Mỗi ngày tôi đi.', 17, 'PUBLISHED'
    UNION ALL
    SELECT 'かえります', 'かえります', 'trở về', 'Động từ', 'まいにちかえります。', 'Mỗi ngày tôi trở về.', 18, 'PUBLISHED'
    UNION ALL
    SELECT 'のみます', 'のみます', 'uống', 'Động từ', 'まいにちのみます。', 'Mỗi ngày tôi uống.', 19, 'PUBLISHED'
    UNION ALL
    SELECT 'たべます', 'たべます', 'ăn', 'Động từ', 'まいにちたべます。', 'Mỗi ngày tôi ăn.', 20, 'PUBLISHED'
    UNION ALL
    SELECT 'みます', 'みます', 'xem, nhìn', 'Động từ', 'まいにちみます。', 'Mỗi ngày tôi xem, nhìn.', 21, 'PUBLISHED'
    UNION ALL
    SELECT 'かいしゃ', 'かいしゃ', 'công ty', 'Danh từ', 'わたしはかいしゃがすきです。', 'Tôi thích công ty.', 22, 'PUBLISHED'
    UNION ALL
    SELECT 'コンビニ', 'コンビニ', 'cửa hàng tiện lợi', 'Danh từ', 'わたしはコンビニがすきです。', 'Tôi thích cửa hàng tiện lợi.', 23, 'PUBLISHED'
    UNION ALL
    SELECT 'ぎゅうにゅう', 'ぎゅうにゅう', 'sữa bò', 'Danh từ', 'わたしはぎゅうにゅうがすきです。', 'Tôi thích sữa bò.', 24, 'PUBLISHED'
    UNION ALL
    SELECT 'くだもの', 'くだもの', 'trái cây', 'Danh từ', 'わたしはくだものがすきです。', 'Tôi thích trái cây.', 25, 'PUBLISHED'
    UNION ALL
    SELECT 'サラダ', 'サラダ', 'salad', 'Danh từ', 'わたしはサラダがすきです。', 'Tôi thích salad.', 26, 'PUBLISHED'
    UNION ALL
    SELECT 'チーズ', 'チーズ', 'phô mai', 'Danh từ', 'わたしはチーズがすきです。', 'Tôi thích phô mai.', 27, 'PUBLISHED'
    UNION ALL
    SELECT 'しんぶん', 'しんぶん', 'báo', 'Danh từ', 'わたしはしんぶんがすきです。', 'Tôi thích báo.', 28, 'PUBLISHED'
    UNION ALL
    SELECT 'テレビ', 'テレビ', 'tivi', 'Danh từ', 'わたしはテレビがすきです。', 'Tôi thích tivi.', 29, 'PUBLISHED'
    UNION ALL
    SELECT 'かいます', 'かいます', 'mua', 'Động từ', 'まいにちかいます。', 'Mỗi ngày tôi mua.', 30, 'PUBLISHED'
    UNION ALL
    SELECT 'ききます', 'ききます', 'nghe', 'Động từ', 'まいにちききます。', 'Mỗi ngày tôi nghe.', 31, 'PUBLISHED'
    UNION ALL
    SELECT 'はたらきます', 'はたらきます', 'làm việc', 'Động từ', 'まいにちはたらきます。', 'Mỗi ngày tôi làm việc.', 32, 'PUBLISHED'
    UNION ALL
    SELECT 'よみます', 'よみます', 'đọc', 'Động từ', 'まいにちよみます。', 'Mỗi ngày tôi đọc.', 33, 'PUBLISHED'
    UNION ALL
    SELECT 'おきます', 'おきます', 'thức dậy', 'Động từ', 'まいにちおきます。', 'Mỗi ngày tôi thức dậy.', 34, 'PUBLISHED'
    UNION ALL
    SELECT 'ねます', 'ねます', 'ngủ', 'Động từ', 'まいにちねます。', 'Mỗi ngày tôi ngủ.', 35, 'PUBLISHED'
    UNION ALL
    SELECT 'べんきょうします', 'べんきょうします', 'học', 'Động từ', 'まいにちべんきょうします。', 'Mỗi ngày tôi học.', 36, 'PUBLISHED'
    UNION ALL
    SELECT 'きます', 'きます', 'đến', 'Động từ', 'まいにちきます。', 'Mỗi ngày tôi đến.', 37, 'PUBLISHED'
) AS seed
JOIN course AS c ON c.code = 'JPD113'
JOIN chapter AS ch ON ch.course_id = c.id AND ch.chapter_no = 3
JOIN lesson AS l ON l.chapter_id = ch.id AND l.skill_type = 'VOCABULARY' AND l.lesson_no = 1;

-- JPD123 / Chapter 4 / Từ vựng: 48 mục.
INSERT INTO vocabulary (lesson_id, word, reading, meaning_vi, word_type, example_jp, example_vi, display_order, status)
SELECT l.id, seed.word, seed.reading, seed.meaning_vi, seed.word_type, seed.example_jp, seed.example_vi, seed.display_order, seed.status
FROM (
    SELECT 'まんなか' AS word, 'まんなか' AS reading, 'ở giữa, trung tâm' AS meaning_vi, 'Danh từ' AS word_type, 'わたしはまんなかがすきです。' AS example_jp, 'Tôi thích ở giữa, trung tâm.' AS example_vi, 1 AS display_order, 'PUBLISHED' AS status
    UNION ALL
    SELECT 'くるま', 'くるま', 'ô tô', 'Danh từ', 'わたしはくるまがすきです。', 'Tôi thích ô tô.', 2, 'PUBLISHED'
    UNION ALL
    SELECT 'しんかんせん', 'しんかんせん', 'tàu cao tốc Shinkansen', 'Danh từ', 'わたしはしんかんせんがすきです。', 'Tôi thích tàu cao tốc Shinkansen.', 3, 'PUBLISHED'
    UNION ALL
    SELECT 'でんしゃ', 'でんしゃ', 'tàu điện', 'Danh từ', 'わたしはでんしゃがすきです。', 'Tôi thích tàu điện.', 4, 'PUBLISHED'
    UNION ALL
    SELECT 'ひこうき', 'ひこうき', 'máy bay', 'Danh từ', 'わたしはひこうきがすきです。', 'Tôi thích máy bay.', 5, 'PUBLISHED'
    UNION ALL
    SELECT 'えき', 'えき', 'nhà ga', 'Danh từ', 'わたしはえきがすきです。', 'Tôi thích nhà ga.', 6, 'PUBLISHED'
    UNION ALL
    SELECT 'やま', 'やま', 'núi', 'Danh từ', 'わたしはやまがすきです。', 'Tôi thích núi.', 7, 'PUBLISHED'
    UNION ALL
    SELECT 'まち', 'まち', 'thành phố, thị trấn', 'Danh từ', 'わたしはまちがすきです。', 'Tôi thích thành phố, thị trấn.', 8, 'PUBLISHED'
    UNION ALL
    SELECT 'かわ', 'かわ', 'sông', 'Danh từ', 'わたしはかわがすきです。', 'Tôi thích sông.', 9, 'PUBLISHED'
    UNION ALL
    SELECT 'あるいて', 'あるいて', 'đi bộ', 'Cụm động từ', 'わたしはあるいてがすきです。', 'Tôi thích đi bộ.', 10, 'PUBLISHED'
    UNION ALL
    SELECT 'おんせん', 'おんせん', 'suối nước nóng', 'Danh từ', 'わたしはおんせんがすきです。', 'Tôi thích suối nước nóng.', 11, 'PUBLISHED'
    UNION ALL
    SELECT 'きょうかい', 'きょうかい', 'nhà thờ', 'Danh từ', 'わたしはきょうかいがすきです。', 'Tôi thích nhà thờ.', 12, 'PUBLISHED'
    UNION ALL
    SELECT 'しろ', 'しろ', 'lâu đài', 'Danh từ', 'わたしはしろがすきです。', 'Tôi thích lâu đài.', 13, 'PUBLISHED'
    UNION ALL
    SELECT 'じんじゃ', 'じんじゃ', 'đền Thần đạo', 'Danh từ', 'わたしはじんじゃがすきです。', 'Tôi thích đền Thần đạo.', 14, 'PUBLISHED'
    UNION ALL
    SELECT 'てら', 'てら', 'chùa', 'Danh từ', 'わたしはてらがすきです。', 'Tôi thích chùa.', 15, 'PUBLISHED'
    UNION ALL
    SELECT 'ビル', 'ビル', 'tòa nhà', 'Danh từ', 'わたしはビルがすきです。', 'Tôi thích tòa nhà.', 16, 'PUBLISHED'
    UNION ALL
    SELECT 'みどり', 'みどり', 'cây xanh', 'Danh từ', 'わたしはみどりがすきです。', 'Tôi thích cây xanh.', 17, 'PUBLISHED'
    UNION ALL
    SELECT 'あります', 'あります', 'có, tồn tại (đồ vật)', 'Động từ', 'まいにちあります。', 'Mỗi ngày tôi có, tồn tại (đồ vật).', 18, 'PUBLISHED'
    UNION ALL
    SELECT 'あたらしい', 'あたらしい', 'mới', 'Tính từ い', 'このまちはあたらしいです。', 'Thành phố này mới.', 19, 'PUBLISHED'
    UNION ALL
    SELECT 'ふるい', 'ふるい', 'cũ', 'Tính từ い', 'このまちはふるいです。', 'Thành phố này cũ.', 20, 'PUBLISHED'
    UNION ALL
    SELECT 'いい', 'いい', 'tốt', 'Tính từ い', 'このまちはいいです。', 'Thành phố này tốt.', 21, 'PUBLISHED'
    UNION ALL
    SELECT 'ひとがすくない', 'ひとがすくない', 'ít người', 'Cụm tính từ', 'このまちはひとがすくないです。', 'Thành phố này ít người.', 22, 'PUBLISHED'
    UNION ALL
    SELECT 'ひとがおおい', 'ひとがおおい', 'đông người', 'Cụm tính từ', 'このまちはひとがおおいです。', 'Thành phố này đông người.', 23, 'PUBLISHED'
    UNION ALL
    SELECT 'おおきい', 'おおきい', 'to, lớn', 'Tính từ い', 'このまちはおおきいです。', 'Thành phố này to, lớn.', 24, 'PUBLISHED'
    UNION ALL
    SELECT 'ちいさい', 'ちいさい', 'nhỏ', 'Tính từ い', 'このまちはちいさいです。', 'Thành phố này nhỏ.', 25, 'PUBLISHED'
    UNION ALL
    SELECT 'たかい', 'たかい', 'cao, đắt', 'Tính từ い', 'このまちはたかいです。', 'Thành phố này cao, đắt.', 26, 'PUBLISHED'
    UNION ALL
    SELECT 'ひくい', 'ひくい', 'thấp', 'Tính từ い', 'このまちはひくいです。', 'Thành phố này thấp.', 27, 'PUBLISHED'
    UNION ALL
    SELECT 'きれい', 'きれい', 'đẹp, sạch', 'Tính từ な', 'このまちはきれいです。', 'Thành phố này đẹp, sạch.', 28, 'PUBLISHED'
    UNION ALL
    SELECT 'しずか', 'しずか', 'yên tĩnh', 'Tính từ な', 'このまちはしずかです。', 'Thành phố này yên tĩnh.', 29, 'PUBLISHED'
    UNION ALL
    SELECT 'にぎやか', 'にぎやか', 'náo nhiệt', 'Tính từ な', 'このまちはにぎやかです。', 'Thành phố này náo nhiệt.', 30, 'PUBLISHED'
    UNION ALL
    SELECT 'ゆうめい', 'ゆうめい', 'nổi tiếng', 'Tính từ な', 'このまちはゆうめいです。', 'Thành phố này nổi tiếng.', 31, 'PUBLISHED'
    UNION ALL
    SELECT 'あめ', 'あめ', 'mưa', 'Danh từ', 'わたしはあめがすきです。', 'Tôi thích mưa.', 32, 'PUBLISHED'
    UNION ALL
    SELECT 'ゆき', 'ゆき', 'tuyết', 'Danh từ', 'わたしはゆきがすきです。', 'Tôi thích tuyết.', 33, 'PUBLISHED'
    UNION ALL
    SELECT 'メロン', 'メロン', 'dưa lưới', 'Danh từ', 'わたしはメロンがすきです。', 'Tôi thích dưa lưới.', 34, 'PUBLISHED'
    UNION ALL
    SELECT 'すずしい', 'すずしい', 'mát mẻ', 'Tính từ い', 'きょうはすずしいです。', 'Hôm nay mát mẻ.', 35, 'PUBLISHED'
    UNION ALL
    SELECT 'あたたかい', 'あたたかい', 'ấm áp', 'Tính từ い', 'きょうはあたたかいです。', 'Hôm nay ấm áp.', 36, 'PUBLISHED'
    UNION ALL
    SELECT 'あつい', 'あつい', 'nóng', 'Tính từ い', 'きょうはあついです。', 'Hôm nay nóng.', 37, 'PUBLISHED'
    UNION ALL
    SELECT 'さむい', 'さむい', 'lạnh', 'Tính từ い', 'きょうはさむいです。', 'Hôm nay lạnh.', 38, 'PUBLISHED'
    UNION ALL
    SELECT 'てんきがいい', 'てんきがいい', 'thời tiết đẹp', 'Cụm tính từ', 'きょうはてんきがいいです。', 'Hôm nay thời tiết đẹp.', 39, 'PUBLISHED'
    UNION ALL
    SELECT 'てんきがわるい', 'てんきがわるい', 'thời tiết xấu', 'Cụm tính từ', 'きょうはてんきがわるいです。', 'Hôm nay thời tiết xấu.', 40, 'PUBLISHED'
    UNION ALL
    SELECT 'つめたい', 'つめたい', 'lạnh (khi chạm, đồ ăn/uống)', 'Tính từ い', 'このりょうりはつめたいです。', 'Món ăn này lạnh (khi chạm, đồ ăn/uống).', 41, 'PUBLISHED'
    UNION ALL
    SELECT 'おいしい', 'おいしい', 'ngon', 'Tính từ い', 'このりょうりはおいしいです。', 'Món ăn này ngon.', 42, 'PUBLISHED'
    UNION ALL
    SELECT 'まずい', 'まずい', 'dở', 'Tính từ い', 'このりょうりはまずいです。', 'Món ăn này dở.', 43, 'PUBLISHED'
    UNION ALL
    SELECT 'からい', 'からい', 'cay', 'Tính từ い', 'このりょうりはからいです。', 'Món ăn này cay.', 44, 'PUBLISHED'
    UNION ALL
    SELECT 'あまい', 'あまい', 'ngọt', 'Tính từ い', 'このりょうりはあまいです。', 'Món ăn này ngọt.', 45, 'PUBLISHED'
    UNION ALL
    SELECT 'にがい', 'にがい', 'đắng', 'Tính từ い', 'このりょうりはにがいです。', 'Món ăn này đắng.', 46, 'PUBLISHED'
    UNION ALL
    SELECT 'すっぱい', 'すっぱい', 'chua', 'Tính từ い', 'このりょうりはすっぱいです。', 'Món ăn này chua.', 47, 'PUBLISHED'
    UNION ALL
    SELECT 'しおからい', 'しおからい', 'mặn', 'Tính từ い', 'このりょうりはしおからいです。', 'Món ăn này mặn.', 48, 'PUBLISHED'
) AS seed
JOIN course AS c ON c.code = 'JPD123'
JOIN chapter AS ch ON ch.course_id = c.id AND ch.chapter_no = 4
JOIN lesson AS l ON l.chapter_id = ch.id AND l.skill_type = 'VOCABULARY' AND l.lesson_no = 1;

-- JPD123 / Chapter 5 / Từ vựng: 40 mục.
INSERT INTO vocabulary (lesson_id, word, reading, meaning_vi, word_type, example_jp, example_vi, display_order, status)
SELECT l.id, seed.word, seed.reading, seed.meaning_vi, seed.word_type, seed.example_jp, seed.example_vi, seed.display_order, seed.status
FROM (
    SELECT 'しゅうまつ' AS word, 'しゅうまつ' AS reading, 'cuối tuần' AS meaning_vi, 'Danh từ' AS word_type, 'わたしはしゅうまつがすきです。' AS example_jp, 'Tôi thích cuối tuần.' AS example_vi, 1 AS display_order, 'PUBLISHED' AS status
    UNION ALL
    SELECT 'いえ', 'いえ', 'nhà', 'Danh từ', 'わたしはいえがすきです。', 'Tôi thích nhà.', 2, 'PUBLISHED'
    UNION ALL
    SELECT 'へや', 'へや', 'phòng', 'Danh từ', 'わたしはへやがすきです。', 'Tôi thích phòng.', 3, 'PUBLISHED'
    UNION ALL
    SELECT 'デパート', 'デパート', 'cửa hàng bách hóa', 'Danh từ', 'わたしはデパートがすきです。', 'Tôi thích cửa hàng bách hóa.', 4, 'PUBLISHED'
    UNION ALL
    SELECT 'びじゅつかん', 'びじゅつかん', 'bảo tàng mỹ thuật', 'Danh từ', 'わたしはびじゅつかんがすきです。', 'Tôi thích bảo tàng mỹ thuật.', 5, 'PUBLISHED'
    UNION ALL
    SELECT 'ゲーム', 'ゲーム', 'trò chơi', 'Danh từ', 'わたしはゲームがすきです。', 'Tôi thích trò chơi.', 6, 'PUBLISHED'
    UNION ALL
    SELECT 'かぞく', 'かぞく', 'gia đình', 'Danh từ', 'わたしはかぞくがすきです。', 'Tôi thích gia đình.', 7, 'PUBLISHED'
    UNION ALL
    SELECT 'こいびと', 'こいびと', 'người yêu', 'Danh từ', 'わたしはこいびとがすきです。', 'Tôi thích người yêu.', 8, 'PUBLISHED'
    UNION ALL
    SELECT 'ともだち', 'ともだち', 'bạn bè', 'Danh từ', 'わたしはともだちがすきです。', 'Tôi thích bạn bè.', 9, 'PUBLISHED'
    UNION ALL
    SELECT 'ルームメイト', 'ルームメイト', 'bạn cùng phòng', 'Danh từ', 'わたしはルームメイトがすきです。', 'Tôi thích bạn cùng phòng.', 10, 'PUBLISHED'
    UNION ALL
    SELECT 'にあいます', 'にあいます', 'hợp, vừa (quần áo)', 'Động từ', 'まいにちにあいます。', 'Mỗi ngày tôi hợp, vừa (quần áo).', 11, 'PUBLISHED'
    UNION ALL
    SELECT 'つくります', 'つくります', 'làm, chế tạo', 'Động từ', 'まいにちつくります。', 'Mỗi ngày tôi làm, chế tạo.', 12, 'PUBLISHED'
    UNION ALL
    SELECT 'かいものします', 'かいものします', 'mua sắm', 'Động từ', 'まいにちかいものします。', 'Mỗi ngày tôi mua sắm.', 13, 'PUBLISHED'
    UNION ALL
    SELECT 'しょくじします', 'しょくじします', 'dùng bữa', 'Động từ', 'まいにちしょくじします。', 'Mỗi ngày tôi dùng bữa.', 14, 'PUBLISHED'
    UNION ALL
    SELECT 'せんたくします', 'せんたくします', 'giặt quần áo', 'Động từ', 'まいにちせんたくします。', 'Mỗi ngày tôi giặt quần áo.', 15, 'PUBLISHED'
    UNION ALL
    SELECT 'そうじします', 'そうじします', 'dọn dẹp', 'Động từ', 'まいにちそうじします。', 'Mỗi ngày tôi dọn dẹp.', 16, 'PUBLISHED'
    UNION ALL
    SELECT 'かぜ', 'かぜ', 'gió', 'Danh từ', 'わたしはかぜがすきです。', 'Tôi thích gió.', 17, 'PUBLISHED'
    UNION ALL
    SELECT 'てんき', 'てんき', 'thời tiết', 'Danh từ', 'わたしはてんきがすきです。', 'Tôi thích thời tiết.', 18, 'PUBLISHED'
    UNION ALL
    SELECT 'ふく', 'ふく', 'quần áo', 'Danh từ', 'わたしはふくがすきです。', 'Tôi thích quần áo.', 19, 'PUBLISHED'
    UNION ALL
    SELECT 'のぼります', 'のぼります', 'leo, trèo', 'Động từ', 'まいにちのぼります。', 'Mỗi ngày tôi leo, trèo.', 20, 'PUBLISHED'
    UNION ALL
    SELECT 'はいります', 'はいります', 'vào', 'Động từ', 'まいにちはいります。', 'Mỗi ngày tôi vào.', 21, 'PUBLISHED'
    UNION ALL
    SELECT 'いそがしい', 'いそがしい', 'bận rộn', 'Tính từ い', 'このまちはいそがしいです。', 'Thành phố này bận rộn.', 22, 'PUBLISHED'
    UNION ALL
    SELECT 'おもしろい', 'おもしろい', 'thú vị', 'Tính từ い', 'このまちはおもしろいです。', 'Thành phố này thú vị.', 23, 'PUBLISHED'
    UNION ALL
    SELECT 'つまらない', 'つまらない', 'nhàm chán', 'Tính từ い', 'このまちはつまらないです。', 'Thành phố này nhàm chán.', 24, 'PUBLISHED'
    UNION ALL
    SELECT 'きもちがいい', 'きもちがいい', 'dễ chịu', 'Cụm tính từ', 'このまちはきもちがいいです。', 'Thành phố này dễ chịu.', 25, 'PUBLISHED'
    UNION ALL
    SELECT 'やすい', 'やすい', 'rẻ', 'Tính từ い', 'このまちはやすいです。', 'Thành phố này rẻ.', 26, 'PUBLISHED'
    UNION ALL
    SELECT 'たのしい', 'たのしい', 'vui', 'Tính từ い', 'このまちはたのしいです。', 'Thành phố này vui.', 27, 'PUBLISHED'
    UNION ALL
    SELECT 'むずかしい', 'むずかしい', 'khó', 'Tính từ い', 'このまちはむずかしいです。', 'Thành phố này khó.', 28, 'PUBLISHED'
    UNION ALL
    SELECT 'かんたん', 'かんたん', 'đơn giản', 'Tính từ な', 'このまちはかんたんです。', 'Thành phố này đơn giản.', 29, 'PUBLISHED'
    UNION ALL
    SELECT 'ひま', 'ひま', 'rảnh', 'Tính từ な', 'このまちはひまです。', 'Thành phố này rảnh.', 30, 'PUBLISHED'
    UNION ALL
    SELECT 'アニメ', 'アニメ', 'hoạt hình', 'Danh từ', 'わたしはアニメがすきです。', 'Tôi thích hoạt hình.', 31, 'PUBLISHED'
    UNION ALL
    SELECT 'え', 'え', 'tranh', 'Danh từ', 'わたしはえがすきです。', 'Tôi thích tranh.', 32, 'PUBLISHED'
    UNION ALL
    SELECT 'けしき', 'けしき', 'phong cảnh', 'Danh từ', 'わたしはけしきがすきです。', 'Tôi thích phong cảnh.', 33, 'PUBLISHED'
    UNION ALL
    SELECT 'じてんしゃ', 'じてんしゃ', 'xe đạp', 'Danh từ', 'わたしはじてんしゃがすきです。', 'Tôi thích xe đạp.', 34, 'PUBLISHED'
    UNION ALL
    SELECT 'とります', 'とります', 'chụp, lấy', 'Động từ', 'まいにちとります。', 'Mỗi ngày tôi chụp, lấy.', 35, 'PUBLISHED'
    UNION ALL
    SELECT 'しゃしん', 'しゃしん', 'ảnh', 'Danh từ', 'わたしはしゃしんがすきです。', 'Tôi thích ảnh.', 36, 'PUBLISHED'
    UNION ALL
    SELECT 'かります', 'かります', 'mượn', 'Động từ', 'まいにちかります。', 'Mỗi ngày tôi mượn.', 37, 'PUBLISHED'
    UNION ALL
    SELECT 'ほしい', 'ほしい', 'muốn có', 'Tính từ い', 'このまちはほしいです。', 'Thành phố này muốn có.', 38, 'PUBLISHED'
    UNION ALL
    SELECT 'すき', 'すき', 'thích', 'Tính từ な', 'このまちはすきです。', 'Thành phố này thích.', 39, 'PUBLISHED'
    UNION ALL
    SELECT 'きらい', 'きらい', 'ghét, không thích', 'Tính từ な', 'このまちはきらいです。', 'Thành phố này ghét, không thích.', 40, 'PUBLISHED'
) AS seed
JOIN course AS c ON c.code = 'JPD123'
JOIN chapter AS ch ON ch.course_id = c.id AND ch.chapter_no = 5
JOIN lesson AS l ON l.chapter_id = ch.id AND l.skill_type = 'VOCABULARY' AND l.lesson_no = 1;

-- JPD123 / Chapter 6 / Từ vựng: 24 mục.
INSERT INTO vocabulary (lesson_id, word, reading, meaning_vi, word_type, example_jp, example_vi, display_order, status)
SELECT l.id, seed.word, seed.reading, seed.meaning_vi, seed.word_type, seed.example_jp, seed.example_vi, seed.display_order, seed.status
FROM (
    SELECT 'カラオケ' AS word, 'カラオケ' AS reading, 'karaoke' AS meaning_vi, 'Danh từ' AS word_type, 'わたしはカラオケがすきです。' AS example_jp, 'Tôi thích karaoke.' AS example_vi, 1 AS display_order, 'PUBLISHED' AS status
    UNION ALL
    SELECT 'コンサート', 'コンサート', 'buổi hòa nhạc', 'Danh từ', 'わたしはコンサートがすきです。', 'Tôi thích buổi hòa nhạc.', 2, 'PUBLISHED'
    UNION ALL
    SELECT 'しあい', 'しあい', 'trận đấu', 'Danh từ', 'わたしはしあいがすきです。', 'Tôi thích trận đấu.', 3, 'PUBLISHED'
    UNION ALL
    SELECT 'やきゅう', 'やきゅう', 'bóng chày', 'Danh từ', 'わたしはやきゅうがすきです。', 'Tôi thích bóng chày.', 4, 'PUBLISHED'
    UNION ALL
    SELECT 'ちず', 'ちず', 'bản đồ', 'Danh từ', 'わたしはちずがすきです。', 'Tôi thích bản đồ.', 5, 'PUBLISHED'
    UNION ALL
    SELECT 'ドライブ', 'ドライブ', 'lái xe đi chơi', 'Danh từ', 'わたしはドライブがすきです。', 'Tôi thích lái xe đi chơi.', 6, 'PUBLISHED'
    UNION ALL
    SELECT 'チケット', 'チケット', 'vé', 'Danh từ', 'わたしはチケットがすきです。', 'Tôi thích vé.', 7, 'PUBLISHED'
    UNION ALL
    SELECT 'みずぎ', 'みずぎ', 'đồ bơi', 'Danh từ', 'わたしはみずぎがすきです。', 'Tôi thích đồ bơi.', 8, 'PUBLISHED'
    UNION ALL
    SELECT 'やきにく', 'やきにく', 'thịt nướng', 'Danh từ', 'わたしはやきにくがすきです。', 'Tôi thích thịt nướng.', 9, 'PUBLISHED'
    UNION ALL
    SELECT 'ラーメン', 'ラーメン', 'mì ramen', 'Danh từ', 'わたしはラーメンがすきです。', 'Tôi thích mì ramen.', 10, 'PUBLISHED'
    UNION ALL
    SELECT 'たべほうだい', 'たべほうだい', 'ăn buffet không giới hạn', 'Danh từ', 'わたしはたべほうだいがすきです。', 'Tôi thích ăn buffet không giới hạn.', 11, 'PUBLISHED'
    UNION ALL
    SELECT 'いざかや', 'いざかや', 'quán nhậu kiểu Nhật', 'Danh từ', 'わたしはいざかやがすきです。', 'Tôi thích quán nhậu kiểu Nhật.', 12, 'PUBLISHED'
    UNION ALL
    SELECT 'えいがかん', 'えいがかん', 'rạp chiếu phim', 'Danh từ', 'わたしはえいがかんがすきです。', 'Tôi thích rạp chiếu phim.', 13, 'PUBLISHED'
    UNION ALL
    SELECT 'ちかてつ', 'ちかてつ', 'tàu điện ngầm', 'Danh từ', 'わたしはちかてつがすきです。', 'Tôi thích tàu điện ngầm.', 14, 'PUBLISHED'
    UNION ALL
    SELECT 'かしゅ', 'かしゅ', 'ca sĩ', 'Danh từ', 'わたしはかしゅがすきです。', 'Tôi thích ca sĩ.', 15, 'PUBLISHED'
    UNION ALL
    SELECT 'ジャズ', 'ジャズ', 'nhạc jazz', 'Danh từ', 'わたしはジャズがすきです。', 'Tôi thích nhạc jazz.', 16, 'PUBLISHED'
    UNION ALL
    SELECT 'コース', 'コース', 'lộ trình, khóa học', 'Danh từ', 'わたしはコースがすきです。', 'Tôi thích lộ trình, khóa học.', 17, 'PUBLISHED'
    UNION ALL
    SELECT 'ツアー', 'ツアー', 'chuyến du lịch theo tour', 'Danh từ', 'わたしはツアーがすきです。', 'Tôi thích chuyến du lịch theo tour.', 18, 'PUBLISHED'
    UNION ALL
    SELECT 'ちかい', 'ちかい', 'gần', 'Tính từ い', 'このまちはちかいです。', 'Thành phố này gần.', 19, 'PUBLISHED'
    UNION ALL
    SELECT 'とおい', 'とおい', 'xa', 'Tính từ い', 'このまちはとおいです。', 'Thành phố này xa.', 20, 'PUBLISHED'
    UNION ALL
    SELECT 'はやい', 'はやい', 'nhanh, sớm', 'Tính từ い', 'このまちははやいです。', 'Thành phố này nhanh, sớm.', 21, 'PUBLISHED'
    UNION ALL
    SELECT 'おこのみやき', 'おこのみやき', 'bánh xèo Nhật', 'Danh từ', 'わたしはおこのみやきがすきです。', 'Tôi thích bánh xèo Nhật.', 22, 'PUBLISHED'
    UNION ALL
    SELECT 'すきやき', 'すきやき', 'món lẩu sukiyaki', 'Danh từ', 'わたしはすきやきがすきです。', 'Tôi thích món lẩu sukiyaki.', 23, 'PUBLISHED'
    UNION ALL
    SELECT 'あそびます', 'あそびます', 'chơi', 'Động từ', 'まいにちあそびます。', 'Mỗi ngày tôi chơi.', 24, 'PUBLISHED'
) AS seed
JOIN course AS c ON c.code = 'JPD123'
JOIN chapter AS ch ON ch.course_id = c.id AND ch.chapter_no = 6
JOIN lesson AS l ON l.chapter_id = ch.id AND l.skill_type = 'VOCABULARY' AND l.lesson_no = 1;

-- JPD123 / Chapter 7 / Từ vựng: 45 mục.
INSERT INTO vocabulary (lesson_id, word, reading, meaning_vi, word_type, example_jp, example_vi, display_order, status)
SELECT l.id, seed.word, seed.reading, seed.meaning_vi, seed.word_type, seed.example_jp, seed.example_vi, seed.display_order, seed.status
FROM (
    SELECT 'います' AS word, 'います' AS reading, 'có, ở (người/động vật)' AS meaning_vi, 'Động từ' AS word_type, 'まいにちいます。' AS example_jp, 'Mỗi ngày tôi có, ở (người/động vật).' AS example_vi, 1 AS display_order, 'PUBLISHED' AS status
    UNION ALL
    SELECT 'あります', 'あります', 'có, tồn tại (đồ vật)', 'Động từ', 'まいにちあります。', 'Mỗi ngày tôi có, tồn tại (đồ vật).', 2, 'PUBLISHED'
    UNION ALL
    SELECT 'かいさつ', 'かいさつ', 'cổng soát vé', 'Danh từ', 'わたしはかいさつがすきです。', 'Tôi thích cổng soát vé.', 3, 'PUBLISHED'
    UNION ALL
    SELECT 'こうばん', 'こうばん', 'đồn cảnh sát nhỏ', 'Danh từ', 'わたしはこうばんがすきです。', 'Tôi thích đồn cảnh sát nhỏ.', 4, 'PUBLISHED'
    UNION ALL
    SELECT 'じどうはんばいき', 'じどうはんばいき', 'máy bán hàng tự động', 'Danh từ', 'わたしはじどうはんばいきがすきです。', 'Tôi thích máy bán hàng tự động.', 5, 'PUBLISHED'
    UNION ALL
    SELECT 'バスてい', 'バスてい', 'trạm xe buýt', 'Danh từ', 'わたしはバスていがすきです。', 'Tôi thích trạm xe buýt.', 6, 'PUBLISHED'
    UNION ALL
    SELECT 'ポスト', 'ポスト', 'hòm thư', 'Danh từ', 'わたしはポストがすきです。', 'Tôi thích hòm thư.', 7, 'PUBLISHED'
    UNION ALL
    SELECT 'はな', 'はな', 'hoa', 'Danh từ', 'わたしははながすきです。', 'Tôi thích hoa.', 8, 'PUBLISHED'
    UNION ALL
    SELECT 'うえ', 'うえ', 'ở trên', 'Danh từ chỉ vị trí', 'わたしはうえがすきです。', 'Tôi thích ở trên.', 9, 'PUBLISHED'
    UNION ALL
    SELECT 'した', 'した', 'ở dưới', 'Danh từ chỉ vị trí', 'わたしはしたがすきです。', 'Tôi thích ở dưới.', 10, 'PUBLISHED'
    UNION ALL
    SELECT 'うしろ', 'うしろ', 'phía sau', 'Danh từ chỉ vị trí', 'わたしはうしろがすきです。', 'Tôi thích phía sau.', 11, 'PUBLISHED'
    UNION ALL
    SELECT 'まえ', 'まえ', 'phía trước', 'Danh từ chỉ vị trí', 'わたしはまえがすきです。', 'Tôi thích phía trước.', 12, 'PUBLISHED'
    UNION ALL
    SELECT 'なか', 'なか', 'bên trong', 'Danh từ chỉ vị trí', 'わたしはなかがすきです。', 'Tôi thích bên trong.', 13, 'PUBLISHED'
    UNION ALL
    SELECT 'そと', 'そと', 'bên ngoài', 'Danh từ chỉ vị trí', 'わたしはそとがすきです。', 'Tôi thích bên ngoài.', 14, 'PUBLISHED'
    UNION ALL
    SELECT 'ひだり', 'ひだり', 'bên trái', 'Danh từ chỉ vị trí', 'わたしはひだりがすきです。', 'Tôi thích bên trái.', 15, 'PUBLISHED'
    UNION ALL
    SELECT 'みぎ', 'みぎ', 'bên phải', 'Danh từ chỉ vị trí', 'わたしはみぎがすきです。', 'Tôi thích bên phải.', 16, 'PUBLISHED'
    UNION ALL
    SELECT 'ちかく', 'ちかく', 'gần', 'Danh từ chỉ vị trí', 'わたしはちかくがすきです。', 'Tôi thích gần.', 17, 'PUBLISHED'
    UNION ALL
    SELECT 'となり', 'となり', 'bên cạnh', 'Danh từ chỉ vị trí', 'わたしはとなりがすきです。', 'Tôi thích bên cạnh.', 18, 'PUBLISHED'
    UNION ALL
    SELECT 'あいだ', 'あいだ', 'ở giữa', 'Danh từ chỉ vị trí', 'わたしはあいだがすきです。', 'Tôi thích ở giữa.', 19, 'PUBLISHED'
    UNION ALL
    SELECT 'よこ', 'よこ', 'bên cạnh, ngang bên', 'Danh từ chỉ vị trí', 'わたしはよこがすきです。', 'Tôi thích bên cạnh, ngang bên.', 20, 'PUBLISHED'
    UNION ALL
    SELECT 'いす', 'いす', 'ghế', 'Danh từ', 'わたしはいすがすきです。', 'Tôi thích ghế.', 21, 'PUBLISHED'
    UNION ALL
    SELECT 'テーブル', 'テーブル', 'bàn', 'Danh từ', 'わたしはテーブルがすきです。', 'Tôi thích bàn.', 22, 'PUBLISHED'
    UNION ALL
    SELECT 'でんしレンジ', 'でんしレンジ', 'lò vi sóng', 'Danh từ', 'わたしはでんしレンジがすきです。', 'Tôi thích lò vi sóng.', 23, 'PUBLISHED'
    UNION ALL
    SELECT 'れいぞうこ', 'れいぞうこ', 'tủ lạnh', 'Danh từ', 'わたしはれいぞうこがすきです。', 'Tôi thích tủ lạnh.', 24, 'PUBLISHED'
    UNION ALL
    SELECT 'さとう', 'さとう', 'đường', 'Danh từ', 'わたしはさとうがすきです。', 'Tôi thích đường.', 25, 'PUBLISHED'
    UNION ALL
    SELECT 'しお', 'しお', 'muối', 'Danh từ', 'わたしはしおがすきです。', 'Tôi thích muối.', 26, 'PUBLISHED'
    UNION ALL
    SELECT 'しょうゆ', 'しょうゆ', 'nước tương', 'Danh từ', 'わたしはしょうゆがすきです。', 'Tôi thích nước tương.', 27, 'PUBLISHED'
    UNION ALL
    SELECT 'スプーン', 'スプーン', 'thìa', 'Danh từ', 'わたしはスプーンがすきです。', 'Tôi thích thìa.', 28, 'PUBLISHED'
    UNION ALL
    SELECT 'フォーク', 'フォーク', 'nĩa', 'Danh từ', 'わたしはフォークがすきです。', 'Tôi thích nĩa.', 29, 'PUBLISHED'
    UNION ALL
    SELECT 'ナイフ', 'ナイフ', 'dao', 'Danh từ', 'わたしはナイフがすきです。', 'Tôi thích dao.', 30, 'PUBLISHED'
    UNION ALL
    SELECT 'て', 'て', 'tay', 'Danh từ', 'わたしはてがすきです。', 'Tôi thích tay.', 31, 'PUBLISHED'
    UNION ALL
    SELECT 'はし', 'はし', 'đũa', 'Danh từ', 'わたしははしがすきです。', 'Tôi thích đũa.', 32, 'PUBLISHED'
    UNION ALL
    SELECT 'あらいます', 'あらいます', 'rửa', 'Động từ', 'まいにちあらいます。', 'Mỗi ngày tôi rửa.', 33, 'PUBLISHED'
    UNION ALL
    SELECT 'かきます', 'かきます', 'viết', 'Động từ', 'まいにちかきます。', 'Mỗi ngày tôi viết.', 34, 'PUBLISHED'
    UNION ALL
    SELECT 'きります', 'きります', 'cắt', 'Động từ', 'まいにちきります。', 'Mỗi ngày tôi cắt.', 35, 'PUBLISHED'
    UNION ALL
    SELECT 'てつだいます', 'てつだいます', 'giúp đỡ', 'Động từ', 'まいにちてつだいます。', 'Mỗi ngày tôi giúp đỡ.', 36, 'PUBLISHED'
    UNION ALL
    SELECT 'いれます', 'いれます', 'cho vào', 'Động từ', 'まいにちいれます。', 'Mỗi ngày tôi cho vào.', 37, 'PUBLISHED'
    UNION ALL
    SELECT 'だします', 'だします', 'lấy ra, đưa ra', 'Động từ', 'まいにちだします。', 'Mỗi ngày tôi lấy ra, đưa ra.', 38, 'PUBLISHED'
    UNION ALL
    SELECT 'おしえます', 'おしえます', 'dạy, chỉ bảo', 'Động từ', 'まいにちおしえます。', 'Mỗi ngày tôi dạy, chỉ bảo.', 39, 'PUBLISHED'
    UNION ALL
    SELECT 'ギター', 'ギター', 'đàn ghi-ta', 'Danh từ', 'わたしはギターがすきです。', 'Tôi thích đàn ghi-ta.', 40, 'PUBLISHED'
    UNION ALL
    SELECT 'だいどころ', 'だいどころ', 'nhà bếp', 'Danh từ', 'わたしはだいどころがすきです。', 'Tôi thích nhà bếp.', 41, 'PUBLISHED'
    UNION ALL
    SELECT 'たばこ', 'たばこ', 'thuốc lá', 'Danh từ', 'わたしはたばこがすきです。', 'Tôi thích thuốc lá.', 42, 'PUBLISHED'
    UNION ALL
    SELECT 'でんわ', 'でんわ', 'điện thoại', 'Danh từ', 'わたしはでんわがすきです。', 'Tôi thích điện thoại.', 43, 'PUBLISHED'
    UNION ALL
    SELECT 'ピザ', 'ピザ', 'pizza', 'Danh từ', 'わたしはピザがすきです。', 'Tôi thích pizza.', 44, 'PUBLISHED'
    UNION ALL
    SELECT 'まど', 'まど', 'cửa sổ', 'Danh từ', 'わたしはまどがすきです。', 'Tôi thích cửa sổ.', 45, 'PUBLISHED'
) AS seed
JOIN course AS c ON c.code = 'JPD123'
JOIN chapter AS ch ON ch.course_id = c.id AND ch.chapter_no = 7
JOIN lesson AS l ON l.chapter_id = ch.id AND l.skill_type = 'VOCABULARY' AND l.lesson_no = 1;

-- =============================================================================
-- NGỮ PHÁP
-- =============================================================================
-- Mỗi lesson có đúng 1 chi tiết grammar; lesson_no là nhóm bài 1, 2 hoặc 3 trong chapter.
-- lesson.display_order giữ thứ tự từng mẫu; seed.lesson_order dùng thứ tự này để tìm đúng lesson.
-- grammar.display_order = 1 vì mỗi lesson chỉ chứa một mẫu.


-- JPD113 / Chapter 1 / Ngữ pháp: 8 mục.
INSERT INTO grammar (lesson_id, structure_name, meaning_vi, usage_explanation, example_jp, example_vi, display_order, status)
SELECT l.id, seed.structure_name, seed.meaning_vi, seed.usage_explanation, seed.example_jp, seed.example_vi, 1 AS display_order, seed.status
FROM (
    SELECT 'N1 は N2 です。' AS structure_name, 'Câu khẳng định danh từ' AS meaning_vi, 'Câu khẳng định danh từ (Slot 9).' AS usage_explanation, 'わたしは がくせいです。' AS example_jp, 'Tôi là học sinh.' AS example_vi, 1 AS lesson_order, 'PUBLISHED' AS status
    UNION ALL
    SELECT 'おくには どちらですか。', 'Hỏi quốc gia, quê quán', 'Hỏi quốc gia, quê quán (Slot 9).', 'おくには どちらですか。', 'Bạn đến từ nước nào?', 2, 'PUBLISHED'
    UNION ALL
    SELECT 'N1 は N2 じゃありません。', 'Câu phủ định danh từ', 'Câu phủ định danh từ (Slot 10).', 'わたしは せんせいじゃありません。', 'Tôi không phải giáo viên.', 3, 'PUBLISHED'
    UNION ALL
    SELECT 'N1 は N2 ですか。', 'Câu nghi vấn danh từ', 'Câu nghi vấn danh từ (Slot 10).', 'あなたは がくせいですか。', 'Bạn có phải học sinh không?', 4, 'PUBLISHED'
    UNION ALL
    SELECT 'N1 は N2 の N3 です。', 'Trợ từ の – quan hệ sở thuộc', 'Trợ từ の – quan hệ sở thuộc (Slot 10).', 'わたしは FPTだいがくの がくせいです。', 'Tôi là sinh viên Đại học FPT.', 5, 'PUBLISHED'
    UNION ALL
    SELECT 'N は なんですか。', 'Hỏi cái gì, sự việc gì', 'Hỏi cái gì, sự việc gì (Slot 13).', 'しゅみは なんですか。', 'Sở thích của bạn là gì?', 6, 'PUBLISHED'
    UNION ALL
    SELECT 'N1 と N2', 'Trợ từ と – liệt kê đầy đủ', 'Trợ từ と – liệt kê đầy đủ (Slot 13).', 'しゅみは サッカーと テニスです。', 'Sở thích là bóng đá và tennis.', 7, 'PUBLISHED'
    UNION ALL
    SELECT 'N1 は N2 です。N3 も N2 です。', 'Trợ từ も – cũng', 'Trợ từ も – cũng (Slot 13).', 'わたしの しゅみも りょうりです。', 'Sở thích của tôi cũng là nấu ăn.', 8, 'PUBLISHED'
) AS seed
JOIN course AS c ON c.code = 'JPD113'
JOIN chapter AS ch ON ch.course_id = c.id AND ch.chapter_no = 1
JOIN lesson AS l ON l.chapter_id = ch.id AND l.skill_type = 'GRAMMAR'
    AND l.display_order = seed.lesson_order AND l.title = seed.meaning_vi;

-- JPD113 / Chapter 2 / Ngữ pháp: 18 mục.
INSERT INTO grammar (lesson_id, structure_name, meaning_vi, usage_explanation, example_jp, example_vi, display_order, status)
SELECT l.id, seed.structure_name, seed.meaning_vi, seed.usage_explanation, seed.example_jp, seed.example_vi, 1 AS display_order, seed.status
FROM (
    SELECT 'N は số + かいです。' AS structure_name, 'Nói vị trí tầng' AS meaning_vi, 'Nói vị trí tầng (Slot 17).' AS usage_explanation, 'レストランは ごかいです。' AS example_jp, 'Nhà hàng ở tầng 5.' AS example_vi, 1 AS lesson_order, 'PUBLISHED' AS status
    UNION ALL
    SELECT 'N は なんかいですか。', 'Hỏi tầng', 'Hỏi tầng (Slot 17).', 'レストランは なんかいですか。', 'Nhà hàng ở tầng mấy?', 2, 'PUBLISHED'
    UNION ALL
    SELECT 'N は ここ／そこ／あそこです。', 'Chỉ vị trí', 'Chỉ vị trí (Slot 18).', 'トイレは あそこです。', 'Nhà vệ sinh ở đằng kia.', 3, 'PUBLISHED'
    UNION ALL
    SELECT 'N は どこですか。', 'Hỏi vị trí', 'Hỏi vị trí (Slot 18).', 'エスカレーターは どこですか。', 'Thang cuốn ở đâu?', 4, 'PUBLISHED'
    UNION ALL
    SELECT 'ここ／そこ／あそこ は N です。', 'Giới thiệu địa điểm', 'Giới thiệu địa điểm (Slot 18).', 'ここは スーパーです。', 'Đây là siêu thị.', 5, 'PUBLISHED'
    UNION ALL
    SELECT 'N は こちら／そちら／あちらです。', 'Chỉ phương hướng lịch sự', 'Chỉ phương hướng lịch sự (Slot 18).', 'カメラは あちらです。', 'Máy ảnh ở phía đằng kia.', 6, 'PUBLISHED'
    UNION ALL
    SELECT 'N は どちらですか。', 'Hỏi vị trí lịch sự', 'Hỏi vị trí lịch sự (Slot 18).', 'レストランは どちらですか。', 'Nhà hàng ở phía nào ạ?', 7, 'PUBLISHED'
    UNION ALL
    SELECT 'これ／それ／あれ は N です。', 'Đại từ chỉ thị', 'Đại từ chỉ thị (Slot 19).', 'これは かばんです。', 'Đây là cái cặp.', 8, 'PUBLISHED'
    UNION ALL
    SELECT 'N は いくらですか。', 'Hỏi giá tiền', 'Hỏi giá tiền (Slot 19).', 'これは いくらですか。', 'Cái này bao nhiêu tiền?', 9, 'PUBLISHED'
    UNION ALL
    SELECT 'これは なんですか。', 'Hỏi tên đồ vật', 'Hỏi tên đồ vật (Slot 19).', 'これは なんですか。', 'Đây là cái gì?', 10, 'PUBLISHED'
    UNION ALL
    SELECT 'この／その／あの + N', 'Từ chỉ thị bổ nghĩa danh từ', 'Từ chỉ thị bổ nghĩa danh từ (Slot 19).', 'この かばんは いくらですか。', 'Chiếc cặp này bao nhiêu tiền?', 11, 'PUBLISHED'
    UNION ALL
    SELECT 'N を ください。', 'Yêu cầu lấy hoặc mua đồ', 'Yêu cầu lấy hoặc mua đồ (Slot 20).', 'これを ください。', 'Cho tôi cái này.', 12, 'PUBLISHED'
    UNION ALL
    SELECT 'N1 の N2', 'Trợ từ の – nguyên liệu', 'Trợ từ の – nguyên liệu (Slot 21).', 'これは いちごの ケーキです。', 'Đây là bánh làm từ dâu tây.', 13, 'PUBLISHED'
    UNION ALL
    SELECT 'N1 は なんの N2 ですか。', 'Hỏi nguyên liệu', 'Hỏi nguyên liệu (Slot 21).', 'これは なんの りょうりですか。', 'Đây là món ăn làm từ gì?', 14, 'PUBLISHED'
    UNION ALL
    SELECT 'N は ～ごで なんですか。', 'Hỏi từ trong ngôn ngữ khác', 'Hỏi từ trong ngôn ngữ khác (Slot 21).', '「ぶたにく」は えいごで なんですか。', '“Thịt lợn” trong tiếng Anh là gì?', 15, 'PUBLISHED'
    UNION ALL
    SELECT 'N1 の N2', 'Trợ từ の – nguồn gốc, xuất xứ', 'Trợ từ の – nguồn gốc, xuất xứ (Slot 21).', 'これは にほんの おちゃです。', 'Đây là trà Nhật Bản.', 16, 'PUBLISHED'
    UNION ALL
    SELECT 'N を số lượng (～つ) ください。', 'Yêu cầu số lượng', 'Yêu cầu số lượng (Slot 21).', 'コーヒーを ふたつ ください。', 'Cho tôi 2 phần cà phê.', 17, 'PUBLISHED'
    UNION ALL
    SELECT 'N1 の N2／だれの N2 ですか。', 'Trợ từ の – sở hữu, hỏi của ai', 'Trợ từ の – sở hữu, hỏi của ai (Slot 22).', 'これは だれの さいふですか。', 'Đây là ví của ai?', 18, 'PUBLISHED'
) AS seed
JOIN course AS c ON c.code = 'JPD113'
JOIN chapter AS ch ON ch.course_id = c.id AND ch.chapter_no = 2
JOIN lesson AS l ON l.chapter_id = ch.id AND l.skill_type = 'GRAMMAR'
    AND l.display_order = seed.lesson_order AND l.title = seed.meaning_vi;

-- JPD113 / Chapter 3 / Ngữ pháp: 14 mục.
INSERT INTO grammar (lesson_id, structure_name, meaning_vi, usage_explanation, example_jp, example_vi, display_order, status)
SELECT l.id, seed.structure_name, seed.meaning_vi, seed.usage_explanation, seed.example_jp, seed.example_vi, 1 AS display_order, seed.status
FROM (
    SELECT 'いま なんじですか。' AS structure_name, 'Hỏi giờ' AS meaning_vi, 'Hỏi giờ (Slot 24).' AS usage_explanation, 'いま なんじですか。' AS example_jp, 'Bây giờ là mấy giờ?' AS example_vi, 1 AS lesson_order, 'PUBLISHED' AS status
    UNION ALL
    SELECT 'N は thời gian 1 から thời gian 2 までです。', 'Chỉ khoảng thời gian', 'Chỉ khoảng thời gian (Slot 24).', 'としょかんは はちじから ごじまでです。', 'Thư viện mở từ 8 giờ đến 5 giờ.', 2, 'PUBLISHED'
    UNION ALL
    SELECT 'N は いつですか。', 'Hỏi thời điểm', 'Hỏi thời điểm (Slot 24).', 'やすみは いつですか。', 'Ngày nghỉ là khi nào?', 3, 'PUBLISHED'
    UNION ALL
    SELECT 'N は Vます。', 'Động từ khẳng định dạng ます', 'Động từ khẳng định dạng ます (Slot 26).', 'わたしは たべます。', 'Tôi ăn.', 4, 'PUBLISHED'
    UNION ALL
    SELECT 'N を Vます。', 'Trợ từ を – đối tượng tác động', 'Trợ từ を – đối tượng tác động (Slot 26).', 'すしを たべます。', 'Ăn sushi.', 5, 'PUBLISHED'
    UNION ALL
    SELECT 'Địa điểm へ いきます／かえります。', 'Trợ từ へ – hướng di chuyển', 'Trợ từ へ – hướng di chuyển (Slot 26).', 'がっこうへ いきます。', 'Đi đến trường.', 6, 'PUBLISHED'
    UNION ALL
    SELECT 'Vます → Vません。', 'Động từ phủ định', 'Động từ phủ định (Slot 27).', 'ごはんを たべません。', 'Không ăn cơm.', 7, 'PUBLISHED'
    UNION ALL
    SELECT 'Địa điểm で N を Vます。', 'Trợ từ で – nơi diễn ra hành động', 'Trợ từ で – nơi diễn ra hành động (Slot 27).', 'きっさてんで コーヒーを のみます。', 'Uống cà phê ở quán cà phê.', 8, 'PUBLISHED'
    UNION ALL
    SELECT 'まいにち／まいあさ／まいばん + Vます。', 'Thời gian chỉ thói quen', 'Thời gian chỉ thói quen (Slot 28).', 'まいあさ、たまごを たべます。', 'Mỗi sáng tôi ăn trứng.', 9, 'PUBLISHED'
    UNION ALL
    SELECT 'N1 や N2 など', 'Trợ từ や～など – liệt kê mở', 'Trợ từ や～など – liệt kê mở (Slot 28).', 'パンや たまごなどを たべます。', 'Ăn bánh mì, trứng, v.v.', 10, 'PUBLISHED'
    UNION ALL
    SELECT 'なにも Vません。', 'Phủ định hoàn toàn với なにも', 'Phủ định hoàn toàn với なにも (Slot 28).', 'なにも たべません。', 'Không ăn gì cả.', 11, 'PUBLISHED'
    UNION ALL
    SELECT 'Thời gian に Vます。', 'Trợ từ に – mốc thời gian', 'Trợ từ に – mốc thời gian (Slot 28).', 'はちじに おきます。', 'Thức dậy lúc 8 giờ.', 12, 'PUBLISHED'
    UNION ALL
    SELECT 'Thời gian 1 から thời gian 2 まで Vます。', 'Khoảng thời gian làm hành động', 'Khoảng thời gian làm hành động (Slot 29).', 'くじから じゅうにじまで べんきょうします。', 'Học từ 9 giờ đến 12 giờ.', 13, 'PUBLISHED'
    UNION ALL
    SELECT 'どこ（へ）も いきません。', 'Phủ định hoàn toàn với どこも', 'Phủ định hoàn toàn với どこも (Slot 29).', 'どこへも いきません。', 'Không đi đâu cả.', 14, 'PUBLISHED'
) AS seed
JOIN course AS c ON c.code = 'JPD113'
JOIN chapter AS ch ON ch.course_id = c.id AND ch.chapter_no = 3
JOIN lesson AS l ON l.chapter_id = ch.id AND l.skill_type = 'GRAMMAR'
    AND l.display_order = seed.lesson_order AND l.title = seed.meaning_vi;

-- JPD123 / Chapter 4 / Ngữ pháp: 21 mục.
INSERT INTO grammar (lesson_id, structure_name, meaning_vi, usage_explanation, example_jp, example_vi, display_order, status)
SELECT l.id, seed.structure_name, seed.meaning_vi, seed.usage_explanation, seed.example_jp, seed.example_vi, 1 AS display_order, seed.status
FROM (
    SELECT 'N1 は N2 の + phương hướng + です。' AS structure_name, 'Nói vị trí theo phương hướng' AS meaning_vi, 'Nói vị trí theo phương hướng (Slot 1–32).' AS usage_explanation, 'ハノイはベトナムの北です。' AS example_jp, 'Hà Nội nằm ở phía bắc Việt Nam.' AS example_vi, 1 AS lesson_order, 'PUBLISHED' AS status
    UNION ALL
    SELECT 'N のどこですか。', 'Hỏi vị trí trong một quốc gia', 'Hỏi vị trí trong một quốc gia (Slot 1–32).', 'ベトナムのどこですか。', 'Ở đâu của Việt Nam?', 2, 'PUBLISHED'
    UNION ALL
    SELECT 'N1 から N2 までどのくらいですか。', 'Hỏi thời gian di chuyển', 'Hỏi thời gian di chuyển (Slot 1–32).', '東京から大阪までどのくらいですか。', 'Từ Tokyo đến Osaka mất bao lâu?', 3, 'PUBLISHED'
    UNION ALL
    SELECT 'N1 から N2 まで + thời gian + くらいです。', 'Nói thời gian di chuyển', 'Nói thời gian di chuyển (Slot 1–32).', 'ベトナムから日本まで5時間くらいです。', 'Từ Việt Nam đến Nhật mất khoảng 5 tiếng.', 4, 'PUBLISHED'
    UNION ALL
    SELECT 'Phương tiện で Vます。', 'Trợ từ で chỉ phương tiện', 'Trợ từ で chỉ phương tiện (Slot 1–32).', '飛行機で日本へ行きます。', 'Đi Nhật bằng máy bay.', 5, 'PUBLISHED'
    UNION ALL
    SELECT 'N は Aいです。', 'Tính từ い – khẳng định', 'Tính từ い – khẳng định (Slot 3–34).', 'このお寺は大きいです。', 'Ngôi chùa này lớn.', 6, 'PUBLISHED'
    UNION ALL
    SELECT 'N は Aな (bỏ な) です。', 'Tính từ な – khẳng định', 'Tính từ な – khẳng định (Slot 3–34).', 'この町は静かです。', 'Thành phố này yên tĩnh.', 7, 'PUBLISHED'
    UNION ALL
    SELECT 'Aい → Aくないです。', 'Tính từ い – phủ định', 'Tính từ い – phủ định (Slot 3–34).', 'この町は大きくないです。', 'Thành phố này không lớn.', 8, 'PUBLISHED'
    UNION ALL
    SELECT 'Aな → Aじゃありません。', 'Tính từ な – phủ định', 'Tính từ な – phủ định (Slot 3–34).', 'この町は静かじゃありません。', 'Thành phố này không yên tĩnh.', 9, 'PUBLISHED'
    UNION ALL
    SELECT 'Aい + N', 'Tính từ い bổ nghĩa danh từ', 'Tính từ い bổ nghĩa danh từ (Slot 3–34).', 'これは古いお寺です。', 'Đây là ngôi chùa cổ.', 10, 'PUBLISHED'
    UNION ALL
    SELECT 'Aな (gốc từ) + な + N', 'Tính từ な bổ nghĩa danh từ', 'Tính từ な bổ nghĩa danh từ (Slot 3–34).', 'フエは静かな町です。', 'Huế là thành phố yên tĩnh.', 11, 'PUBLISHED'
    UNION ALL
    SELECT 'N はどんな N ですか。', 'Hỏi đặc điểm', 'Hỏi đặc điểm (Slot 3–34).', 'モスクワはどんなところですか。', 'Moscow là nơi như thế nào?', 12, 'PUBLISHED'
    UNION ALL
    SELECT 'N が多い／少ないです。', 'Diễn tả nhiều hoặc ít', 'Diễn tả nhiều hoặc ít (Slot 3–34).', '私の町は緑が多いです。', 'Thành phố của tôi có nhiều cây xanh.', 13, 'PUBLISHED'
    UNION ALL
    SELECT 'Địa điểm に N があります。', 'Sự tồn tại của đồ vật', 'Sự tồn tại của đồ vật (Slot 4–35).', 'ハノイにお城があります。', 'Ở Hà Nội có lâu đài.', 14, 'PUBLISHED'
    UNION ALL
    SELECT 'S1。そして、S2。', 'Nối hai câu cùng hướng ý nghĩa', 'Nối hai câu cùng hướng ý nghĩa (Slot 4–35).', 'この公園は静かです。そして、緑が多いです。', 'Công viên yên tĩnh và có nhiều cây xanh.', 15, 'PUBLISHED'
    UNION ALL
    SELECT 'S1 が、S2。', 'Nối hai ý tương phản', 'Nối hai ý tương phản (Slot 4–35).', '私の国は小さいですが、人が多いです。', 'Nước tôi nhỏ nhưng đông người.', 16, 'PUBLISHED'
    UNION ALL
    SELECT 'S + ね。', 'Trợ từ cuối câu ね', 'Trợ từ cuối câu ね (Slot 5–36).', '暑いですね。', 'Nóng nhỉ!', 17, 'PUBLISHED'
    UNION ALL
    SELECT 'N は thời gian、Aです。', 'Miêu tả thời tiết theo thời gian', 'Miêu tả thời tiết theo thời gian (Slot 5–36).', '東京は8月、暑いです。', 'Tháng 8 ở Tokyo nóng.', 18, 'PUBLISHED'
    UNION ALL
    SELECT 'とても／少し + A', 'Diễn tả mức độ rất hoặc hơi', 'Diễn tả mức độ rất hoặc hơi (Slot 5–36).', 'ロシアは冬、とても寒いです。', 'Mùa đông ở Nga rất lạnh.', 19, 'PUBLISHED'
    UNION ALL
    SELECT 'あまり + A phủ định', 'Phủ định mức độ', 'Phủ định mức độ (Slot 5–36).', '沖縄は冬、あまり寒くないです。', 'Mùa đông ở Okinawa không lạnh lắm.', 20, 'PUBLISHED'
    UNION ALL
    SELECT 'N はどうですか。', 'Hỏi cảm nhận, đặc điểm', 'Hỏi cảm nhận, đặc điểm (Slot 5–36).', 'ハノイはどうですか。', 'Hà Nội như thế nào?', 21, 'PUBLISHED'
) AS seed
JOIN course AS c ON c.code = 'JPD123'
JOIN chapter AS ch ON ch.course_id = c.id AND ch.chapter_no = 4
JOIN lesson AS l ON l.chapter_id = ch.id AND l.skill_type = 'GRAMMAR'
    AND l.display_order = seed.lesson_order AND l.title = seed.meaning_vi;

-- JPD123 / Chapter 5 / Ngữ pháp: 17 mục.
INSERT INTO grammar (lesson_id, structure_name, meaning_vi, usage_explanation, example_jp, example_vi, display_order, status)
SELECT l.id, seed.structure_name, seed.meaning_vi, seed.usage_explanation, seed.example_jp, seed.example_vi, 1 AS display_order, seed.status
FROM (
    SELECT 'Vます → Vました。' AS structure_name, 'Động từ quá khứ khẳng định' AS meaning_vi, 'Động từ quá khứ khẳng định (Slot 8–39).' AS usage_explanation, '昨日、デパートへ行きました。' AS example_jp, 'Hôm qua tôi đã đến trung tâm thương mại.' AS example_vi, 1 AS lesson_order, 'PUBLISHED' AS status
    UNION ALL
    SELECT 'Vません → Vませんでした。', 'Động từ quá khứ phủ định', 'Động từ quá khứ phủ định (Slot 8–39).', '昨日、ご飯を食べませんでした。', 'Hôm qua tôi đã không ăn cơm.', 2, 'PUBLISHED'
    UNION ALL
    SELECT 'どこか（へ）Vます／Vましたか。', 'Diễn tả đi đâu đó', 'Diễn tả đi đâu đó (Slot 8–39).', '昨日、どこかへ行きましたか。', 'Hôm qua bạn có đi đâu không?', 3, 'PUBLISHED'
    UNION ALL
    SELECT 'Người と Vます／Vました。', 'Làm hành động cùng ai', 'Làm hành động cùng ai (Slot 8–39).', '友達とサッカーをしました。', 'Tôi đã chơi bóng đá với bạn.', 4, 'PUBLISHED'
    UNION ALL
    SELECT 'S1。それから、S2。', 'Nối các hành động theo trình tự', 'Nối các hành động theo trình tự (Slot 9–40).', '友達の家へ行きました。それから、ゲームをしました。', 'Tôi đã đến nhà bạn. Sau đó chơi game.', 5, 'PUBLISHED'
    UNION ALL
    SELECT 'Aい → Aかったです。', 'Tính từ い – quá khứ khẳng định', 'Tính từ い – quá khứ khẳng định (Slot 10–41).', '昨日は暑かったです。', 'Hôm qua trời đã nóng.', 6, 'PUBLISHED'
    UNION ALL
    SELECT 'Aい → Aくなかったです。', 'Tính từ い – quá khứ phủ định', 'Tính từ い – quá khứ phủ định (Slot 10–41).', '旅行は楽しくなかったです。', 'Chuyến du lịch đã không vui.', 7, 'PUBLISHED'
    UNION ALL
    SELECT 'Aな → Aでした。', 'Tính từ な – quá khứ khẳng định', 'Tính từ な – quá khứ khẳng định (Slot 10–41).', 'テストは簡単でした。', 'Bài kiểm tra đã dễ.', 8, 'PUBLISHED'
    UNION ALL
    SELECT 'Aな → Aじゃありませんでした。', 'Tính từ な – quá khứ phủ định', 'Tính từ な – quá khứ phủ định (Slot 10–41).', 'テストは簡単じゃありませんでした。', 'Bài kiểm tra đã không dễ.', 9, 'PUBLISHED'
    UNION ALL
    SELECT 'Nでした／Nじゃありませんでした。', 'Danh từ – quá khứ', 'Danh từ – quá khứ (Slot 10–41).', '昨日は休みでした。', 'Hôm qua là ngày nghỉ.', 10, 'PUBLISHED'
    UNION ALL
    SELECT 'N はどうでしたか。', 'Hỏi cảm nhận trong quá khứ', 'Hỏi cảm nhận trong quá khứ (Slot 10–41).', '映画はどうでしたか。', 'Bộ phim đã xem thế nào?', 11, 'PUBLISHED'
    UNION ALL
    SELECT 'どうして～か。／Lý do + から。', 'Hỏi và giải thích nguyên nhân', 'Hỏi và giải thích nguyên nhân (Slot 11–42).', 'どうして買いませんでしたか。高かったですから。', 'Tại sao bạn không mua? Vì đắt.', 12, 'PUBLISHED'
    UNION ALL
    SELECT 'N がほしいです。', 'Mong muốn sở hữu', 'Mong muốn sở hữu (Slot 12–43).', '私は自転車がほしいです。', 'Tôi muốn có xe đạp.', 13, 'PUBLISHED'
    UNION ALL
    SELECT 'N がほしくないです。', 'Phủ định mong muốn sở hữu', 'Phủ định mong muốn sở hữu (Slot 12–43).', '今、お金はあまりほしくないです。', 'Bây giờ tôi không muốn có tiền lắm.', 14, 'PUBLISHED'
    UNION ALL
    SELECT 'N が好き／嫌いです。', 'Thích hoặc ghét', 'Thích hoặc ghét (Slot 12–43).', '野菜が好きです。', 'Tôi thích rau.', 15, 'PUBLISHED'
    UNION ALL
    SELECT 'Vます bỏ ます + たいです。', 'Muốn thực hiện hành động', 'Muốn thực hiện hành động (Slot 12–43).', '日本へ行きたいです。', 'Tôi muốn đi Nhật Bản.', 16, 'PUBLISHED'
    UNION ALL
    SELECT 'Địa điểm へ + Vます bỏ ます + に行きます。', 'Đi đến đâu để thực hiện hành động', 'Đi đến đâu để thực hiện hành động (Slot 13–44).', '図書館へ本を借りに行きます。', 'Tôi đến thư viện để mượn sách.', 17, 'PUBLISHED'
) AS seed
JOIN course AS c ON c.code = 'JPD123'
JOIN chapter AS ch ON ch.course_id = c.id AND ch.chapter_no = 5
JOIN lesson AS l ON l.chapter_id = ch.id AND l.skill_type = 'GRAMMAR'
    AND l.display_order = seed.lesson_order AND l.title = seed.meaning_vi;

-- JPD123 / Chapter 6 / Ngữ pháp: 15 mục.
INSERT INTO grammar (lesson_id, structure_name, meaning_vi, usage_explanation, example_jp, example_vi, display_order, status)
SELECT l.id, seed.structure_name, seed.meaning_vi, seed.usage_explanation, seed.example_jp, seed.example_vi, 1 AS display_order, seed.status
FROM (
    SELECT 'Vます → Vませんか。' AS structure_name, 'Rủ rê, mời người khác' AS meaning_vi, 'Rủ rê, mời người khác (Slot 16–46).' AS usage_explanation, '一緒にご飯を食べませんか。' AS example_jp, 'Cùng ăn cơm nhé?' AS example_vi, 1 AS lesson_order, 'PUBLISHED' AS status
    UNION ALL
    SELECT 'Vます → Vましょう。', 'Đề nghị cùng làm hành động', 'Đề nghị cùng làm hành động (Slot 16–46).', '一緒に行きましょう。', 'Chúng ta cùng đi nhé.', 2, 'PUBLISHED'
    UNION ALL
    SELECT 'Thời gian はちょっと……。', 'Từ chối lời mời lịch sự', 'Từ chối lời mời lịch sự (Slot 16–46).', 'すみません。週末はちょっと……。', 'Xin lỗi, cuối tuần thì hơi khó...', 3, 'PUBLISHED'
    UNION ALL
    SELECT 'Địa điểm で Sự kiện があります。', 'Diễn tả sự kiện ở địa điểm', 'Diễn tả sự kiện ở địa điểm (Slot 17–47).', 'FPT大学でコンサートがあります。', 'Có buổi hòa nhạc tại Đại học FPT.', 4, 'PUBLISHED'
    UNION ALL
    SELECT 'N が số + 枚 あります。', 'Trợ số từ 枚（まい）', 'Trợ số từ 枚（まい） (Slot 17–47).', 'チケットが2枚あります。', 'Có 2 tấm vé.', 5, 'PUBLISHED'
    UNION ALL
    SELECT 'N1 で N2 がいちばん Aです。', 'So sánh nhất trong một nhóm', 'So sánh nhất trong một nhóm (Slot 18–48).', '食べ物でラーメンがいちばん好きです。', 'Trong các món ăn, tôi thích ramen nhất.', 6, 'PUBLISHED'
    UNION ALL
    SELECT 'N1 と N2 とどちらが Aですか。', 'Hỏi so sánh giữa hai đối tượng', 'Hỏi so sánh giữa hai đối tượng (Slot 18–48).', '肉と魚とどちらが好きですか。', 'Thịt và cá, bạn thích cái nào hơn?', 7, 'PUBLISHED'
    UNION ALL
    SELECT 'N のほうが Aです。', 'Trả lời so sánh hơn', 'Trả lời so sánh hơn (Slot 18–48).', '魚のほうが好きです。', 'Tôi thích cá hơn.', 8, 'PUBLISHED'
    UNION ALL
    SELECT 'どちらも Aです。', 'Cả hai đều có cùng đặc điểm', 'Cả hai đều có cùng đặc điểm (Slot 18–48).', 'どちらもおいしいです。', 'Cả hai đều ngon.', 9, 'PUBLISHED'
    UNION ALL
    SELECT 'N1 は N2 より Aです。', 'So sánh hơn với より', 'So sánh hơn với より (Slot 19–49).', '飛行機は新幹線より速いです。', 'Máy bay nhanh hơn tàu Shinkansen.', 10, 'PUBLISHED'
    UNION ALL
    SELECT 'もう Vましたか。', 'Hỏi đã làm hành động chưa', 'Hỏi đã làm hành động chưa (Slot 20–50).', 'もうお好み焼きを食べましたか。', 'Bạn đã ăn okonomiyaki chưa?', 11, 'PUBLISHED'
    UNION ALL
    SELECT 'いいえ、まだです。', 'Trả lời chưa thực hiện hành động', 'Trả lời chưa thực hiện hành động (Slot 20–50).', 'いいえ、まだです。', 'Chưa, vẫn chưa.', 12, 'PUBLISHED'
    UNION ALL
    SELECT 'S + よ。', 'Trợ từ よ – thông báo, nhấn mạnh', 'Trợ từ よ – thông báo, nhấn mạnh (Slot 20–50).', 'お好み焼きはおいしいですよ。', 'Okonomiyaki ngon đấy!', 13, 'PUBLISHED'
    UNION ALL
    SELECT 'N はどうですか。', 'Đưa ra lời gợi ý', 'Đưa ra lời gợi ý (Slot 20–50).', '日曜日はどうですか。', 'Chủ nhật thì sao?', 14, 'PUBLISHED'
    UNION ALL
    SELECT 'S + ね。', 'Trợ từ ね – xác nhận thông tin', 'Trợ từ ね – xác nhận thông tin (Slot 20–50).', '6時ですね。わかりました。', '6 giờ đúng không nhỉ? Tôi hiểu rồi.', 15, 'PUBLISHED'
) AS seed
JOIN course AS c ON c.code = 'JPD123'
JOIN chapter AS ch ON ch.course_id = c.id AND ch.chapter_no = 6
JOIN lesson AS l ON l.chapter_id = ch.id AND l.skill_type = 'GRAMMAR'
    AND l.display_order = seed.lesson_order AND l.title = seed.meaning_vi;

-- JPD123 / Chapter 7 / Ngữ pháp: 15 mục.
INSERT INTO grammar (lesson_id, structure_name, meaning_vi, usage_explanation, example_jp, example_vi, display_order, status)
SELECT l.id, seed.structure_name, seed.meaning_vi, seed.usage_explanation, seed.example_jp, seed.example_vi, 1 AS display_order, seed.status
FROM (
    SELECT 'Địa điểm に N がいます。' AS structure_name, 'Sự tồn tại của người, động vật' AS meaning_vi, 'Sự tồn tại của người, động vật (Slot 23–53).' AS usage_explanation, '公園に犬がいます。' AS example_jp, 'Có con chó trong công viên.' AS example_vi, 1 AS lesson_order, 'PUBLISHED' AS status
    UNION ALL
    SELECT 'N は địa điểm にあります／います。', 'Nói vị trí tồn tại', 'Nói vị trí tồn tại (Slot 23–53).', '私は交番の前にいます。', 'Tôi đang ở trước đồn cảnh sát.', 2, 'PUBLISHED'
    UNION ALL
    SELECT 'N1 は N2 の + vị trí + にあります／います。', 'Nói vị trí tương đối', 'Nói vị trí tương đối (Slot 23–53).', '本屋はレストランの前にあります。', 'Hiệu sách ở trước nhà hàng.', 3, 'PUBLISHED'
    UNION ALL
    SELECT 'だれもいません。', 'Phủ định hoàn toàn với だれも', 'Phủ định hoàn toàn với だれも (Slot 24–54).', '教室にだれもいません。', 'Không có ai trong lớp học.', 4, 'PUBLISHED'
    UNION ALL
    SELECT 'なにもありません。', 'Phủ định hoàn toàn với なにも', 'Phủ định hoàn toàn với なにも (Slot 24–54).', '箱の中になにもありません。', 'Trong hộp không có gì cả.', 5, 'PUBLISHED'
    UNION ALL
    SELECT 'Vます → Vて', 'Chuyển động từ sang thể て', 'Chuyển động từ sang thể て (Slot 25–55).', '書きます → 書いて', 'Viết → dạng て của động từ viết.', 6, 'PUBLISHED'
    UNION ALL
    SELECT 'Vてください。', 'Yêu cầu, nhờ vả lịch sự', 'Yêu cầu, nhờ vả lịch sự (Slot 25–55).', '野菜を洗ってください。', 'Hãy rửa rau giúp tôi.', 7, 'PUBLISHED'
    UNION ALL
    SELECT 'Công cụ で Vます／Vてください。', 'Trợ từ で chỉ công cụ, cách thức', 'Trợ từ で chỉ công cụ, cách thức (Slot 25–55).', 'ペンで名前を書いてください。', 'Hãy viết tên bằng bút.', 8, 'PUBLISHED'
    UNION ALL
    SELECT 'Vます bỏ ます + 方（かた）', 'Diễn tả cách làm việc gì', 'Diễn tả cách làm việc gì (Slot 26–56).', 'カレーの作り方を教えてください。', 'Hãy chỉ cho tôi cách làm cà ri.', 9, 'PUBLISHED'
    UNION ALL
    SELECT 'どの + N ですか。', 'Hỏi danh từ nào', 'Hỏi danh từ nào (Slot 26–56).', 'どのお皿ですか。', 'Là chiếc đĩa nào?', 10, 'PUBLISHED'
    UNION ALL
    SELECT 'どれですか。', 'Hỏi cái nào', 'Hỏi cái nào (Slot 26–56).', '塩はどれですか。', 'Muối là cái nào?', 11, 'PUBLISHED'
    UNION ALL
    SELECT 'Vています。', 'Hành động đang diễn ra', 'Hành động đang diễn ra (Slot 27–57).', '日本語を勉強しています。', 'Tôi đang học tiếng Nhật.', 12, 'PUBLISHED'
    UNION ALL
    SELECT 'Vます → Vましょうか。', 'Chủ động đề nghị giúp đỡ', 'Chủ động đề nghị giúp đỡ (Slot 27–57).', '写真を撮りましょうか。', 'Để tôi chụp ảnh giúp nhé?', 13, 'PUBLISHED'
    UNION ALL
    SELECT 'だれが Vましたか。', 'Hỏi ai thực hiện hành động', 'Hỏi ai thực hiện hành động (Slot 27–57).', 'だれがこのケーキを作りましたか。', 'Ai đã làm chiếc bánh này?', 14, 'PUBLISHED'
    UNION ALL
    SELECT 'まだあります／もうありません。', 'Diễn tả vẫn còn hoặc đã hết', 'Diễn tả vẫn còn hoặc đã hết (Slot 27–57).', 'ビールはまだありますか。いいえ、もうありません。', 'Vẫn còn bia không? Không, hết rồi.', 15, 'PUBLISHED'
) AS seed
JOIN course AS c ON c.code = 'JPD123'
JOIN chapter AS ch ON ch.course_id = c.id AND ch.chapter_no = 7
JOIN lesson AS l ON l.chapter_id = ch.id AND l.skill_type = 'GRAMMAR'
    AND l.display_order = seed.lesson_order AND l.title = seed.meaning_vi;
