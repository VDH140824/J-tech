package com.jtech.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.cloudinary.Cloudinary;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jtech.entity.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.TypedQuery;
import java.security.Principal;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class KanjiChapterServiceTest {
    private final EntityManager em = mock(EntityManager.class);
    private final KanjiExerciseService exercises = mock(KanjiExerciseService.class);
    private final FeedbackService access = mock(FeedbackService.class);
    private final Principal principal = () -> "moderator@example.com";
    private KanjiChapterService service;
    private Chapter chapter;
    private Lesson source;
    private TypedQuery<Object[]> counts;

    @SuppressWarnings("unchecked")
    @BeforeEach void setup() {
        service = new KanjiChapterService(em, mock(KanjiService.class), exercises, access, new ObjectMapper(), mock(Cloudinary.class));
        Course course = new Course(); course.setStatus(Course.Status.PUBLISHED);
        chapter = new Chapter(); chapter.setId(1L); chapter.setChapterNo(1); chapter.setTitle("Kanji"); chapter.setCourse(course); chapter.setStatus(Course.Status.PUBLISHED);
        source = new Lesson(); source.setId(10L); source.setChapter(chapter); source.setSkillType(Lesson.SkillType.KANJI); source.setStatus(Course.Status.PUBLISHED);
        source.setDocuments("[{\"name\":\"Kanji.pdf\",\"url\":\"https://example.com/kanji.pdf\"}]");
        lenient().when(em.find(Chapter.class, 1L)).thenReturn(chapter);
        lenient().when(em.find(Chapter.class, 1L, LockModeType.PESSIMISTIC_WRITE)).thenReturn(chapter);
        lenient().when(em.find(Lesson.class, 10L, LockModeType.PESSIMISTIC_WRITE)).thenReturn(source);
        lenient().when(em.find(Lesson.class, 10L)).thenReturn(source);
        var lessons = mock(TypedQuery.class, RETURNS_SELF);
        lenient().when(em.createQuery(startsWith("SELECT l FROM Lesson"), eq(Lesson.class))).thenReturn(lessons);
        lenient().when(lessons.getResultList()).thenAnswer(call -> List.of(source));
        counts = mock(TypedQuery.class, RETURNS_SELF);
        lenient().when(em.createQuery(startsWith("SELECT q.lessonId,COUNT(q)"), eq(Object[].class))).thenReturn(counts);
        lenient().when(counts.getResultList()).thenReturn(List.<Object[]>of(new Object[]{10L, 2L}));
        var documents = mock(TypedQuery.class, RETURNS_SELF);
        lenient().when(em.createQuery(startsWith("SELECT l.documents"), eq(String.class))).thenReturn(documents);
        lenient().when(documents.getResultList()).thenReturn(List.of());
    }

    @Test void deletingDocumentReturnsAllExercisesToUnassignedWithoutArchivingOrDeleting() {
        var result = service.deleteDocument(principal, 1L, 10L, "https://example.com/kanji.pdf", false);
        assertNull(source.getDocuments());
        assertEquals(Course.Status.PUBLISHED, source.getStatus());
        assertTrue(result.content().documentItems().isEmpty());
        assertEquals(2L, result.content().unassignedExerciseCount());
        verifyNoInteractions(exercises);
        verify(em, never()).remove(any());
        verify(em, never()).createQuery(anyString(), eq(Question.class));
        verify(counts, never()).setParameter(eq("status"), any());
    }

    @Test void legacyArchiveFlagDoesNotArchiveExercisesAnymore() {
        var result = service.deleteDocument(principal, 1L, 10L, "https://example.com/kanji.pdf", true);
        assertEquals(2L, result.content().unassignedExerciseCount());
        verifyNoInteractions(exercises);
    }

    @Test void archivedUnassignedQuestionsRemainDiscoverable() {
        source.setDocuments(null);
        var result = service.content(principal, 1L);
        assertEquals(2L, result.unassignedExerciseCount());
        verify(counts, never()).setParameter(eq("status"), any());
    }

    private Question unassigned() {
        source.setDocuments(null);
        Question q = new Question(); q.setId(20L); q.setLessonId(10L); q.setSkill(Question.Skill.KANJI); q.setIsExerciseQuestion(true); q.setStatus(Question.QuestionStatus.ACTIVE);
        when(em.find(Question.class, 20L)).thenReturn(q);
        return q;
    }

    @Test void assigningToAnotherDocumentDelegatesWithCorrectSourceAndTarget() {
        unassigned();
        Lesson target = new Lesson(); target.setId(11L); target.setChapter(chapter); target.setSkillType(Lesson.SkillType.KANJI); target.setStatus(Course.Status.PUBLISHED);
        target.setDocuments("[\"https://example.com/other.pdf\"]");
        when(em.find(Lesson.class, 11L, LockModeType.PESSIMISTIC_WRITE)).thenReturn(target);
        service.assignExercise(principal, 1L, 20L, 11L);
        verify(exercises).assign(principal, 10L, 20L, 11L);
    }

    @Test void publishingUnassignedQuestionDoesNotRequireDocument() {
        unassigned();
        service.changeExerciseStatus(principal, 1L, 20L, Question.QuestionStatus.ACTIVE, null);
        verify(exercises).changeStatus(principal, 10L, 20L, Question.QuestionStatus.ACTIVE);
    }

    @Test void rejectsAssignmentOutsideChapter() {
        Chapter other = new Chapter(); other.setId(99L);
        Lesson target = new Lesson(); target.setId(11L); target.setChapter(other); target.setSkillType(Lesson.SkillType.KANJI);
        when(em.find(Lesson.class, 11L, LockModeType.PESSIMISTIC_WRITE)).thenReturn(target);
        assertThrows(ResponseStatusException.class, () -> service.assignExercise(principal, 1L, 20L, 11L));
        verifyNoInteractions(exercises);
    }

    @Test void rejectsStatusChangeWhenQuestionDoesNotBelongToSelectedDocument() {
        unassigned();
        Lesson other = new Lesson(); other.setId(11L); other.setChapter(chapter); other.setSkillType(Lesson.SkillType.KANJI); other.setStatus(Course.Status.PUBLISHED);
        other.setDocuments("[\"https://example.com/other.pdf\"]");
        when(em.find(Lesson.class, 11L, LockModeType.PESSIMISTIC_WRITE)).thenReturn(other);
        assertThrows(ResponseStatusException.class, () -> service.changeExerciseStatus(principal, 1L, 20L, Question.QuestionStatus.ACTIVE, 11L));
        verifyNoInteractions(exercises);
    }

    @Test void cannotPublishExercisesInArchivedChapter() {
        chapter.setStatus(Course.Status.ARCHIVED);
        assertThrows(ResponseStatusException.class, () -> service.changeExerciseStatus(principal, 1L, 20L, Question.QuestionStatus.ACTIVE, null));
        verifyNoInteractions(exercises);
    }
}
