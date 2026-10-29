package com.jtech.controller;

import com.jtech.exception.GlobalExceptionHandler;
import com.jtech.service.VocabularyMiniTestService;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class VocabularyMiniTestControllerTest {
    @Configuration @EnableMethodSecurity static class SecurityConfiguration {}
    @Test void studentsCannotReadAnswersOrChangeTests() {
        try (var context = new AnnotationConfigApplicationContext()) {
            context.register(SecurityConfiguration.class);
            context.registerBean(VocabularyMiniTestService.class, () -> mock(VocabularyMiniTestService.class));
            context.registerBean(com.jtech.service.VocabularyChapterTestService.class, () -> mock(com.jtech.service.VocabularyChapterTestService.class));
            context.register(VocabularyMiniTestController.class, VocabularyChapterTestController.class); context.refresh();
            SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("student", "", List.of(new SimpleGrantedAuthority("ROLE_STUDENT"))));
            var controller = context.getBean(VocabularyMiniTestController.class);
            assertThrows(AccessDeniedException.class, () -> controller.detail(1L));
            assertThrows(AccessDeniedException.class, () -> controller.archive(1L));
            assertThrows(AccessDeniedException.class, () -> controller.preview(1L, java.util.Map.of()));
            assertThrows(AccessDeniedException.class, () -> context.getBean(VocabularyChapterTestController.class).setup(1L));
            assertThrows(AccessDeniedException.class, () -> context.getBean(VocabularyChapterTestController.class).preview(1L, java.util.Map.of()));
        } finally { SecurityContextHolder.clearContext(); }
    }
    @Test void invalidDurationAndQuestionCountsAreRejectedBeforeWrites() throws Exception {
        var service = mock(VocabularyMiniTestService.class);
        var mvc = MockMvcBuilders.standaloneSetup(new VocabularyMiniTestController(service)).setControllerAdvice(new GlobalExceptionHandler()).build();
        mvc.perform(post("/moderator/vocabulary/lessons/1/mini-tests").contentType(MediaType.APPLICATION_JSON).content("""
            {"title":"Test","durationMinutes":4,"passingScore":70,"status":"PUBLISHED","questions":[]}
            """)).andExpect(status().isBadRequest());
        verify(service, never()).generate(anyLong(), any(), any());
    }
}
