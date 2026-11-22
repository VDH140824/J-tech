-- MySQL 8.0+: select the existing J-Tech database before running this script.
-- Schema for the student Listening page and the AI Reading generator.
--   listening_exercise : one exercise per LISTENING lesson (lesson_id, unique);
--                        video is optional because audio is read by browser TTS.
--   reading_session    : AI passages are stored per session (passage_data JSON),
--                        so reading_passage_id becomes optional; scope columns
--                        (course/chapter/lesson) drive history and lesson completion.
--   lesson_section_progress.section_type : adds LISTENING and READING.
-- DDL commits implicitly, so each step checks information_schema and is safe to rerun.

-- listening_exercise.lesson_id
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'listening_exercise' AND COLUMN_NAME = 'lesson_id') = 0,
  'ALTER TABLE listening_exercise
     ADD COLUMN lesson_id BIGINT UNSIGNED NULL AFTER chapter_id,
     ADD UNIQUE KEY uq_listening_exercise_lesson (lesson_id),
     ADD CONSTRAINT fk_listening_exercise_lesson FOREIGN KEY (lesson_id) REFERENCES lesson (id)',
  'DO 0');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

ALTER TABLE listening_exercise
  MODIFY COLUMN video_url VARCHAR(500) NULL,
  MODIFY COLUMN video_public_id VARCHAR(255) NULL;

-- reading_session: AI-generated passages
ALTER TABLE reading_session MODIFY COLUMN reading_passage_id BIGINT UNSIGNED NULL;

SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reading_session' AND COLUMN_NAME = 'passage_data') = 0,
  'ALTER TABLE reading_session
     ADD COLUMN course_id BIGINT UNSIGNED NULL AFTER reading_passage_id,
     ADD COLUMN chapter_id BIGINT UNSIGNED NULL AFTER course_id,
     ADD COLUMN lesson_id BIGINT UNSIGNED NULL AFTER chapter_id,
     ADD COLUMN passage_data JSON NULL AFTER questions_data,
     ADD KEY idx_reading_session_user_created (user_id, created_at),
     ADD CONSTRAINT fk_reading_session_course FOREIGN KEY (course_id) REFERENCES course (id),
     ADD CONSTRAINT fk_reading_session_chapter FOREIGN KEY (chapter_id) REFERENCES chapter (id),
     ADD CONSTRAINT fk_reading_session_lesson FOREIGN KEY (lesson_id) REFERENCES lesson (id)',
  'DO 0');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- lesson_section_progress: completion of LISTENING / READING lessons
ALTER TABLE lesson_section_progress
  MODIFY COLUMN section_type ENUM('VOCABULARY','KANJI','GRAMMAR','LISTENING','READING') NOT NULL;
