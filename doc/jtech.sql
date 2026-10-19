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
  audio_url VARCHAR(500) NULL,
  audio_public_id VARCHAR(255) NULL,
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
  item_type ENUM('BADGE','AVATAR_FRAME','THEME') NOT NULL,
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
  name VARCHAR(150) NOT NULL,
  course_id BIGINT UNSIGNED NOT NULL,
  moderator_id BIGINT UNSIGNED NOT NULL,
  description TEXT NULL DEFAULT NULL,
  status ENUM('ACTIVE','ARCHIVED','CLOSED') NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_classroom_code (code),
  FOREIGN KEY (course_id) REFERENCES course (id),
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

-- =============================================================================
-- DỮ LIỆU KHỞI TẠO MẶC ĐỊNH
-- =============================================================================
INSERT INTO role (id, code, name, description) VALUES
  (1, 'STUDENT', 'Học viên', 'Tài khoản học viên'),
  (2, 'MODERATOR', 'Kiểm duyệt viên', 'Quản lý nội dung'),
  (3, 'ADMIN', 'Quản trị viên', 'Quản trị hệ thống'),
  (4, 'Teacher', 'Giáo viên', 'Quản lí lớp học');


INSERT INTO course (code, name, description, display_order, status) VALUES
('JPD113', 'Nhật 1', 'Môn Nhật 1', 1, 'PUBLISHED'),
('JPD123', 'Nhật 2', 'Môn Nhật 2', 2, 'PUBLISHED');

INSERT INTO chapter (course_id, chapter_no, title, display_order, status) VALUES
(1, 1, 'Chương 1', 1, 'PUBLISHED'),
(1, 2, 'Chương 2', 2, 'PUBLISHED'),
(1, 3, 'Chương 3', 3, 'PUBLISHED'),
(2, 1, 'Chương 4', 1, 'PUBLISHED'),
(2, 2, 'Chương 5', 2, 'PUBLISHED'),
(2, 3, 'Chương 6', 3, 'PUBLISHED');
