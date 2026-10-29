package com.jtech.service;

import com.jtech.dto.request.VocabularyMiniTestRequest;
import com.jtech.entity.*;
import com.jtech.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

// Opt-in local MySQL check. All inserted test content is rolled back.
@SpringBootTest
@Transactional
@EnabledIfSystemProperty(named = "jtech.integration", matches = "true")
class VocabularyMiniTestPersistenceTest {
    @Autowired VocabularyMiniTestService service;
    @Autowired CourseRepository courses;
    @Autowired ChapterRepository chapters;
    @Autowired LessonRepository lessons;
    @Autowired VocabularyMiniTestRepository tests;
    @Autowired VocabularyMiniTestQuestionRepository questions;
    @Autowired VocabularyMiniTestLinkRepository links;
    @Autowired VocabularyRepository vocabulary;
    @Autowired VocabularyChapterService chapterVocabulary;
    @Autowired VocabularyChapterTestService chapterTests;
    @Autowired @org.springframework.beans.factory.annotation.Qualifier("requestMappingHandlerMapping")
    org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping mappings;

    @Test void generatedMiniTestUsesExactlyLessonWordsAndChapterFlashcardsCombineLessons() {
        assertTrue(mappings.getHandlerMethods().keySet().stream().anyMatch(mapping -> mapping.getPatternValues().contains("/moderator/vocabulary/lessons/{lessonId}/mini-tests")));
        var course = new Course(); course.setCode("TST" + UUID.randomUUID().toString().substring(0, 8)); course.setName("Mini-test integration check"); course.setDisplayOrder(1); course.setStatus(Course.Status.DRAFT); courses.saveAndFlush(course);
        var chapter = new Chapter(); chapter.setCourse(course); chapter.setChapterNo(1); chapter.setTitle("Test chapter"); chapter.setDisplayOrder(1); chapter.setStatus(Course.Status.DRAFT); chapters.saveAndFlush(chapter);
        var lesson = new Lesson(); lesson.setChapter(chapter); lesson.setSkillType(Lesson.SkillType.VOCABULARY); lesson.setLessonNo(1); lesson.setTitle("Ten words"); lesson.setDisplayOrder(1); lessons.saveAndFlush(lesson);
        Set<Long> sourceIds = new HashSet<>(); Set<String> definitions = new HashSet<>();
        for (int index = 1; index <= 10; index++) {
            var word = new Vocabulary(); word.setLessonId(lesson.getId()); word.setWord("用語" + index); word.setReading("ご" + index); word.setMeaningVi("Định nghĩa " + index); word.setDisplayOrder(index); word.setStatus(Course.Status.PUBLISHED); vocabulary.saveAndFlush(word);
            sourceIds.add(word.getId()); definitions.add(word.getMeaningVi());
        }
        var other = new Lesson(); other.setChapter(chapter); other.setSkillType(Lesson.SkillType.VOCABULARY); other.setLessonNo(2); other.setTitle("Other words"); other.setDisplayOrder(2); lessons.saveAndFlush(other);
        for (int index = 0; index < 2; index++) {
            var word = new Vocabulary(); word.setLessonId(other.getId()); word.setWord("別" + index); word.setReading("べつ"); word.setMeaningVi("Outside lesson " + index); word.setDisplayOrder(index); word.setStatus(Course.Status.PUBLISHED); vocabulary.saveAndFlush(word);
        }
        var auth = new UsernamePasswordAuthenticationToken("integration-test", "", List.of(new SimpleGrantedAuthority("ROLE_MODERATOR")));
        var settings = new com.jtech.dto.request.VocabularyMiniTestGenerateRequest("Từ của bài", "", 10, new BigDecimal("70"), VocabularyMiniTest.Status.DRAFT);
        var created = service.generate(lesson.getId(), settings, auth);
        assertEquals(10, created.questions().size());
        assertEquals(sourceIds, created.questions().stream().map(com.jtech.dto.response.VocabularyMiniTestResponse.Question::sourceVocabularyId).collect(java.util.stream.Collectors.toSet()));
        for (var question : created.questions()) {
            assertTrue(definitions.containsAll(question.options())); assertTrue(question.options().contains(question.correctAnswer()));
            assertEquals(4, new HashSet<>(question.options()).size());
        }
        var selectedIds = created.questions().stream().limit(3).map(com.jtech.dto.response.VocabularyMiniTestResponse.Question::id).toList();
        var chapterRequest = new com.jtech.dto.request.VocabularyChapterTestRequest("Test chương Vocab", "", 20, new BigDecimal("70"), VocabularyMiniTest.Status.DRAFT, selectedIds);
        var chapterTest = chapterTests.save(chapter.getId(), chapterRequest);
        assertNull(chapterTest.lessonId()); assertEquals(chapter.getId(), chapterTest.chapterId()); assertEquals(3, chapterTest.questionCount());
        assertEquals(VocabularyMiniTest.Type.CHAPTER_TEST, tests.findById(chapterTest.id()).orElseThrow().getTestType());
        assertEquals(10, chapterTests.setup(chapter.getId()).bank().size());
        Map<String, String> chapterAnswers = new HashMap<>();
        chapterTest.questions().forEach(question -> chapterAnswers.put(question.id().toString(), question.correctAnswer()));
        assertEquals(new BigDecimal("100.00"), chapterTests.preview(chapter.getId(), chapterAnswers).score());
        var regenerated = service.generate(lesson.getId(), settings, auth);
        assertEquals(created.id(), regenerated.id()); assertEquals(1, service.list(lesson.getId(), auth).size());
        selectedIds.forEach(id -> assertEquals(VocabularyMiniTestQuestion.Status.ACTIVE, questions.findById(id).orElseThrow().getStatus()));
        assertEquals(selectedIds, chapterTests.setup(chapter.getId()).test().questions().stream().map(com.jtech.dto.response.VocabularyMiniTestResponse.Question::id).toList());
        assertEquals(12, chapterVocabulary.flashcards(chapter.getId()).size());
        // The learning roadmap controls the count, including lessons above the former 15-question cap.
        for (int index = 11; index <= 16; index++) {
            var word = new Vocabulary(); word.setLessonId(lesson.getId()); word.setWord("用語" + index); word.setReading("ご" + index); word.setMeaningVi("Định nghĩa " + index); word.setDisplayOrder(index); word.setStatus(Course.Status.PUBLISHED); vocabulary.saveAndFlush(word);
        }
        assertEquals(16, service.generate(lesson.getId(), settings, auth).questionCount());
        assertEquals(18, chapterVocabulary.flashcards(chapter.getId()).size());
        assertEquals(2, service.generate(other.getId(), settings, auth).questionCount());
    }

