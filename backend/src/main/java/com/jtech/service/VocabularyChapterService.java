package com.jtech.service;

import com.jtech.entity.Chapter;
import com.jtech.entity.Course;
import com.jtech.entity.Lesson;
import com.jtech.repository.*;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class VocabularyChapterService {

    public record Flashcard(
        Long id,
        Long lessonId,
        int lessonNo,
        String lessonTitle,
        String word,
        String reading,
        String meaningVi,
        String exampleJp,
        String exampleVi
    ) {}

    private final ChapterRepository chapters;
    private final LessonRepository lessons;
    private final VocabularyRepository vocabulary;
    private final VocabularyService access;

    public VocabularyChapterService(
        ChapterRepository chapters,
        LessonRepository lessons,
        VocabularyRepository vocabulary,
        VocabularyService access
    ) {
        this.chapters = chapters;
        this.lessons = lessons;
        this.vocabulary = vocabulary;
        this.access = access;
    }

    public List<Flashcard> flashcards(Long chapterId) {
        access.require(chapters, chapterId);
        var lessonMap = lessons
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
        return vocabulary
            .findForChapter(chapterId, Lesson.SkillType.VOCABULARY)
            .stream()
            .filter(
                word -> lessonMap.containsKey(word.getLessonId())
            )
            .map(word ->
                new Flashcard(
                    word.getId(),
                    word.getLessonId(),
                    lessonMap.get(word.getLessonId()).getLessonNo(),
                    lessonMap.get(word.getLessonId()).getTitle(),
                    word.getWord(),
                    word.getReading(),
                    word.getMeaningVi(),
                    word.getExampleJp(),
                    word.getExampleVi()
                )
            )
            .toList();
    }

    public List<Flashcard> studentFlashcards(Long chapterId) {
        Chapter chapter = chapters.findById(chapterId).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy chương.")
        );
        if (
            chapter.getStatus() != Course.Status.PUBLISHED ||
            chapter.getCourse().getStatus() != Course.Status.PUBLISHED
        ) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy chương.");
        }
        var lessonMap = lessons
            .findByChapterIdAndSkillTypeOrderByDisplayOrderAscLessonNoAscIdAsc(
                chapterId,
                Lesson.SkillType.VOCABULARY
            )
            .stream()
            .filter(lesson -> lesson.getStatus() == Course.Status.PUBLISHED)
            .collect(Collectors.toMap(Lesson::getId, lesson -> lesson));
        return vocabulary
            .findForChapter(chapterId, Lesson.SkillType.VOCABULARY)
            .stream()
            .filter(word -> lessonMap.containsKey(word.getLessonId()))
            .map(word -> {
                Lesson lesson = lessonMap.get(word.getLessonId());
                return new Flashcard(
                    word.getId(),
                    lesson.getId(),
                    lesson.getLessonNo(),
                    lesson.getTitle(),
                    word.getWord(),
                    word.getReading(),
                    word.getMeaningVi(),
                    word.getExampleJp(),
                    word.getExampleVi()
                );
            })
            .toList();
    }
}
