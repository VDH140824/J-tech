-- =============================================================================
-- JTECH DATABASE SCHEMA (MYSQL 8.0+ EDITION)
-- Tổng số bảng: 49 bảng (48 bảng từ thiết kế mới + bảng refresh_token từ DB cũ)
-- Charset: utf8mb4 / Collation: utf8mb4_unicode_ci / Engine: InnoDB
-- Đã tối ưu hóa tương thích 100% với MySQL 8.0+ (xử lý giới hạn Error 3823)
-- =============================================================================

CREATE DATABASE IF NOT EXISTS jtech CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE jtech;

-- Tắt kiểm tra khóa ngoại tạm thời để DROP TABLE an toàn khi chạy lại script
SET FOREIGN_KEY_CHECKS = 0;

-- Nhóm 7: Thông báo, phản hồi, AI, hệ thống
DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS system_setting;
DROP TABLE IF EXISTS ai_usage_log;
DROP TABLE IF EXISTS ai_feature_config;
DROP TABLE IF EXISTS feedback;
DROP TABLE IF EXISTS notification;
DROP TABLE IF EXISTS study_reminder;

-- Nhóm 6: Game, xu, chuỗi, cửa hàng
DROP TABLE IF EXISTS user_inventory;
DROP TABLE IF EXISTS store_item;
DROP TABLE IF EXISTS coin_transaction;
DROP TABLE IF EXISTS streak_milestone_achievement;
DROP TABLE IF EXISTS user_streak;
DROP TABLE IF EXISTS streak_milestone;
DROP TABLE IF EXISTS reward_rule;
DROP TABLE IF EXISTS game_session_answer;
DROP TABLE IF EXISTS game_session;
DROP TABLE IF EXISTS game;

-- Nhóm 4: Câu hỏi, bài tập, test, tiến độ
DROP TABLE IF EXISTS lesson_section_progress;
DROP TABLE IF EXISTS practice_attempt_answer;
DROP TABLE IF EXISTS practice_attempt;
DROP TABLE IF EXISTS test_attempt_answer;
DROP TABLE IF EXISTS test_attempt;
DROP TABLE IF EXISTS test_part_question;
DROP TABLE IF EXISTS test_part;
DROP TABLE IF EXISTS test;
DROP TABLE IF EXISTS question_matching_pair;
DROP TABLE IF EXISTS question_accepted_answer;
DROP TABLE IF EXISTS question_option;
DROP TABLE IF EXISTS question;

-- Nhóm 5: Đọc – Nghe – Nói và Chia thể
DROP TABLE IF EXISTS speaking_turn;
DROP TABLE IF EXISTS speaking_session;
DROP TABLE IF EXISTS reading_session_question;
DROP TABLE IF EXISTS reading_session;
DROP TABLE IF EXISTS conjugation_form;
DROP TABLE IF EXISTS speaking_script_line;
DROP TABLE IF EXISTS speaking_scenario;
DROP TABLE IF EXISTS listening_exercise;
DROP TABLE IF EXISTS reading_passage;

-- Nhóm 3: Từ vựng, Kanji, Flashcard
DROP TABLE IF EXISTS flashcard_progress;
DROP TABLE IF EXISTS kanji;
DROP TABLE IF EXISTS vocabulary;

-- Nhóm 2: Cấu trúc nội dung
DROP TABLE IF EXISTS lesson_document;
DROP TABLE IF EXISTS grammar;
DROP TABLE IF EXISTS lesson;
DROP TABLE IF EXISTS chapter;
DROP TABLE IF EXISTS course;

-- Nhóm 1: Tài khoản (kèm refresh_token từ DB cũ)
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS refresh_token;
DROP TABLE IF EXISTS user_account;
DROP TABLE IF EXISTS role;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- NHÓM 1: TÀI KHOẢN (GIỮ NGUYÊN CẤU TRÚC DB CŨ & ĐỒNG BỘ THIẾT KẾ MỚI)
-- =============================================================================

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

