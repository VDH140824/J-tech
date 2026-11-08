package com.jtech.controller;

import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class StudentChapterControllerTest {
    @Test
    void onlyStudentCanReadTheirChapterList() {
        try (var context = new AnnotationConfigApplicationContext(Config.class)) {
            var controller = context.getBean(StudentChapterController.class);
            clearInvocations(context.getBean(JdbcTemplate.class));
            for (var role : List.of("ROLE_ADMIN", "ADMIN", "ROLE_MODERATOR", "MODERATOR")) {
                authenticate(role);
                assertThrows(AccessDeniedException.class, () -> controller.chapters(1L, () -> "student@test.local"));
            }
            verifyNoInteractions(context.getBean(JdbcTemplate.class));
            for (var role : List.of("ROLE_STUDENT", "STUDENT")) {
                authenticate(role);
                var error = assertThrows(ResponseStatusException.class,
                        () -> controller.chapters(1L, () -> "student@test.local"));
                assertEquals(404, error.getStatusCode().value());
            }
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    private void authenticate(String role) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                "student@test.local", "", List.of(new SimpleGrantedAuthority(role))));
    }

    @Configuration
    @EnableMethodSecurity
    static class Config {
        @Bean JdbcTemplate jdbc() { return mock(JdbcTemplate.class); }
        @Bean StudentChapterController controller(JdbcTemplate jdbc) { return new StudentChapterController(jdbc); }
    }
}
