package com.jtech.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.jtech.entity.User;
import java.security.Principal;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class StudentKanjiFlashcardServiceTest {

  @Test
  void moderatorPreviewIncludesDraftAndPublishedLessonsAndKanji() {
    User user = new User();
    user.setUserId(8L);
    when(access.actor(principal, "MODERATOR")).thenReturn(user);
    when(
      db.queryForObject(
        contains("SELECT COUNT(*) FROM chapter"),
        eq(Integer.class),
        eq(20L)
      )
    ).thenReturn(1);
    service.chapterCards(20, principal, true);
    verify(db).query(
      argThat(
        sql ->
          sql.contains("l.chapter_id=?") &&
          sql.contains("l.status IN ('DRAFT','PUBLISHED')") &&
          sql.contains("k.status IN ('DRAFT','PUBLISHED')")
      ),
      any(RowMapper.class),
      eq(8L),
      eq(20L)
    );
  }

  @Test
  void chapterCardsAggregatePublishedKanjiAndKeepStudentProgress() {
    student();
    when(
      db.queryForObject(
        contains("SELECT COUNT(*) FROM chapter"),
        eq(Integer.class),
        eq(20L)
      )
    ).thenReturn(1);
    service.chapterCards(20, principal, false);
    verify(db).query(
      argThat(
        sql ->
          sql.contains("l.chapter_id=?") &&
          sql.contains("p.user_id=?") &&
          sql.contains("l.status='PUBLISHED'") &&
          sql.contains("k.status='PUBLISHED'") &&
          !sql.contains("'DRAFT'") &&
          sql.contains("l.lesson_no")
      ),
      any(RowMapper.class),
      eq(42L),
      eq(20L)
    );
  }

  @Test
  void chapterTestsExcludeLegacyLessonTestsAndDrafts() {
    student();
    when(
      db.queryForObject(
        contains("SELECT COUNT(*) FROM chapter"),
        eq(Integer.class),
        eq(20L)
      )
    ).thenReturn(1);
    service.chapterTests(20, principal);
    verify(db).query(
      argThat(
        sql ->
          sql.contains("chapter_id=?") &&
          sql.contains("lesson_id IS NULL") &&
          sql.contains("test_type='CHAPTER_TEST'") &&
          sql.contains("status='PUBLISHED'")
      ),
      any(RowMapper.class),
      eq(20L)
    );
  }

  @Test
  void chapterProgressRefusesKanjiFromAnotherChapter() {
    student();
    when(
      db.queryForObject(
        contains("SELECT COUNT(*) FROM chapter"),
        eq(Integer.class),
        eq(20L)
      )
    ).thenReturn(1);
    when(
      db.queryForList(
        contains("SELECT k.lesson_id"),
        eq(Long.class),
        eq(99L),
        eq(20L)
      )
    ).thenReturn(List.of());
    assertThrows(ResponseStatusException.class, () ->
      service.chapterRemember(20, 99, true, principal)
    );
    verify(db, never()).update(anyString(), any(Object[].class));
  }

  @Test
  void unpublishedChapterCannotExposeCards() {
    student();
    when(
      db.queryForObject(
        contains("SELECT COUNT(*) FROM chapter"),
        eq(Integer.class),
        eq(20L)
      )
    ).thenReturn(0);
    assertThrows(ResponseStatusException.class, () ->
      service.chapterCards(20, principal, false)
    );
    verify(db, never()).query(anyString(), any(RowMapper.class), any(), any());
  }

  @Mock
  JdbcTemplate db;

  @Mock
  FeedbackService access;

  StudentKanjiFlashcardService service;
  Principal principal = () -> "student@example.com";

  @BeforeEach
  void setup() {
    service = new StudentKanjiFlashcardService(db, access);
  }

  private void student() {
    User user = new User();
    user.setUserId(42L);
    when(access.actor(principal, "STUDENT")).thenReturn(user);
  }

  @Test
  void rejectsNonStudentBeforeReadingContent() {
    when(access.actor(principal, "STUDENT")).thenThrow(
      new AccessDeniedException("Denied")
    );
    assertThrows(AccessDeniedException.class, () ->
      service.cards(10, principal)
    );
    verifyNoInteractions(db);
  }

  @Test
  void rejectsUnpublishedOrMissingLesson() {
    student();
    when(
      db.queryForObject(
        contains("l.skill_type='KANJI'"),
        eq(Integer.class),
        eq(10L)
      )
    ).thenReturn(0);
    assertThrows(ResponseStatusException.class, () ->
      service.cards(10, principal)
    );
    verify(db, never()).query(anyString(), any(RowMapper.class), any(), any());
  }

  @Test
  void readsPublishedCardsForRequestedLessonAndCurrentStudent() {
    student();
    when(
      db.queryForObject(
        contains("l.skill_type='KANJI'"),
        eq(Integer.class),
        eq(10L)
      )
    ).thenReturn(1);
    service.cards(10, principal);
    verify(db).query(
      argThat(
        sql ->
          sql.contains("p.user_id=?") &&
          sql.contains("k.lesson_id=?") &&
          sql.contains("k.status='PUBLISHED'") &&
          sql.contains("COALESCE")
      ),
      any(RowMapper.class),
      eq(42L),
      eq(10L)
    );
  }

  @Test
  void refusesCardFromAnotherLessonWithoutWritingProgress() {
    student();
    when(
      db.queryForObject(
        contains("l.skill_type='KANJI'"),
        eq(Integer.class),
        eq(10L)
      )
    ).thenReturn(1);
    when(
      db.queryForObject(
        startsWith("SELECT COUNT(*) FROM kanji"),
        eq(Integer.class),
        eq(99L),
        eq(10L)
      )
    ).thenReturn(0);
    assertThrows(ResponseStatusException.class, () ->
      service.remember(10, 99, true, principal)
    );
    verify(db, never()).update(anyString(), any(Object[].class));
  }

  @Test
  void savesBothRememberedStatesForAuthenticatedStudent() {
    student();
    when(
      db.queryForObject(
        contains("l.skill_type='KANJI'"),
        eq(Integer.class),
        eq(10L)
      )
    ).thenReturn(1);
    when(
      db.queryForObject(
        startsWith("SELECT COUNT(*) FROM kanji"),
        eq(Integer.class),
        eq(99L),
        eq(10L)
      )
    ).thenReturn(1);
    service.remember(10, 99, true, principal);
    service.remember(10, 99, false, principal);
    verify(db).update(
      contains("ON DUPLICATE KEY UPDATE"),
      eq(42L),
      eq(99L),
      eq("REMEMBERED")
    );
    verify(db).update(
      contains("ON DUPLICATE KEY UPDATE"),
      eq(42L),
      eq(99L),
      eq("NOT_REMEMBERED")
    );
  }

  @Test
  void testsRejectNonStudentBeforeQuerying() {
    when(access.actor(principal, "STUDENT")).thenThrow(
      new AccessDeniedException("Denied")
    );
    assertThrows(AccessDeniedException.class, () ->
      service.tests(10, principal)
    );
    verifyNoInteractions(db);
  }

  @Test
  void testsRejectUnavailableLessonEvenForDirectAccess() {
    student();
    when(
      db.queryForObject(
        contains("l.skill_type='KANJI'"),
        eq(Integer.class),
        eq(10L)
      )
    ).thenReturn(0);
    assertThrows(ResponseStatusException.class, () ->
      service.tests(10, principal)
    );
    verify(db, never()).query(anyString(), any(RowMapper.class), eq(10L));
  }

  @Test
  void testsReturnEmptyWhenNoPublishedTestExists() {
    student();
    when(
      db.queryForObject(
        contains("l.skill_type='KANJI'"),
        eq(Integer.class),
        eq(10L)
      )
    ).thenReturn(1);
    when(db.query(anyString(), any(RowMapper.class), eq(10L))).thenReturn(
      List.of()
    );
    assertTrue(service.tests(10, principal).isEmpty());
    verify(db).query(
      argThat(
        sql ->
          sql.contains("t.lesson_id=?") &&
          sql.contains("t.skill='KANJI'") &&
          sql.contains("t.status='PUBLISHED'") &&
          sql.contains("t.chapter_id=l.chapter_id")
      ),
      any(RowMapper.class),
      eq(10L)
    );
  }

  @Test
  void testsMapOnlyPublicMetadataWithoutAnswers() throws Exception {
    student();
    when(
      db.queryForObject(
        contains("l.skill_type='KANJI'"),
        eq(Integer.class),
        eq(10L)
      )
    ).thenReturn(1);
    var rs = mock(java.sql.ResultSet.class);
    when(rs.getLong("id")).thenReturn(7L);
    when(rs.getString("title")).thenReturn("Kanji lesson test");
    when(rs.getString("description")).thenReturn("Review");
    when(rs.getInt("duration_minutes")).thenReturn(5);
    when(db.query(anyString(), any(RowMapper.class), eq(10L))).thenAnswer(
      invocation -> {
        RowMapper<StudentKanjiFlashcardService.PublishedTest> mapper =
          invocation.getArgument(1);
        return List.of(mapper.mapRow(rs, 0));
      }
    );
    assertEquals(
      List.of(
        new StudentKanjiFlashcardService.PublishedTest(
          7,
          "Kanji lesson test",
          "Review",
          5
        )
      ),
      service.tests(10, principal)
    );
  }
}
