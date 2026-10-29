package com.jtech.service;

import com.jtech.controller.VocabularyController;
import com.jtech.dto.request.*;
import com.jtech.entity.*;
import com.jtech.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Validation;
import org.junit.jupiter.api.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** One method per column in the Vocab Access report sheet. */
class VocabularyAccessUnitTest {

    private final VocabularyService service = new VocabularyService(mock(LessonRepository.class));
    private Vocabulary word(Course.Status status) { var v = new Vocabulary(); v.setStatus(status); return v; }

    @Test
    @DisplayName("Vocab Access/UTC001: Filter words by role")
    void utc001() throws Exception {
        var published = word(Course.Status.PUBLISHED); var draft = word(Course.Status.DRAFT); var archived = word(Course.Status.ARCHIVED);
        var items = List.of(draft, published, archived);
        var auth = new UsernamePasswordAuthenticationToken("user", "", List.of(new SimpleGrantedAuthority("ROLE_STUDENT")));
        assertEquals(List.of(published), service.visible(items, null, auth));
    }

    @Test
    @DisplayName("Vocab Access/UTC002: Filter words by role")
    void utc002() throws Exception {
        var published = word(Course.Status.PUBLISHED); var draft = word(Course.Status.DRAFT); var archived = word(Course.Status.ARCHIVED);
        var items = List.of(draft, published, archived);
        var auth = new UsernamePasswordAuthenticationToken("user", "", List.of(new SimpleGrantedAuthority("ROLE_STUDENT")));
        assertEquals(List.of(published), service.visible(items, Course.Status.DRAFT, auth));
    }

    @Test
    @DisplayName("Vocab Access/UTC003: Filter words by role")
    void utc003() throws Exception {
        var published = word(Course.Status.PUBLISHED); var draft = word(Course.Status.DRAFT); var archived = word(Course.Status.ARCHIVED);
        var items = List.of(draft, published, archived);
        var auth = new UsernamePasswordAuthenticationToken("user", "", List.of(new SimpleGrantedAuthority("ROLE_STUDENT")));
        assertEquals(List.of(published), service.visible(items, Course.Status.ARCHIVED, auth));
    }

    @Test
    @DisplayName("Vocab Access/UTC004: Filter words by role")
    void utc004() throws Exception {
        var published = word(Course.Status.PUBLISHED); var draft = word(Course.Status.DRAFT); var archived = word(Course.Status.ARCHIVED);
        var items = List.of(draft, published, archived);
        var auth = new UsernamePasswordAuthenticationToken("user", "", List.of(new SimpleGrantedAuthority("ROLE_MODERATOR")));
        assertEquals(items, service.visible(items, null, auth));
    }

    @Test
    @DisplayName("Vocab Access/UTC005: Filter words by role")
    void utc005() throws Exception {
        var published = word(Course.Status.PUBLISHED); var draft = word(Course.Status.DRAFT); var archived = word(Course.Status.ARCHIVED);
        var items = List.of(draft, published, archived);
        var auth = new UsernamePasswordAuthenticationToken("user", "", List.of(new SimpleGrantedAuthority("ROLE_MODERATOR")));
        assertEquals(List.of(draft), service.visible(items, Course.Status.DRAFT, auth));
    }

    @Test
    @DisplayName("Vocab Access/UTC006: Filter words by role")
    void utc006() throws Exception {
        var published = word(Course.Status.PUBLISHED); var draft = word(Course.Status.DRAFT); var archived = word(Course.Status.ARCHIVED);
        var items = List.of(draft, published, archived);
        var auth = new UsernamePasswordAuthenticationToken("user", "", List.of(new SimpleGrantedAuthority("ROLE_MODERATOR")));
        assertEquals(List.of(archived), service.visible(items, Course.Status.ARCHIVED, auth));
    }
}
