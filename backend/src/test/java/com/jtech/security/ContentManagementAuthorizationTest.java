package com.jtech.security;

import com.jtech.controller.*;
import com.jtech.repository.*;
import com.jtech.service.*;
import org.junit.jupiter.api.*;
import org.springframework.context.annotation.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import java.lang.reflect.InvocationTargetException;
import java.util.*;
import java.util.stream.Stream;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ContentManagementAuthorizationTest {
    static AnnotationConfigApplicationContext context;
    @BeforeAll static void setup() { context = new AnnotationConfigApplicationContext(Config.class); }
    @AfterAll static void close() { context.close(); }
    @AfterEach void cleanup() { SecurityContextHolder.clearContext(); }

    @TestFactory Stream<DynamicTest> rejectsAdminAndStudentForEveryManagementOperation() {
        return Stream.of(KanjiController.class, GrammarController.class, QuestionGrammarController.class, LessonController.class)
                .flatMap(type -> Arrays.stream(type.getDeclaredMethods())
                        .filter(method -> java.lang.reflect.Modifier.isPublic(method.getModifiers()))
                        .filter(method -> type.isAnnotationPresent(PreAuthorize.class) || method.isAnnotationPresent(PreAuthorize.class))
                        .flatMap(method -> Stream.of("ADMIN", "ROLE_ADMIN", "STUDENT", "ROLE_STUDENT")
                                .map(role -> DynamicTest.dynamicTest(type.getSimpleName() + "." + method.getName() + " rejects " + role, () -> {
                                    authenticate(role);
                                    try {
                                        var error = assertThrows(InvocationTargetException.class,
                                                () -> method.invoke(context.getBean(type), new Object[method.getParameterCount()]));
                                        assertInstanceOf(AccessDeniedException.class, error.getCause());
                                    } finally { SecurityContextHolder.clearContext(); }
                                }))));
    }

    @Test void moderatorCanReachContentManagement() {
        for (String role : List.of("MODERATOR", "ROLE_MODERATOR")) {
            authenticate(role);
            assertDoesNotThrow(() -> context.getBean(KanjiController.class).getKanji(1L));
            assertDoesNotThrow(() -> context.getBean(GrammarController.class).getGrammarById(1L));
            assertDoesNotThrow(() -> context.getBean(QuestionGrammarController.class).getAllGrammarQuestions());
            assertDoesNotThrow(() -> context.getBean(LessonController.class).deleteLesson(99L));
        }
    }

    private static void authenticate(String role) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                "user@example.test", "", List.of(new SimpleGrantedAuthority(role))));
    }

    @Configuration @EnableMethodSecurity
    static class Config {
        @Bean KanjiService kanjiService() { return mock(KanjiService.class); }
        @Bean GrammarService grammarService() { return mock(GrammarService.class); }
        @Bean QuestionGrammarService questionGrammarService() { return mock(QuestionGrammarService.class); }
        @Bean CloudinaryService cloudinaryService() { return mock(CloudinaryService.class); }
        @Bean UserRepository users() { return mock(UserRepository.class); }
        @Bean LessonRepository lessons() { return mock(LessonRepository.class); }
        @Bean ChapterRepository chapters() { return mock(ChapterRepository.class); }
        @Bean KanjiController kanjiController() { return new KanjiController(kanjiService(), users()); }
        @Bean GrammarController grammarController() { return new GrammarController(grammarService(), cloudinaryService()); }
        @Bean QuestionGrammarController questionsController() { return new QuestionGrammarController(questionGrammarService()); }
        @Bean LessonController lessonController() { return new LessonController(lessons(), chapters(), kanjiService()); }
    }
}
