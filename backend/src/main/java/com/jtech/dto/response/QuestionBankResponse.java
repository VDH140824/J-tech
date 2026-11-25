package com.jtech.dto.response;

import com.jtech.entity.Question;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public final class QuestionBankResponse {

    private QuestionBankResponse() {
    }

    public record Summary(
            Long id,
            Question.Skill skill,
            Question.QuestionType questionType,
            Question.Difficulty difficulty,
            Question.QuestionStatus status,
            String content,
            boolean exerciseQuestion,
            Long courseId,
            String courseName,
            Long chapterId,
            Integer chapterNo,
            String chapterTitle,
            Long lessonId,
            String lessonTitle,
            String targetName,
            LocalDateTime updatedAt) {
    }

    public record Detail(
            Summary summary,
            Long grammarId,
            String explanation,
            List<String> options,
            String correctAnswer,
            Map<String, String> matches,
            boolean attempted,
            boolean canDelete,
            String retentionReason,
            List<TestItem> tests) {
    }

    public record Page(List<Summary> content, long totalElements, int totalPages, int page, int size) {
    }

    public record Targets(
            List<CourseItem> courses,
            List<ChapterItem> chapters,
            List<LessonItem> lessons,
            List<GrammarItem> grammars,
            List<TestOption> tests) {
    }

    public record CourseItem(Long id, String name) {
    }

    public record ChapterItem(Long id, Long courseId, Integer chapterNo, String title) {
    }

    public record LessonItem(Long id, Long chapterId, String skillType, Integer lessonNo, String title) {
    }

    public record GrammarItem(Long id, Long lessonId, String structureName) {
    }

    public record TestOption(Long id, String testType, String skill, String title, Long chapterId, Long lessonId) {
    }

    public record TestItem(Long id, String testType, String skill, String title, String status, boolean locked) {
    }

    public record DeleteResult(Long id, boolean archived, String reason) {
    }
}