    @Test void createsReadsGradesUpdatesAndArchivesUsingExistingSchema() {
        var course = new Course(); course.setCode("TST" + UUID.randomUUID().toString().substring(0, 8)); course.setName("Mini-test integration check");
        course.setDisplayOrder(1); course.setStatus(Course.Status.DRAFT); courses.saveAndFlush(course);
        var chapter = new Chapter(); chapter.setCourse(course); chapter.setChapterNo(1); chapter.setTitle("Test chapter");
        chapter.setDisplayOrder(1); chapter.setStatus(Course.Status.DRAFT); chapters.saveAndFlush(chapter);
        var lesson = new Lesson(); lesson.setChapter(chapter); lesson.setLessonNo(1); lesson.setTitle("Test lesson");
        lesson.setDisplayOrder(1); lesson.setSkillType(Lesson.SkillType.VOCABULARY); lesson.setStatus(Course.Status.DRAFT); lessons.saveAndFlush(lesson);
        var inputs = List.of(
                new VocabularyMiniTestRequest.Question(VocabularyMiniTestQuestion.Type.MCQ, "猫 nghĩa là gì?", "猫 là mèo", VocabularyMiniTestQuestion.Difficulty.EASY, List.of("Mèo", "Chó"), "Mèo", Map.of()),
                new VocabularyMiniTestRequest.Question(VocabularyMiniTestQuestion.Type.MATCHING, "Nối từ", "Giải thích nối", VocabularyMiniTestQuestion.Difficulty.EASY, List.of(), "", Map.of("猫", "Mèo", "犬", "Chó")),
                fillIn(), fillIn(), fillIn());
        var request = new VocabularyMiniTestRequest("Bài thử", "Hướng dẫn", 10, new BigDecimal("70"), VocabularyMiniTest.Status.DRAFT, inputs);
        var authentication = new UsernamePasswordAuthenticationToken("integration-test", "", List.of(new SimpleGrantedAuthority("ROLE_MODERATOR")));
        var created = service.create(lesson.getId(), request, authentication);
        assertEquals(5, created.questionCount()); assertEquals(5, service.get(created.id()).questions().size());
        assertEquals(1, service.list(lesson.getId(), authentication).size());
        Map<String, String> answers = new HashMap<>();
        for (var question : created.questions()) answers.put(question.id().toString(), question.questionType() == VocabularyMiniTestQuestion.Type.MATCHING ? "{\"犬\":\"Chó\",\"猫\":\"Mèo\"}" : question.correctAnswer());
        assertEquals(new BigDecimal("100.00"), service.preview(created.id(), answers).score());
        var updated = service.update(created.id(), new VocabularyMiniTestRequest("Bài đã sửa", "", 15, new BigDecimal("80"), VocabularyMiniTest.Status.PUBLISHED, inputs));
        assertEquals("Bài đã sửa", updated.title()); assertEquals(5, updated.questions().size());
        assertEquals(VocabularyMiniTestQuestion.Status.ARCHIVED, questions.findById(created.questions().getFirst().id()).orElseThrow().getStatus());
        assertNotEquals(created.questions().getFirst().id(), updated.questions().getFirst().id());
        service.archive(created.id());
        assertEquals(VocabularyMiniTest.Status.ARCHIVED, tests.findById(created.id()).orElseThrow().getStatus());
        assertEquals(5, links.countByTestId(created.id()));
    }
    private VocabularyMiniTestRequest.Question fillIn() {
        return new VocabularyMiniTestRequest.Question(VocabularyMiniTestQuestion.Type.FILL_IN, "Điền cách đọc 日本語", "にほんご", VocabularyMiniTestQuestion.Difficulty.EASY, List.of(), "にほんご", Map.of());
    }
}
