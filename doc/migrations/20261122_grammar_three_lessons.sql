-- MySQL 8.0+: select the existing J-Tech database before running this script.
-- Rebalance GRAMMAR lessons into groups 1, 2, 3 within each seeded chapter:
-- JPD113 chapters 1-3 and JPD123 chapters 4-7.
-- Preserve content order (display_order, then id). Larger groups come first,
-- and group sizes differ by at most one. A chapter needs at least 3 records
-- to have all 3 groups. Draft/hidden/archived records are included as well.
-- Seed distribution: chapter 1 = 3/3/2; 2 = 6/6/6; 3 = 5/5/4;
-- chapter 4 = 7/7/7; 5 = 6/6/5; 6 = 5/5/5; 7 = 5/5/5.
-- Only lesson_no changes: IDs, display_order, grammar, exercises, tests,
-- progress, and other skills/courses remain intact. Safe to rerun when the
-- chapter contents/order have not changed; already-correct rows are skipped.

START TRANSACTION;

UPDATE lesson AS target
JOIN (
    SELECT source_lesson.id,
           NTILE(3) OVER (
               PARTITION BY source_lesson.chapter_id
               ORDER BY source_lesson.display_order, source_lesson.id
           ) AS lesson_no
    FROM lesson AS source_lesson
    JOIN chapter AS ch ON ch.id = source_lesson.chapter_id
    JOIN course AS c ON c.id = ch.course_id
    WHERE source_lesson.skill_type = 'GRAMMAR'
      AND (
          (c.code = 'JPD113' AND ch.chapter_no BETWEEN 1 AND 3)
          OR (c.code = 'JPD123' AND ch.chapter_no BETWEEN 4 AND 7)
      )
) AS ranked ON ranked.id = target.id
SET target.lesson_no = ranked.lesson_no
WHERE target.lesson_no <> ranked.lesson_no;

COMMIT;

-- Review the actual distribution after the update (includes all statuses).
SELECT c.code AS course_code, ch.chapter_no, l.lesson_no,
       COUNT(*) AS grammar_lesson_count
FROM lesson AS l
JOIN chapter AS ch ON ch.id = l.chapter_id
JOIN course AS c ON c.id = ch.course_id
WHERE l.skill_type = 'GRAMMAR'
  AND (
      (c.code = 'JPD113' AND ch.chapter_no BETWEEN 1 AND 3)
      OR (c.code = 'JPD123' AND ch.chapter_no BETWEEN 4 AND 7)
  )
GROUP BY c.code, ch.chapter_no, l.lesson_no
ORDER BY c.code, ch.chapter_no, l.lesson_no;
