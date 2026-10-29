package com.jtech.service;

import com.jtech.entity.Course;
import com.jtech.entity.Lesson;
import com.jtech.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class VocabularyChapterService {
    public record Flashcard(Long id, Long lessonId, int lessonNo, String lessonTitle, String word, String reading,
            String meaningVi, String exampleJp, String exampleVi, String audioUrl) {}
    private final ChapterRepository chapters;
    private final LessonRepository lessons;
    private final VocabularyRepository vocabulary;
    private final VocabularyService access;
    public VocabularyChapterService(ChapterRepository chapters, LessonRepository lessons, VocabularyRepository vocabulary, VocabularyService access) {
        this.chapters = chapters; this.lessons = lessons; this.vocabulary = vocabulary; this.access = access;
    }
    public List<Flashcard> flashcards(Long chapterId) {
        access.require(chapters, chapterId);
        var lessonMap = lessons.findByChapterIdAndSkillTypeOrderByDisplayOrderAscLessonNoAscIdAsc(chapterId, Lesson.SkillType.VOCABULARY).stream()
                .filter(lesson -> lesson.getStatus() == Course.Status.PUBLISHED || lesson.getStatus() == Course.Status.DRAFT)
                .collect(Collectors.toMap(Lesson::getId, lesson -> lesson));
        return vocabulary.findForChapter(chapterId, Lesson.SkillType.VOCABULARY).stream()
                .filter(word -> lessonMap.containsKey(word.getLessonId()) && (word.getStatus() == Course.Status.PUBLISHED || word.getStatus() == Course.Status.DRAFT))
                .map(word -> new Flashcard(word.getId(), word.getLessonId(), lessonMap.get(word.getLessonId()).getLessonNo(),
                        lessonMap.get(word.getLessonId()).getTitle(), word.getWord(), word.getReading(), word.getMeaningVi(), word.getExampleJp(), word.getExampleVi(), word.getAudioUrl())).toList();
    }
}