-- Giữ lại bảng refresh_token từ thiết kế DB cũ
CREATE TABLE refresh_token (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  token VARCHAR(512) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_refresh_user FOREIGN KEY (user_id) REFERENCES user_account(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================================================================
-- NHÓM 2: CẤU TRÚC NỘI DUNG
-- =============================================================================

CREATE TABLE course (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  description TEXT NULL,
  thumbnail_url VARCHAR(500) NULL,
  thumbnail_public_id VARCHAR(255) NULL,
  display_order INT NOT NULL DEFAULT 0,
  status ENUM('DRAFT','PUBLISHED','HIDDEN','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_course_creator FOREIGN KEY (created_by) REFERENCES user_account(id),
  CONSTRAINT fk_course_updater FOREIGN KEY (updated_by) REFERENCES user_account(id)
) ENGINE=InnoDB;

CREATE TABLE chapter (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  course_id BIGINT UNSIGNED NOT NULL,
  chapter_no SMALLINT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NULL,
  display_order INT NOT NULL DEFAULT 0,
  status ENUM('DRAFT','PUBLISHED','HIDDEN','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_chapter_course_no UNIQUE (course_id, chapter_no),
  CONSTRAINT fk_chapter_course FOREIGN KEY (course_id) REFERENCES course(id),
  CONSTRAINT fk_chapter_creator FOREIGN KEY (created_by) REFERENCES user_account(id),
  CONSTRAINT fk_chapter_updater FOREIGN KEY (updated_by) REFERENCES user_account(id)
) ENGINE=InnoDB;

CREATE TABLE lesson (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  chapter_id BIGINT UNSIGNED NOT NULL,
  lesson_no SMALLINT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NULL,
  display_order INT NOT NULL DEFAULT 0,
  status ENUM('DRAFT','PUBLISHED','HIDDEN','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_lesson_chapter_no UNIQUE (chapter_id, lesson_no),
  CONSTRAINT fk_lesson_chapter FOREIGN KEY (chapter_id) REFERENCES chapter(id),
  CONSTRAINT fk_lesson_creator FOREIGN KEY (created_by) REFERENCES user_account(id),
  CONSTRAINT fk_lesson_updater FOREIGN KEY (updated_by) REFERENCES user_account(id)
) ENGINE=InnoDB;

CREATE TABLE grammar (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
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
  updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_grammar_lesson FOREIGN KEY (lesson_id) REFERENCES lesson(id),
  CONSTRAINT fk_grammar_creator FOREIGN KEY (created_by) REFERENCES user_account(id),
  CONSTRAINT fk_grammar_updater FOREIGN KEY (updated_by) REFERENCES user_account(id)
) ENGINE=InnoDB;

CREATE TABLE lesson_document (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  lesson_id BIGINT UNSIGNED NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_public_id VARCHAR(255) NOT NULL,
  skill ENUM('VOCABULARY','KANJI','GRAMMAR') NOT NULL,
  file_type VARCHAR(20) NOT NULL,
  file_size_bytes INT UNSIGNED NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_lesson_document_lesson FOREIGN KEY (lesson_id) REFERENCES lesson(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================================================================
-- NHÓM 3: TỪ VỰNG, KANJI, FLASHCARD
-- =============================================================================

CREATE TABLE vocabulary (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
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
  updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_vocabulary_lesson FOREIGN KEY (lesson_id) REFERENCES lesson(id),
  CONSTRAINT fk_vocabulary_creator FOREIGN KEY (created_by) REFERENCES user_account(id),
  CONSTRAINT fk_vocabulary_updater FOREIGN KEY (updated_by) REFERENCES user_account(id)
) ENGINE=InnoDB;

CREATE TABLE kanji (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
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
  updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_kanji_lesson FOREIGN KEY (lesson_id) REFERENCES lesson(id),
  CONSTRAINT fk_kanji_creator FOREIGN KEY (created_by) REFERENCES user_account(id),
  CONSTRAINT fk_kanji_updater FOREIGN KEY (updated_by) REFERENCES user_account(id)
) ENGINE=InnoDB;

-- Ràng buộc nghiệp vụ chk_fc_one_item: Đúng 1 trong 2 cột (vocabulary_id, kanji_id) có giá trị.
-- (Trên MySQL 8.0+, không đặt CHECK trực tiếp trên cột có FOREIGN KEY để tránh Error 3823)
CREATE TABLE flashcard_progress (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  vocabulary_id BIGINT UNSIGNED NULL,
  kanji_id BIGINT UNSIGNED NULL,
  flip_status ENUM('NOT_REMEMBERED','REMEMBERED') NULL,
  srs_state ENUM('NEW','LEARNING','REVIEW') NOT NULL DEFAULT 'NEW',
  ease_factor DECIMAL(4,2) NOT NULL DEFAULT 2.50,
  interval_days INT UNSIGNED NOT NULL DEFAULT 0,
  repetition_count INT UNSIGNED NOT NULL DEFAULT 0,
  due_at DATETIME NULL,
  last_reviewed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_flashcard_user_vocab UNIQUE (user_id, vocabulary_id),
  CONSTRAINT uq_flashcard_user_kanji UNIQUE (user_id, kanji_id),
  CONSTRAINT fk_flashcard_user FOREIGN KEY (user_id) REFERENCES user_account(id) ON DELETE CASCADE,
  CONSTRAINT fk_flashcard_vocabulary FOREIGN KEY (vocabulary_id) REFERENCES vocabulary(id),
  CONSTRAINT fk_flashcard_kanji FOREIGN KEY (kanji_id) REFERENCES kanji(id)
) ENGINE=InnoDB;

-- =============================================================================
-- NHÓM 5: ĐỌC – NGHE – NÓI VÀ CHIA THỂ
-- (Khởi tạo trước Nhóm 4 để bảng `question` và `practice_attempt` tham chiếu FK
-- tới `listening_exercise` và `conjugation_form`)
-- =============================================================================

CREATE TABLE reading_passage (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  chapter_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  content_jp MEDIUMTEXT NOT NULL,
  translation_vi MEDIUMTEXT NULL,
  display_order INT NOT NULL DEFAULT 0,
  status ENUM('DRAFT','PUBLISHED','HIDDEN','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_reading_passage_chapter FOREIGN KEY (chapter_id) REFERENCES chapter(id),
  CONSTRAINT fk_reading_passage_creator FOREIGN KEY (created_by) REFERENCES user_account(id),
  CONSTRAINT fk_reading_passage_updater FOREIGN KEY (updated_by) REFERENCES user_account(id)
) ENGINE=InnoDB;

CREATE TABLE listening_exercise (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
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
  updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_listening_exercise_chapter FOREIGN KEY (chapter_id) REFERENCES chapter(id),
  CONSTRAINT fk_listening_exercise_creator FOREIGN KEY (created_by) REFERENCES user_account(id),
  CONSTRAINT fk_listening_exercise_updater FOREIGN KEY (updated_by) REFERENCES user_account(id)
) ENGINE=InnoDB;

CREATE TABLE speaking_scenario (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  chapter_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  situation TEXT NOT NULL,
  ai_role VARCHAR(100) NOT NULL,
  student_role VARCHAR(100) NOT NULL,
  max_turns TINYINT UNSIGNED NOT NULL DEFAULT 20,
  display_order INT NOT NULL DEFAULT 0,
  status ENUM('DRAFT','PUBLISHED','HIDDEN','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_speaking_scenario_chapter FOREIGN KEY (chapter_id) REFERENCES chapter(id),
  CONSTRAINT fk_speaking_scenario_creator FOREIGN KEY (created_by) REFERENCES user_account(id),
  CONSTRAINT fk_speaking_scenario_updater FOREIGN KEY (updated_by) REFERENCES user_account(id),
  CONSTRAINT chk_speaking_max_turns CHECK (max_turns BETWEEN 1 AND 20)
) ENGINE=InnoDB;

CREATE TABLE speaking_script_line (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  scenario_id BIGINT UNSIGNED NOT NULL,
  line_no SMALLINT UNSIGNED NOT NULL,
  speaker ENUM('AI','STUDENT') NOT NULL,
  text_jp VARCHAR(500) NOT NULL,
  reading_kana VARCHAR(500) NULL,
  meaning_vi VARCHAR(500) NOT NULL,
  audio_url VARCHAR(500) NULL,
  audio_public_id VARCHAR(255) NULL,
  CONSTRAINT uq_speaking_script_line UNIQUE (scenario_id, line_no),
  CONSTRAINT fk_speaking_script_scenario FOREIGN KEY (scenario_id) REFERENCES speaking_scenario(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE conjugation_form (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(30) NOT NULL UNIQUE,
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
  updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_conjugation_form_creator FOREIGN KEY (created_by) REFERENCES user_account(id),
  CONSTRAINT fk_conjugation_form_updater FOREIGN KEY (updated_by) REFERENCES user_account(id)
) ENGINE=InnoDB;

CREATE TABLE reading_session (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  reading_passage_id BIGINT UNSIGNED NOT NULL,
  status ENUM('GENERATED','SUBMITTED','FAILED') NOT NULL DEFAULT 'GENERATED',
  total_questions SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  correct_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  input_tokens INT UNSIGNED NOT NULL DEFAULT 0,
  output_tokens INT UNSIGNED NOT NULL DEFAULT 0,
  coin_awarded INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  submitted_at DATETIME NULL,
  CONSTRAINT fk_reading_session_user FOREIGN KEY (user_id) REFERENCES user_account(id) ON DELETE CASCADE,
  CONSTRAINT fk_reading_session_passage FOREIGN KEY (reading_passage_id) REFERENCES reading_passage(id)
) ENGINE=InnoDB;

CREATE TABLE reading_session_question (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  session_id BIGINT UNSIGNED NOT NULL,
  question_no SMALLINT UNSIGNED NOT NULL,
  question_text TEXT NOT NULL,
  options JSON NOT NULL,
  correct_option_index TINYINT UNSIGNED NOT NULL,
  explanation TEXT NULL,
  selected_option_index TINYINT UNSIGNED NULL,
  is_correct BOOLEAN NULL,
  CONSTRAINT uq_reading_session_question UNIQUE (session_id, question_no),
  CONSTRAINT fk_reading_question_session FOREIGN KEY (session_id) REFERENCES reading_session(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE speaking_session (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  scenario_id BIGINT UNSIGNED NOT NULL,
  status ENUM('IN_PROGRESS','COMPLETED','ABANDONED') NOT NULL DEFAULT 'IN_PROGRESS',
  turn_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  overall_feedback TEXT NULL,
  input_tokens INT UNSIGNED NOT NULL DEFAULT 0,
  output_tokens INT UNSIGNED NOT NULL DEFAULT 0,
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME NULL,
  CONSTRAINT fk_speaking_session_user FOREIGN KEY (user_id) REFERENCES user_account(id) ON DELETE CASCADE,
  CONSTRAINT fk_speaking_session_scenario FOREIGN KEY (scenario_id) REFERENCES speaking_scenario(id)
) ENGINE=InnoDB;

CREATE TABLE speaking_turn (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  session_id BIGINT UNSIGNED NOT NULL,
  turn_no SMALLINT UNSIGNED NOT NULL,
  script_line_id BIGINT UNSIGNED NULL,
  student_transcript TEXT NOT NULL,
  pronunciation_feedback TEXT NULL,
  corrections JSON NULL,
  ai_reply TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_speaking_turn UNIQUE (session_id, turn_no),
  CONSTRAINT fk_speaking_turn_session FOREIGN KEY (session_id) REFERENCES speaking_session(id) ON DELETE CASCADE,
  CONSTRAINT fk_speaking_turn_script_line FOREIGN KEY (script_line_id) REFERENCES speaking_script_line(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =============================================================================
-- NHÓM 4: CÂU HỎI, BÀI TẬP, TEST, TIẾN ĐỘ
-- =============================================================================

-- Ràng buộc nghiệp vụ chk_question_owner:
-- VOCABULARY/KANJI/GRAMMAR gắn lesson_id; LISTENING gắn listening_exercise_id; CONJUGATION gắn conjugation_form_id.
CREATE TABLE question (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  skill ENUM('VOCABULARY','KANJI','GRAMMAR','LISTENING','CONJUGATION') NOT NULL,
  question_type ENUM('MCQ','FILL_IN','MATCHING') NOT NULL,
  lesson_id BIGINT UNSIGNED NULL,
  listening_exercise_id BIGINT UNSIGNED NULL,
  conjugation_form_id BIGINT UNSIGNED NULL,
  content TEXT NOT NULL,
  media_url VARCHAR(500) NULL,
  media_public_id VARCHAR(255) NULL,
  explanation TEXT NULL,
  status ENUM('ACTIVE','ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_question_lesson FOREIGN KEY (lesson_id) REFERENCES lesson(id),
  CONSTRAINT fk_question_listening FOREIGN KEY (listening_exercise_id) REFERENCES listening_exercise(id),
  CONSTRAINT fk_question_conjugation FOREIGN KEY (conjugation_form_id) REFERENCES conjugation_form(id),
  CONSTRAINT fk_question_creator FOREIGN KEY (created_by) REFERENCES user_account(id),
  CONSTRAINT fk_question_updater FOREIGN KEY (updated_by) REFERENCES user_account(id)
) ENGINE=InnoDB;

CREATE TABLE question_option (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  question_id BIGINT UNSIGNED NOT NULL,
  option_text VARCHAR(500) NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_question_option_question FOREIGN KEY (question_id) REFERENCES question(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE question_accepted_answer (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  question_id BIGINT UNSIGNED NOT NULL,
  answer_text VARCHAR(255) NOT NULL,
  script_type ENUM('VIETNAMESE','KANJI','HIRAGANA','KATAKANA','MIXED') NOT NULL,
  CONSTRAINT uq_question_accepted_answer UNIQUE (question_id, answer_text),
  CONSTRAINT fk_qaa_question FOREIGN KEY (question_id) REFERENCES question(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE question_matching_pair (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  question_id BIGINT UNSIGNED NOT NULL,
  left_text VARCHAR(255) NOT NULL,
  right_text VARCHAR(255) NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_qmp_question FOREIGN KEY (question_id) REFERENCES question(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Ràng buộc nghiệp vụ chk_test_scope: LESSON chỉ có lesson_id, CHAPTER chỉ có chapter_id.
CREATE TABLE test (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  test_type ENUM('LESSON','CHAPTER') NOT NULL,
  lesson_id BIGINT UNSIGNED NULL,
  chapter_id BIGINT UNSIGNED NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NULL,
  duration_minutes SMALLINT UNSIGNED NOT NULL,
  passing_score DECIMAL(5,2) NOT NULL,
  status ENUM('DRAFT','PUBLISHED','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_test_lesson FOREIGN KEY (lesson_id) REFERENCES lesson(id),
  CONSTRAINT fk_test_chapter FOREIGN KEY (chapter_id) REFERENCES chapter(id),
  CONSTRAINT fk_test_creator FOREIGN KEY (created_by) REFERENCES user_account(id),
  CONSTRAINT fk_test_updater FOREIGN KEY (updated_by) REFERENCES user_account(id),
  CONSTRAINT chk_test_duration CHECK (duration_minutes > 0),
  CONSTRAINT chk_test_passing_score CHECK (passing_score BETWEEN 0 AND 100)
) ENGINE=InnoDB;

CREATE TABLE test_part (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  test_id BIGINT UNSIGNED NOT NULL,
  part_type ENUM('VOCABULARY','KANJI','GRAMMAR') NOT NULL,
  question_count SMALLINT UNSIGNED NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  CONSTRAINT uq_test_part UNIQUE (test_id, part_type),
  CONSTRAINT fk_test_part_test FOREIGN KEY (test_id) REFERENCES test(id) ON DELETE CASCADE,
  CONSTRAINT chk_test_part_question_count CHECK (question_count > 0)
) ENGINE=InnoDB;

CREATE TABLE test_part_question (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  test_part_id BIGINT UNSIGNED NOT NULL,
  question_id BIGINT UNSIGNED NOT NULL,
  CONSTRAINT uq_test_part_question UNIQUE (test_part_id, question_id),
  CONSTRAINT fk_tpq_test_part FOREIGN KEY (test_part_id) REFERENCES test_part(id) ON DELETE CASCADE,
  CONSTRAINT fk_tpq_question FOREIGN KEY (question_id) REFERENCES question(id)
) ENGINE=InnoDB;

CREATE TABLE test_attempt (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  test_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  attempt_no INT UNSIGNED NOT NULL,
  started_at DATETIME NOT NULL,
  deadline_at DATETIME NOT NULL,
  submitted_at DATETIME NULL,
  status ENUM('IN_PROGRESS','SUBMITTED','AUTO_SUBMITTED') NOT NULL DEFAULT 'IN_PROGRESS',
  total_questions SMALLINT UNSIGNED NOT NULL,
  correct_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  score DECIMAL(5,2) NULL,
  is_passed BOOLEAN NULL,
  coin_awarded INT UNSIGNED NOT NULL DEFAULT 0,
  CONSTRAINT uq_test_attempt UNIQUE (test_id, user_id, attempt_no),
  CONSTRAINT fk_test_attempt_test FOREIGN KEY (test_id) REFERENCES test(id),
  CONSTRAINT fk_test_attempt_user FOREIGN KEY (user_id) REFERENCES user_account(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE test_attempt_answer (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  attempt_id BIGINT UNSIGNED NOT NULL,
  question_id BIGINT UNSIGNED NOT NULL,
  part_type ENUM('VOCABULARY','KANJI','GRAMMAR') NOT NULL,
  display_order SMALLINT UNSIGNED NOT NULL,
  option_order JSON NULL,
  selected_option_id BIGINT UNSIGNED NULL,
  answer_text VARCHAR(255) NULL,
  matching_answer JSON NULL,
  is_correct BOOLEAN NULL,
  points_earned DECIMAL(6,2) NOT NULL DEFAULT 0,
  CONSTRAINT uq_test_attempt_answer UNIQUE (attempt_id, question_id),
  CONSTRAINT fk_taa_attempt FOREIGN KEY (attempt_id) REFERENCES test_attempt(id) ON DELETE CASCADE,
  CONSTRAINT fk_taa_question FOREIGN KEY (question_id) REFERENCES question(id),
  CONSTRAINT fk_taa_selected_option FOREIGN KEY (selected_option_id) REFERENCES question_option(id)
) ENGINE=InnoDB;

-- Ràng buộc nghiệp vụ chk_practice_ref: Mỗi lượt gắn đúng 1 đối tượng theo activity_type.
CREATE TABLE practice_attempt (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  activity_type ENUM('LESSON_EXERCISE','LISTENING','CONJUGATION') NOT NULL,
  lesson_id BIGINT UNSIGNED NULL,
  listening_exercise_id BIGINT UNSIGNED NULL,
  conjugation_form_id BIGINT UNSIGNED NULL,
  started_at DATETIME NOT NULL,
  submitted_at DATETIME NULL,
  total_questions SMALLINT UNSIGNED NOT NULL,
  correct_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  score DECIMAL(5,2) NULL,
  coin_awarded INT UNSIGNED NOT NULL DEFAULT 0,
  CONSTRAINT fk_practice_attempt_user FOREIGN KEY (user_id) REFERENCES user_account(id) ON DELETE CASCADE,
  CONSTRAINT fk_practice_attempt_lesson FOREIGN KEY (lesson_id) REFERENCES lesson(id),
  CONSTRAINT fk_practice_attempt_listening FOREIGN KEY (listening_exercise_id) REFERENCES listening_exercise(id),
  CONSTRAINT fk_practice_attempt_conjugation FOREIGN KEY (conjugation_form_id) REFERENCES conjugation_form(id)
) ENGINE=InnoDB;

CREATE TABLE practice_attempt_answer (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  attempt_id BIGINT UNSIGNED NOT NULL,
  question_id BIGINT UNSIGNED NOT NULL,
  display_order SMALLINT UNSIGNED NOT NULL,
  selected_option_id BIGINT UNSIGNED NULL,
  answer_text VARCHAR(255) NULL,
  matching_answer JSON NULL,
  is_correct BOOLEAN NULL,
  CONSTRAINT uq_practice_attempt_answer UNIQUE (attempt_id, question_id),
  CONSTRAINT fk_paa_attempt FOREIGN KEY (attempt_id) REFERENCES practice_attempt(id) ON DELETE CASCADE,
  CONSTRAINT fk_paa_question FOREIGN KEY (question_id) REFERENCES question(id),
  CONSTRAINT fk_paa_selected_option FOREIGN KEY (selected_option_id) REFERENCES question_option(id)
) ENGINE=InnoDB;

CREATE TABLE lesson_section_progress (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  lesson_id BIGINT UNSIGNED NOT NULL,
  document_viewed_at DATETIME NULL,
  video_completed_at DATETIME NULL,
  exercise_completed_at DATETIME NULL,
  best_exercise_score DECIMAL(5,2) NULL,
  section_type ENUM('VOCABULARY','KANJI','GRAMMAR') NOT NULL,
  updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_lesson_section_progress UNIQUE (user_id, lesson_id, section_type),
  CONSTRAINT fk_lsp_user FOREIGN KEY (user_id) REFERENCES user_account(id) ON DELETE CASCADE,
  CONSTRAINT fk_lsp_lesson FOREIGN KEY (lesson_id) REFERENCES lesson(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================================================================
-- NHÓM 6: GAME, XU, CHUỖI, CỬA HÀNG
-- =============================================================================

CREATE TABLE game (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  supported_content SET('VOCABULARY','KANJI') NOT NULL,
  questions_per_session SMALLINT UNSIGNED NOT NULL DEFAULT 10,
  time_limit_sec INT UNSIGNED NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by BIGINT UNSIGNED NULL,
  updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_game_updater FOREIGN KEY (updated_by) REFERENCES user_account(id)
) ENGINE=InnoDB;

-- Ràng buộc nghiệp vụ chk_game_scope: Phạm vi LESSON chỉ có lesson_id, CHAPTER chỉ có chapter_id.
CREATE TABLE game_session (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  game_id BIGINT UNSIGNED NOT NULL,
  scope_type ENUM('LESSON','CHAPTER') NOT NULL,
  lesson_id BIGINT UNSIGNED NULL,
  chapter_id BIGINT UNSIGNED NULL,
  content_type ENUM('VOCABULARY','KANJI','ALL') NOT NULL,
  status ENUM('IN_PROGRESS','COMPLETED','ABANDONED') NOT NULL DEFAULT 'IN_PROGRESS',
  score INT UNSIGNED NOT NULL DEFAULT 0,
  correct_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  total_questions SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  coin_awarded INT UNSIGNED NOT NULL DEFAULT 0,
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME NULL,
  CONSTRAINT fk_game_session_user FOREIGN KEY (user_id) REFERENCES user_account(id) ON DELETE CASCADE,
  CONSTRAINT fk_game_session_game FOREIGN KEY (game_id) REFERENCES game(id),
  CONSTRAINT fk_game_session_lesson FOREIGN KEY (lesson_id) REFERENCES lesson(id),
  CONSTRAINT fk_game_session_chapter FOREIGN KEY (chapter_id) REFERENCES chapter(id)
) ENGINE=InnoDB;

-- Ràng buộc nghiệp vụ chk_gsa_one_item: Đúng 1 trong 2 cột (vocabulary_id, kanji_id) có giá trị.
CREATE TABLE game_session_answer (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  session_id BIGINT UNSIGNED NOT NULL,
  vocabulary_id BIGINT UNSIGNED NULL,
  kanji_id BIGINT UNSIGNED NULL,
  prompt_text VARCHAR(500) NOT NULL,
  user_answer VARCHAR(255) NULL,
  correct_answer VARCHAR(255) NOT NULL,
  is_correct BOOLEAN NOT NULL,
  answered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_gsa_session FOREIGN KEY (session_id) REFERENCES game_session(id) ON DELETE CASCADE,
  CONSTRAINT fk_gsa_vocabulary FOREIGN KEY (vocabulary_id) REFERENCES vocabulary(id),
  CONSTRAINT fk_gsa_kanji FOREIGN KEY (kanji_id) REFERENCES kanji(id)
) ENGINE=InnoDB;

CREATE TABLE reward_rule (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  activity_code ENUM('LESSON_EXERCISE','LESSON_TEST','CHAPTER_TEST','LISTENING','READING','CONJUGATION','GAME') NOT NULL UNIQUE,
  coin_amount INT UNSIGNED NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  description VARCHAR(255) NULL,
  updated_by BIGINT UNSIGNED NULL,
  updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_reward_rule_updater FOREIGN KEY (updated_by) REFERENCES user_account(id)
) ENGINE=InnoDB;

CREATE TABLE streak_milestone (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  day_count SMALLINT UNSIGNED NOT NULL UNIQUE,
  coin_amount INT UNSIGNED NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_streak_milestone_creator FOREIGN KEY (created_by) REFERENCES user_account(id),
  CONSTRAINT fk_streak_milestone_updater FOREIGN KEY (updated_by) REFERENCES user_account(id),
  CONSTRAINT chk_streak_milestone_positive CHECK (day_count > 0 AND coin_amount > 0)
) ENGINE=InnoDB;

CREATE TABLE user_streak (
  user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  current_streak INT UNSIGNED NOT NULL DEFAULT 0,
  longest_streak INT UNSIGNED NOT NULL DEFAULT 0,
  current_streak_start_date DATE NULL,
  last_login_date DATE NULL,
  updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_streak_user FOREIGN KEY (user_id) REFERENCES user_account(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE streak_milestone_achievement (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  milestone_id BIGINT UNSIGNED NOT NULL,
  streak_start_date DATE NOT NULL,
  achieved_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_streak_milestone_achievement UNIQUE (user_id, milestone_id, streak_start_date),
  CONSTRAINT fk_sma_user FOREIGN KEY (user_id) REFERENCES user_account(id) ON DELETE CASCADE,
  CONSTRAINT fk_sma_milestone FOREIGN KEY (milestone_id) REFERENCES streak_milestone(id)
) ENGINE=InnoDB;

CREATE TABLE coin_transaction (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  direction ENUM('EARN','SPEND') NOT NULL,
  amount INT UNSIGNED NOT NULL,
  balance_after INT UNSIGNED NOT NULL,
  source_type ENUM('LESSON_EXERCISE','LESSON_TEST','CHAPTER_TEST','LISTENING','READING','CONJUGATION','GAME','STREAK_MILESTONE','STORE_REDEMPTION') NOT NULL,
  source_ref_id BIGINT UNSIGNED NULL,
  award_key VARCHAR(120) NULL,
  description VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_coin_tx_user_award UNIQUE (user_id, award_key),
  CONSTRAINT fk_coin_tx_user FOREIGN KEY (user_id) REFERENCES user_account(id) ON DELETE CASCADE,
  CONSTRAINT chk_coin_tx_amount CHECK (amount > 0)
) ENGINE=InnoDB;

CREATE TABLE store_item (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  item_type ENUM('BADGE','FRAME','THEME') NOT NULL,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(500) NULL,
  image_url VARCHAR(500) NOT NULL,
  image_public_id VARCHAR(255) NOT NULL,
  theme_config JSON NULL,
  coin_price INT UNSIGNED NOT NULL,
  status ENUM('ACTIVE','HIDDEN','ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_store_item_creator FOREIGN KEY (created_by) REFERENCES user_account(id),
  CONSTRAINT fk_store_item_updater FOREIGN KEY (updated_by) REFERENCES user_account(id)
) ENGINE=InnoDB;

CREATE TABLE user_inventory (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  store_item_id BIGINT UNSIGNED NOT NULL,
  coin_transaction_id BIGINT UNSIGNED NOT NULL,
  is_equipped BOOLEAN NOT NULL DEFAULT FALSE,
  acquired_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_user_inventory UNIQUE (user_id, store_item_id),
  CONSTRAINT fk_user_inventory_user FOREIGN KEY (user_id) REFERENCES user_account(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_inventory_item FOREIGN KEY (store_item_id) REFERENCES store_item(id),
  CONSTRAINT fk_user_inventory_tx FOREIGN KEY (coin_transaction_id) REFERENCES coin_transaction(id)
) ENGINE=InnoDB;

-- =============================================================================
-- NHÓM 7: THÔNG BÁO, PHẢN HỒI, AI, HỆ THỐNG
-- =============================================================================

CREATE TABLE study_reminder (
  user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  remind_time TIME NOT NULL DEFAULT '20:00:00',
  last_sent_date DATE NULL,
  updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_study_reminder_user FOREIGN KEY (user_id) REFERENCES user_account(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE notification (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  content VARCHAR(1000) NOT NULL,
  link_url VARCHAR(500) NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME NULL,
  CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES user_account(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE feedback (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  feedback_type ENUM('CONTENT','TECHNICAL') NOT NULL,
  category VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  lesson_id BIGINT UNSIGNED NULL,
  question_id BIGINT UNSIGNED NULL,
  attachment_url VARCHAR(500) NULL,
  attachment_public_id VARCHAR(255) NULL,
  status ENUM('PENDING','IN_PROGRESS','RESOLVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  handled_by BIGINT UNSIGNED NULL,
  resolution_note TEXT NULL,
  resolved_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_feedback_user FOREIGN KEY (user_id) REFERENCES user_account(id) ON DELETE CASCADE,
  CONSTRAINT fk_feedback_lesson FOREIGN KEY (lesson_id) REFERENCES lesson(id) ON DELETE SET NULL,
  CONSTRAINT fk_feedback_question FOREIGN KEY (question_id) REFERENCES question(id) ON DELETE SET NULL,
  CONSTRAINT fk_feedback_handler FOREIGN KEY (handled_by) REFERENCES user_account(id)
) ENGINE=InnoDB;

CREATE TABLE ai_feature_config (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  feature_code ENUM('READING_QUESTION_GEN','SPEAKING_ROLEPLAY') NOT NULL UNIQUE,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  daily_limit_per_user SMALLINT UNSIGNED NOT NULL,
  max_tokens_per_request INT UNSIGNED NOT NULL,
  model_name VARCHAR(100) NOT NULL,
  updated_by BIGINT UNSIGNED NULL,
  updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ai_feature_config_updater FOREIGN KEY (updated_by) REFERENCES user_account(id)
) ENGINE=InnoDB;

CREATE TABLE ai_usage_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  feature_code ENUM('READING_QUESTION_GEN','SPEAKING_ROLEPLAY','CONNECTION_TEST') NOT NULL,
  reference_id BIGINT UNSIGNED NULL,
  usage_date DATE NOT NULL,
  input_tokens INT UNSIGNED NOT NULL DEFAULT 0,
  output_tokens INT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('SUCCESS','FAILED','REJECTED_QUOTA') NOT NULL,
  error_message VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ai_usage_daily (user_id, feature_code, usage_date),
  CONSTRAINT fk_ai_usage_log_user FOREIGN KEY (user_id) REFERENCES user_account(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE system_setting (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT NULL,
  is_secret BOOLEAN NOT NULL DEFAULT FALSE,
  description VARCHAR(255) NULL,
  updated_by BIGINT UNSIGNED NULL,
  updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_system_setting_updater FOREIGN KEY (updated_by) REFERENCES user_account(id)
) ENGINE=InnoDB;

CREATE TABLE audit_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NULL,
  entity_id BIGINT UNSIGNED NULL,
  level ENUM('INFO','WARN','ERROR') NOT NULL DEFAULT 'INFO',
  detail JSON NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_log_user FOREIGN KEY (user_id) REFERENCES user_account(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =============================================================================
-- DỮ LIỆU KHỞI TẠO MẶC ĐỊNH (TỪ DB CŨ)
-- =============================================================================

INSERT INTO role (id, code, name, description) VALUES
(1, 'STUDENT', 'Học viên', 'Tài khoản học viên'),
(2, 'MODERATOR', 'Kiểm duyệt viên', 'Quản lý nội dung'),
(3, 'ADMIN', 'Quản trị viên', 'Quản trị hệ thống');