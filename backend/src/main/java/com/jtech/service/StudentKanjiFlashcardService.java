package com.jtech.service;

import java.security.Principal;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class StudentKanjiFlashcardService {

  private final JdbcTemplate db;
  private final FeedbackService access;

  public StudentKanjiFlashcardService(JdbcTemplate db, FeedbackService access) {
    this.db = db;
    this.access = access;
  }

  public record Card(
    long id,
    String characterText,
    String sinoVietnamese,
    String onyomi,
    String kunyomi,
    String meaningVi,
    String examples,
    String imageUrl,
    String mnemonicStory,
    boolean remembered
  ) {}

  private void requireLesson(long lessonId) {
    Integer count = db.queryForObject(
      """
      SELECT COUNT(*) FROM lesson l JOIN chapter ch ON ch.id=l.chapter_id
      JOIN course c ON c.id=ch.course_id WHERE l.id=? AND l.skill_type='KANJI'
      AND l.status='PUBLISHED' AND ch.status='PUBLISHED' AND c.status='PUBLISHED'
      AND c.deleted_at IS NULL
      """,
      Integer.class,
      lessonId
    );
    if (count == null || count == 0) throw new ResponseStatusException(
      HttpStatus.NOT_FOUND,
      "Kanji lesson not found"
    );
  }

  private void requireChapter(long chapterId, boolean moderator) {
    Integer count = db.queryForObject(
      """
      SELECT COUNT(*) FROM chapter ch JOIN course c ON c.id=ch.course_id
      WHERE ch.id=? AND c.deleted_at IS NULL
      """ +
        (moderator
          ? " AND ch.status<>'ARCHIVED' AND c.status<>'ARCHIVED'"
          : " AND ch.status='PUBLISHED' AND c.status='PUBLISHED'"),
      Integer.class,
      chapterId
    );
    if (count == null || count == 0) throw new ResponseStatusException(
      HttpStatus.NOT_FOUND,
      "Không tìm thấy chương khả dụng."
    );
  }

  public record ChapterCard(
    long lessonId,
    int lessonNo,
    String lessonTitle,
    Card card
  ) {}

  @Transactional(readOnly = true)
  public List<ChapterCard> chapterCards(
    long chapterId,
    Principal principal,
    boolean moderator
  ) {
    long user = access
      .actor(principal, moderator ? "MODERATOR" : "STUDENT")
      .getUserId();
    requireChapter(chapterId, moderator);
    return db.query(
      """
      SELECT k.*,l.lesson_no,l.title AS lesson_title,COALESCE(p.flip_status='REMEMBERED',FALSE) AS remembered
      FROM kanji k JOIN lesson l ON l.id=k.lesson_id
      LEFT JOIN flashcard_progress p ON p.kanji_id=k.id AND p.user_id=?
      WHERE l.chapter_id=? AND l.skill_type='KANJI'
      """ +
        (moderator
          ? " AND l.status IN ('DRAFT','PUBLISHED') AND k.status IN ('DRAFT','PUBLISHED')"
          : " AND l.status='PUBLISHED' AND k.status='PUBLISHED'") +
        " ORDER BY l.display_order,l.lesson_no,l.id,k.display_order,k.id",
      (rs, n) ->
        new ChapterCard(
          rs.getLong("lesson_id"),
          rs.getInt("lesson_no"),
          rs.getString("lesson_title"),
          new Card(
            rs.getLong("id"),
            rs.getString("character_text"),
            rs.getString("sino_vietnamese"),
            rs.getString("onyomi"),
            rs.getString("kunyomi"),
            rs.getString("meaning_vi"),
            rs.getString("examples"),
            rs.getString("image_url"),
            rs.getString("mnemonic_story"),
            rs.getBoolean("remembered")
          )
        ),
      user,
      chapterId
    );
  }

  @Transactional
  public void chapterRemember(
    long chapterId,
    long kanjiId,
    boolean remembered,
    Principal principal
  ) {
    access.actor(principal, "STUDENT");
    requireChapter(chapterId, false);
    var lessons = db.queryForList(
      """
      SELECT k.lesson_id FROM kanji k JOIN lesson l ON l.id=k.lesson_id
      WHERE k.id=? AND l.chapter_id=? AND l.skill_type='KANJI' AND l.status='PUBLISHED' AND k.status='PUBLISHED'
      """,
      Long.class,
      kanjiId,
      chapterId
    );
    if (lessons.isEmpty()) throw new ResponseStatusException(
      HttpStatus.NOT_FOUND,
      "Kanji không thuộc chương này."
    );
    remember(lessons.getFirst(), kanjiId, remembered, principal);
  }

  @Transactional(readOnly = true)
  public List<PublishedTest> chapterTests(long chapterId, Principal principal) {
    access.actor(principal, "STUDENT");
    requireChapter(chapterId, false);
    return db.query(
      """
      SELECT id,title,description,duration_minutes FROM test
      WHERE chapter_id=? AND lesson_id IS NULL AND skill='KANJI' AND test_type='CHAPTER_TEST' AND status='PUBLISHED'
      ORDER BY id
      """,
      (rs, n) ->
        new PublishedTest(
          rs.getLong("id"),
          rs.getString("title"),
          rs.getString("description"),
          rs.getInt("duration_minutes")
        ),
      chapterId
    );
  }

  public record PublishedTest(
    long id,
    String title,
    String description,
    int durationMinutes
  ) {}

  @Transactional(readOnly = true)
  public List<PublishedTest> tests(long lessonId, Principal principal) {
    access.actor(principal, "STUDENT");
    requireLesson(lessonId);
    return db.query(
      """
      SELECT t.id, t.title, t.description, t.duration_minutes
      FROM test t JOIN lesson l ON l.id=t.lesson_id
      WHERE t.lesson_id=? AND t.skill='KANJI' AND t.status='PUBLISHED'
        AND (t.chapter_id IS NULL OR t.chapter_id=l.chapter_id)
      ORDER BY t.id
      """,
      (rs, row) ->
        new PublishedTest(
          rs.getLong("id"),
          rs.getString("title"),
          rs.getString("description"),
          rs.getInt("duration_minutes")
        ),
      lessonId
    );
  }

  @Transactional(readOnly = true)
  public List<Card> cards(long lessonId, Principal principal) {
    long userId = access.actor(principal, "STUDENT").getUserId();
    requireLesson(lessonId);
    return db.query(
      """
      SELECT k.*, COALESCE(p.flip_status='REMEMBERED', FALSE) AS remembered
      FROM kanji k LEFT JOIN flashcard_progress p ON p.kanji_id=k.id AND p.user_id=?
      WHERE k.lesson_id=? AND k.status='PUBLISHED' ORDER BY k.display_order, k.id
      """,
      (rs, row) ->
        new Card(
          rs.getLong("id"),
          rs.getString("character_text"),
          rs.getString("sino_vietnamese"),
          rs.getString("onyomi"),
          rs.getString("kunyomi"),
          rs.getString("meaning_vi"),
          rs.getString("examples"),
          rs.getString("image_url"),
          rs.getString("mnemonic_story"),
          rs.getBoolean("remembered")
        ),
      userId,
      lessonId
    );
  }

  @Transactional
  public void remember(
    long lessonId,
    long kanjiId,
    boolean remembered,
    Principal principal
  ) {
    long userId = access.actor(principal, "STUDENT").getUserId();
    requireLesson(lessonId);
    Integer count = db.queryForObject(
      "SELECT COUNT(*) FROM kanji WHERE id=? AND lesson_id=? AND status='PUBLISHED'",
      Integer.class,
      kanjiId,
      lessonId
    );
    if (count == null || count == 0) throw new ResponseStatusException(
      HttpStatus.NOT_FOUND,
      "Kanji not found in lesson"
    );
    db.update(
      """
      INSERT INTO flashcard_progress(user_id, kanji_id, flip_status, last_reviewed_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE flip_status=VALUES(flip_status),
      last_reviewed_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP
      """,
      userId,
      kanjiId,
      remembered ? "REMEMBERED" : "NOT_REMEMBERED"
    );
  }
}
