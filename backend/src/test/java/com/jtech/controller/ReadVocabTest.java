package com.jtech.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;

import com.jtech.entity.Course;
import com.jtech.entity.Vocabulary;
import com.jtech.repository.LessonRepository;
import com.jtech.service.VocabularyService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

class ReadVocabTest {

    private final VocabularyService service = new VocabularyService(mock(LessonRepository.class));

    @Test
    void moderatorCanFilterArchivedVocabulary() {
        var moderator = new UsernamePasswordAuthenticationToken(
            "moderator", "", List.of(new SimpleGrantedAuthority("ROLE_MODERATOR"))
        );
        var draft = wordWithStatus(Course.Status.DRAFT);
        var archived = wordWithStatus(Course.Status.ARCHIVED);

        assertEquals(List.of(archived), service.visible(List.of(draft, archived), Course.Status.ARCHIVED, moderator));
    }

    @Test
    void studentSeesOnlyPublishedVocabulary() {
        var student = new UsernamePasswordAuthenticationToken(
            "student", "", List.of(new SimpleGrantedAuthority("ROLE_STUDENT"))
        );
        var published = wordWithStatus(Course.Status.PUBLISHED);
        var archived = wordWithStatus(Course.Status.ARCHIVED);

        assertEquals(List.of(published), service.visible(List.of(published, archived), null, student));
    }

    private Vocabulary wordWithStatus(Course.Status status) {
        var word = new Vocabulary();
        word.setStatus(status);
        return word;
    }
}
