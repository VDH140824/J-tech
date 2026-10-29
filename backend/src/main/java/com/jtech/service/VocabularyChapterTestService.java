package com.jtech.service;

import com.jtech.dto.request.VocabularyChapterTestRequest;
import com.jtech.dto.response.VocabularyMiniTestResponse;
import com.jtech.entity.*;
import com.jtech.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class VocabularyChapterTestService {
    public record BankQuestion(Long id, Long lessonId, int lessonNo, String lessonTitle, String content,
            VocabularyMiniTestQuestion.Difficulty difficulty, List<String> options, String correctAnswer) {}
    public record Setup(VocabularyMiniTestResponse test, List<BankQuestion> bank) {}
    private final ChapterRepository chapters;
    private final LessonRepository lessons;
    private final VocabularyMiniTestRepository tests;
    private final VocabularyMiniTestQuestionRepository questions;
    private final VocabularyMiniTestLinkRepository links;
    private final VocabularyService access;
    private final VocabularyMiniTestService miniTests;

    public VocabularyChapterTestService(ChapterRepository chapters, LessonRepository lessons, VocabularyMiniTestRepository tests,
            VocabularyMiniTestQuestionRepository questions, VocabularyMiniTestLinkRepository links,
            VocabularyService access, VocabularyMiniTestService miniTests) {
        this.chapters = chapters; this.lessons = lessons; this.tests = tests; this.questions = questions;
        this.links = links; this.access = access; this.miniTests = miniTests;
    }

    public Setup setup(Long chapterId) {
        access.require(chapters, chapterId);
        var lessonMap = eligibleLessons(chapterId);
        var bank = bank(chapterId).stream().filter(question -> lessonMap.containsKey(question.getLessonId())).map(question -> {
            var answer = miniTests.readAnswer(question);
            var lesson = lessonMap.get(question.getLessonId());
            return new BankQuestion(question.getId(), lesson.getId(), lesson.getLessonNo(), lesson.getTitle(), question.getContent(), question.getDifficulty(), answer.options(), answer.correctAnswer());
        }).toList();
        var test = current(chapterId);
        return new Setup(test == null ? null : miniTests.response(test, true), bank);
    }

    @Transactional
    public VocabularyMiniTestResponse save(Long chapterId, VocabularyChapterTestRequest request) {
        chapters.findForUpdate(chapterId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy chương."));
        var test = current(chapterId);
        if (test != null && tests.countAttempts(test.getId()) > 0) throw new IllegalStateException("Test chương đã có lượt làm nên không thể thay đổi câu hỏi và cấu hình.");
        Set<Long> selected = new LinkedHashSet<>(request.questionIds());
        if (selected.size() != request.questionIds().size()) throw new IllegalArgumentException("Không được chọn trùng câu hỏi trong test chương.");
        var lessonMap = eligibleLessons(chapterId);
        var available = bank(chapterId).stream().filter(question -> lessonMap.containsKey(question.getLessonId()))
                .collect(Collectors.toMap(VocabularyMiniTestQuestion::getId, question -> question));
        if (!available.keySet().containsAll(selected)) throw new IllegalArgumentException("Chỉ được chọn câu trắc nghiệm Vocab đang hoạt động, thuộc các bài của chương này.");
        for (Long id : selected) {
            var question = available.get(id);
            var answer = miniTests.readAnswer(question);
            miniTests.validateAnswer(new com.jtech.dto.request.VocabularyMiniTestRequest.Question(question.getQuestionType(), question.getContent(), question.getExplanation(), question.getDifficulty(), answer.options(), answer.correctAnswer(), answer.matches()));
            if (request.status() == VocabularyMiniTest.Status.PUBLISHED && lessonMap.get(question.getLessonId()).getStatus() != Course.Status.PUBLISHED) {
                throw new IllegalArgumentException("Hãy xuất bản các bài học chứa câu hỏi đã chọn trước khi xuất bản test chương.");
            }
        }
        if (test == null) {
            test = new VocabularyMiniTest(); test.setTestType(VocabularyMiniTest.Type.CHAPTER_TEST); test.setChapterId(chapterId);
        }
        test.setTitle(request.title().trim()); test.setDescription(request.description() == null ? "" : request.description().trim());
        test.setDurationMinutes(request.durationMinutes()); test.setPassingScore(request.passingScore()); test.setStatus(request.status());
        tests.saveAndFlush(test);
        links.removeForTest(test.getId());
        for (Long id : selected) {
            var link = new VocabularyMiniTestLink(); link.setTestId(test.getId()); link.setQuestionId(id); links.save(link);
        }
        links.flush();
        return miniTests.response(test, true);
    }

    @Transactional
    public void archive(Long chapterId) {
        chapters.findForUpdate(chapterId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy chương."));
        var test = requireCurrent(chapterId);
        if (tests.countActiveAttempts(test.getId()) > 0) throw new IllegalStateException("Có học sinh đang làm test chương, chưa thể lưu trữ.");
        test.setStatus(VocabularyMiniTest.Status.ARCHIVED); tests.save(test);
    }

    public VocabularyMiniTestResponse.Result preview(Long chapterId, Map<String, String> answers) {
        var test = requireCurrent(chapterId);
        return miniTests.grade(test, questions.findForTest(test.getId()), answers);
    }

    private Map<Long, Lesson> eligibleLessons(Long chapterId) {
        return lessons.findByChapterIdAndSkillTypeOrderByDisplayOrderAscLessonNoAscIdAsc(chapterId, Lesson.SkillType.VOCABULARY).stream()
                .filter(lesson -> lesson.getStatus() == Course.Status.PUBLISHED || lesson.getStatus() == Course.Status.DRAFT)
                .collect(Collectors.toMap(Lesson::getId, lesson -> lesson));
    }
    private List<VocabularyMiniTestQuestion> bank(Long chapterId) {
        return questions.findBankForChapter(chapterId, VocabularyMiniTestQuestion.Skill.VOCABULARY, VocabularyMiniTestQuestion.Type.MCQ, VocabularyMiniTestQuestion.Status.ACTIVE);
    }
    private VocabularyMiniTest current(Long chapterId) {
        var found = tests.findByChapterIdAndTestTypeAndSkillOrderByIdDesc(chapterId, VocabularyMiniTest.Type.CHAPTER_TEST, VocabularyMiniTest.Skill.VOCABULARY);
        if (found.size() > 1) throw new IllegalStateException("Chương đang có nhiều test Vocab cũ. Cần xử lý dữ liệu cũ trước khi áp dụng một test chương.");
        return found.isEmpty() ? null : found.getFirst();
    }
    private VocabularyMiniTest requireCurrent(Long chapterId) {
        access.require(chapters, chapterId);
        var test = current(chapterId);
        if (test == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Chương chưa có bài test Vocab.");
        return test;
    }
}
