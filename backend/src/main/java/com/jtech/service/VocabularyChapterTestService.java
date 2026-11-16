package com.jtech.service;

import com.jtech.dto.request.VocabularyChapterTestRequest;
import com.jtech.dto.response.StudentVocabularyExercise;
import com.jtech.dto.response.VocabularyTestResponse;
import com.jtech.entity.*;
import com.jtech.repository.*;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class VocabularyChapterTestService {

    public record BankQuestion(
        Long id,
        Long lessonId,
        int lessonNo,
        String lessonTitle,
        String content,
        VocabularyTestQuestion.Difficulty difficulty,
        List<String> options,
        String correctAnswer
    ) {}

    public record Setup(VocabularyTestResponse test, List<BankQuestion> bank) {}

    private final ChapterRepository chapters;
    private final LessonRepository lessons;
    private final VocabularyTestRepository tests;
    private final VocabularyTestQuestionRepository questions;
    private final VocabularyTestQuestionLinkRepository links;
    private final VocabularyService access;
    private final VocabularyExerciseService exercises;

    public VocabularyChapterTestService(
        ChapterRepository chapters,
        LessonRepository lessons,
        VocabularyTestRepository tests,
        VocabularyTestQuestionRepository questions,
        VocabularyTestQuestionLinkRepository links,
        VocabularyService access,
        VocabularyExerciseService exercises
    ) {
        this.chapters = chapters;
        this.lessons = lessons;
        this.tests = tests;
        this.questions = questions;
        this.links = links;
        this.access = access;
        this.exercises = exercises;
    }

    public Setup setup(Long chapterId) {
        access.require(chapters, chapterId);
        var lessonMap = eligibleLessons(chapterId);
        var bank = bank(chapterId)
            .stream()
            .filter(question -> lessonMap.containsKey(question.getLessonId()))
            .map(question -> {
                var answer = exercises.readAnswer(question);
                var lesson = lessonMap.get(question.getLessonId());
                return new BankQuestion(
                    question.getId(),
                    lesson.getId(),
                    lesson.getLessonNo(),
                    lesson.getTitle(),
                    question.getContent(),
                    question.getDifficulty(),
                    answer.options(),
                    answer.correctAnswer()
                );
            })
            .toList();
        var test = current(chapterId);
        return new Setup(test == null ? null : exercises.response(test, true), bank);
    }

    public StudentVocabularyExercise studentTest(Long chapterId) {
        var published = requirePublishedTest(chapterId, null);
        var items = published.questions();
        return new StudentVocabularyExercise(
            published.test().getId(),
            published.test().getTitle(),
            published.test().getDescription(),
            published.test().getDurationMinutes(),
            published.test().getPassingScore(),
            items
                .stream()
                .map(question -> {
                    var answer = exercises.readAnswer(question);
                    return new StudentVocabularyExercise.Question(
                        question.getId(),
                        question.getQuestionType(),
                        question.getContent(),
                        answer.options(),
                        List.of(),
                        List.of()
                    );
                })
                .toList()
        );
    }

    public VocabularyTestResponse.Result submitStudentTest(
        Long chapterId,
        Long testId,
        List<Long> questionIds,
        Map<String, String> answers
    ) {
        var published = requirePublishedTest(chapterId, testId);
        if (!published.questions().stream().map(VocabularyTestQuestion::getId).toList().equals(questionIds)) {
            throw new IllegalStateException("Bài test chương đã thay đổi. Vui lòng mở lại bài test.");
        }
        return exercises.grade(published.test(), published.questions(), answers);
    }

    @Transactional
    public VocabularyTestResponse save(Long chapterId, VocabularyChapterTestRequest request) {
        chapters
            .findForUpdate(chapterId)
            .orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy chương.")
            );
        var test = current(chapterId);
        if (test != null && tests.countAttempts(test.getId()) > 0) throw new IllegalStateException(
            "Test chương đã có lượt làm nên không thể thay đổi câu hỏi và cấu hình."
        );
        Set<Long> selected = new LinkedHashSet<>(request.questionIds());
        if (selected.size() != request.questionIds().size()) throw new IllegalArgumentException(
            "Không được chọn trùng câu hỏi trong test chương."
        );
        var lessonMap = eligibleLessons(chapterId);
        var available = bank(chapterId)
            .stream()
            .filter(question -> lessonMap.containsKey(question.getLessonId()))
            .collect(Collectors.toMap(VocabularyTestQuestion::getId, question -> question));
        if (!available.keySet().containsAll(selected)) throw new IllegalArgumentException(
            "Chỉ được chọn câu trắc nghiệm Vocab đang hoạt động, thuộc các bài của chương này."
        );
        for (Long id : selected) {
            var question = available.get(id);
            var answer = exercises.readAnswer(question);
            exercises.validateAnswer(
                new com.jtech.dto.request.VocabularyExerciseRequest.Question(
                    question.getQuestionType(),
                    question.getContent(),
                    question.getExplanation(),
                    question.getDifficulty(),
                    answer.options(),
                    answer.correctAnswer(),
                    answer.matches()
                )
            );
            if (
                request.status() == VocabularyTest.Status.PUBLISHED &&
                lessonMap.get(question.getLessonId()).getStatus() != Course.Status.PUBLISHED
            ) {
                throw new IllegalArgumentException(
                    "Hãy xuất bản các bài học chứa câu hỏi đã chọn trước khi xuất bản test chương."
                );
            }
        }
        if (test == null) {
            test = new VocabularyTest();
            test.setTestType(VocabularyTest.Type.CHAPTER_TEST);
            test.setChapterId(chapterId);
        }
        test.setTitle(request.title().trim());
        test.setDescription(request.description() == null ? "" : request.description().trim());
        test.setDurationMinutes(request.durationMinutes());
        test.setPassingScore(request.passingScore());
        test.setStatus(request.status());
        tests.saveAndFlush(test);
        links.removeForTest(test.getId());
        for (Long id : selected) {
            var link = new VocabularyTestQuestionLink();
            link.setTestId(test.getId());
            link.setQuestionId(id);
            links.save(link);
        }
        links.flush();
        return exercises.response(test, true);
    }

    @Transactional
    public void archive(Long chapterId) {
        chapters
            .findForUpdate(chapterId)
            .orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy chương.")
            );
        var test = requireCurrent(chapterId);
        if (tests.countActiveAttempts(test.getId()) > 0) throw new IllegalStateException(
            "Có học sinh đang làm test chương, chưa thể lưu trữ."
        );
        test.setStatus(VocabularyTest.Status.ARCHIVED);
        tests.save(test);
    }

    public VocabularyTestResponse.Result preview(Long chapterId, Map<String, String> answers) {
        var test = requireCurrent(chapterId);
        return exercises.grade(test, questions.findForTest(test.getId()), answers);
    }

    private Map<Long, Lesson> eligibleLessons(Long chapterId) {
        return lessons
            .findByChapterIdAndSkillTypeOrderByDisplayOrderAscLessonNoAscIdAsc(
                chapterId,
                Lesson.SkillType.VOCABULARY
            )
            .stream()
            .filter(
                lesson ->
                    lesson.getStatus() == Course.Status.PUBLISHED ||
                    lesson.getStatus() == Course.Status.DRAFT
            )
            .collect(Collectors.toMap(Lesson::getId, lesson -> lesson));
    }

    private List<VocabularyTestQuestion> bank(Long chapterId) {
        return questions.findBankForChapter(
            chapterId,
            VocabularyTestQuestion.Skill.VOCABULARY,
            VocabularyTestQuestion.Type.MCQ,
            VocabularyTestQuestion.Status.ACTIVE
        );
    }

    private VocabularyTest current(Long chapterId) {
        var found = tests.findByChapterIdAndTestTypeAndSkillOrderByIdDesc(
            chapterId,
            VocabularyTest.Type.CHAPTER_TEST,
            VocabularyTest.Skill.VOCABULARY
        );
        if (found.size() > 1) throw new IllegalStateException(
            "Chương đang có nhiều test Vocab cũ. Cần xử lý dữ liệu cũ trước khi áp dụng một test chương."
        );
        return found.isEmpty() ? null : found.getFirst();
    }

    private VocabularyTest requireCurrent(Long chapterId) {
        access.require(chapters, chapterId);
        var test = current(chapterId);
        if (test == null) throw new ResponseStatusException(
            HttpStatus.NOT_FOUND,
            "Chương chưa có bài test Vocab."
        );
        return test;
    }

    private record PublishedTest(VocabularyTest test, List<VocabularyTestQuestion> questions) {}

    private PublishedTest requirePublishedTest(Long chapterId, Long testId) {
        var chapter = chapters.findById(chapterId).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bài test chương.")
        );
        if (
            chapter.getStatus() != Course.Status.PUBLISHED ||
            chapter.getCourse().getStatus() != Course.Status.PUBLISHED
        ) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bài test chương.");
        }
        var test = current(chapterId);
        if (
            test == null ||
            test.getStatus() != VocabularyTest.Status.PUBLISHED ||
            (testId != null && !testId.equals(test.getId()))
        ) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Chương chưa có bài test Vocab được xuất bản.");
        }
        var visibleLessons = lessons
            .findByChapterIdAndSkillTypeOrderByDisplayOrderAscLessonNoAscIdAsc(
                chapterId,
                Lesson.SkillType.VOCABULARY
            )
            .stream()
            .filter(lesson -> lesson.getStatus() == Course.Status.PUBLISHED)
            .map(Lesson::getId)
            .collect(Collectors.toSet());
        var items = questions.findForTest(test.getId());
        if (
            items.isEmpty() ||
            items.stream().anyMatch(question ->
                question.getSkill() != VocabularyTestQuestion.Skill.VOCABULARY ||
                question.getQuestionType() != VocabularyTestQuestion.Type.MCQ ||
                question.getStatus() != VocabularyTestQuestion.Status.ACTIVE ||
                !visibleLessons.contains(question.getLessonId())
            )
        ) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Bài test chương hiện không khả dụng.");
        }
        return new PublishedTest(test, items);
    }
}
