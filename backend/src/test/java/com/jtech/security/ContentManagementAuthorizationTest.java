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
    private static final Set<String> ADMIN_ALLOWED = Set.of(
            "GrammarController.deleteTemporaryGrammarVideo",
            "LessonController.createLesson",
            "LessonController.updateLesson");
    static AnnotationConfigApplicationContext context;
    @BeforeAll static void setup() { context = new AnnotationConfigApplicationContext(Config.class); }
    @AfterAll static void close() { context.close(); }
    @AfterEach void cleanup() { SecurityContextHolder.clearContext(); }

    @TestFactory Stream<DynamicTest> rejectsUnauthorizedRolesForManagementOperations() {
        return Stream.of(KanjiController.class, GrammarController.class, QuestionGrammarController.class, LessonController.class)
                .flatMap(type -> Arrays.stream(type.getDeclaredMethods())
                        .filter(method -> java.lang.reflect.Modifier.isPublic(method.getModifiers()))
                        .filter(method -> type.isAnnotationPresent(PreAuthorize.class) || method.isAnnotationPresent(PreAuthorize.class))
                        .flatMap(method -> {
                            Stream<String> deniedRoles = ADMIN_ALLOWED.contains(type.getSimpleName() + "." + method.getName())
                                    ? Stream.of("STUDENT", "ROLE_STUDENT")
                                    : Stream.of("ADMIN", "ROLE_ADMIN", "STUDENT", "ROLE_STUDENT");
                            return deniedRoles
                                .map(role -> DynamicTest.dynamicTest(type.getSimpleName() + "." + method.getName() + " rejects " + role, () -> {
                                    authenticate(role);
                                    try {
                                        var error = assertThrows(InvocationTargetException.class,
                                                () -> method.invoke(context.getBean(type), new Object[method.getParameterCount()]));
                                        assertInstanceOf(AccessDeniedException.class, error.getCause());
                                    } finally { SecurityContextHolder.clearContext(); }
                                }));
                        }));
    }

    @TestFactory Stream<DynamicTest> allowsAdminForApprovedOperations() {
        return Stream.of(
                new Object[]{GrammarController.class, "deleteTemporaryGrammarVideo", new Class<?>[]{String.class}},
                new Object[]{LessonController.class, "createLesson", new Class<?>[]{Long.class, Long.class,
                        com.jtech.dto.request.LessonRequest.class, org.springframework.web.multipart.MultipartFile.class}},
                new Object[]{LessonController.class, "updateLesson", new Class<?>[]{Long.class,
                        com.jtech.dto.request.LessonRequest.class, org.springframework.web.multipart.MultipartFile.class}})
                .flatMap(operation -> Stream.of("ADMIN", "ROLE_ADMIN").map(role -> DynamicTest.dynamicTest(
                        ((Class<?>) operation[0]).getSimpleName() + "." + operation[1] + " allows " + role, () -> {
                            authenticate(role);
                            try {
                                var method = ((Class<?>) operation[0]).getMethod((String) operation[1], (Class<?>[]) operation[2]);
                                assertDoesNotThrow(() -> method.invoke(context.getBean((Class<?>) operation[0]),
                                        new Object[method.getParameterCount()]));
                            } finally { SecurityContextHolder.clearContext(); }
                        })));
    }

    @Test void moderatorCanReachContentManagement() {
        for (String role : List.of("MODERATOR", "ROLE_MODERATOR")) {
            authenticate(role);
            assertDoesNotThrow(() -> context.getBean(KanjiController.class).getKanji(1L));
            assertDoesNotThrow(() -> context.getBean(GrammarController.class).getGrammarById(1L));
            assertDoesNotThrow(() -> context.getBean(QuestionGrammarController.class).getAllGrammarQuestions(1L));
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
        @Bean LessonService lessonService() { return mock(LessonService.class); }
        @Bean CloudinaryService cloudinaryService() { return mock(CloudinaryService.class); }
        @Bean UserRepository users() { return mock(UserRepository.class); }
        @Bean LessonRepository lessons() { return mock(LessonRepository.class); }
        @Bean ChapterRepository chapters() { return mock(ChapterRepository.class); }
        @Bean KanjiController kanjiController() { return new KanjiController(kanjiService(), users()); }
        @Bean GrammarController grammarController() { return new GrammarController(grammarService(), cloudinaryService()); }
        @Bean QuestionGrammarController questionsController() { return new QuestionGrammarController(questionGrammarService()); }
        @Bean LessonController lessonController() { return new LessonController(lessonService()); }
    }
}
