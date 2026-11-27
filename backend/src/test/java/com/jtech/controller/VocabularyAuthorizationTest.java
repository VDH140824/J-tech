package com.jtech.controller;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.jtech.repository.*;
import com.jtech.service.VocabularyService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

class VocabularyAuthorizationTest {

    @Configuration
    @EnableMethodSecurity
    static class SecurityConfiguration {}

    @Test
    void studentCannotModifyContentButModeratorCan() {
        try (var context = new AnnotationConfigApplicationContext()) {
            context.register(SecurityConfiguration.class);
            context.registerBean(VocabularyService.class, () -> mock(VocabularyService.class));
            context.registerBean(VocabularyRepository.class, () ->
                mock(VocabularyRepository.class)
            );
            context.register(VocabularyController.class);
            context.refresh();
            SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                    "student",
                    "",
                    List.of(new SimpleGrantedAuthority("ROLE_STUDENT"))
                )
            );
            assertThrows(AccessDeniedException.class, () ->
                context.getBean(VocabularyController.class).archive(1L, 1L, null)
            );
            SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                    "moderator",
                    "",
                    List.of(new SimpleGrantedAuthority("ROLE_MODERATOR"))
                )
            );
            var repository = context.getBean(VocabularyRepository.class);
            assertEquals(
                204,
                context.getBean(VocabularyController.class).archive(1L, 1L, null).getStatusCode().value()
            );
            verify(context.getBean(VocabularyService.class)).archive(repository, 1L, 1L, null);
        } finally {
            SecurityContextHolder.clearContext();
        }
    }
}
