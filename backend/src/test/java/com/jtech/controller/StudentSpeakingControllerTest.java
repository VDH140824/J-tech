package com.jtech.controller;

import com.jtech.service.SpeakingService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.security.Principal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class StudentSpeakingControllerTest {
    private static final String EMAIL = "student@test.local";
    private static final Principal PRINCIPAL = () -> EMAIL;
    private static final MockMultipartFile AUDIO = new MockMultipartFile("audio", new byte[2048]);

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void anonymousCallsNeverReachTheService() {
        try (var context = new AnnotationConfigApplicationContext(Config.class)) {
            var controller = context.getBean(StudentSpeakingController.class);
            SecurityContextHolder.clearContext();

            for (Executable call : endpoints(controller))
                assertThrows(AuthenticationCredentialsNotFoundException.class, call);
            verifyNoInteractions(context.getBean(SpeakingService.class));
        }
    }

    @Test
    void adminsAndModeratorsCannotUseSpeakingPractice() {
        try (var context = new AnnotationConfigApplicationContext(Config.class)) {
            var controller = context.getBean(StudentSpeakingController.class);
            for (var role : List.of("ADMIN", "ROLE_ADMIN", "MODERATOR", "ROLE_MODERATOR")) {
                authenticate(role);
                for (Executable call : endpoints(controller))
                    assertThrows(AccessDeniedException.class, call, role);
            }
            verifyNoInteractions(context.getBean(SpeakingService.class));
        }
    }

    @Test
    void studentsReachEveryEndpointWithTheirOwnEmail() throws Throwable {
        try (var context = new AnnotationConfigApplicationContext(Config.class)) {
            var controller = context.getBean(StudentSpeakingController.class);
            var service = context.getBean(SpeakingService.class);
            for (var role : List.of("STUDENT", "ROLE_STUDENT")) {
                authenticate(role);
                for (Executable call : endpoints(controller)) call.execute();
            }

            verify(service, times(2)).scenarios(5L, EMAIL);
            verify(service, times(2)).start(3L, true, EMAIL);
            verify(service, times(2)).submitTurn(eq(10L), eq(1), any(byte[].class), eq(EMAIL));
            verify(service, times(2)).finish(10L, EMAIL);
            verify(service, times(2)).get(10L, EMAIL);
        }
    }

    private static List<Executable> endpoints(StudentSpeakingController controller) {
        return List.of(
                () -> controller.scenarios(5L, PRINCIPAL),
                () -> controller.start(3L, true, PRINCIPAL),
                () -> controller.submitTurn(10L, 1, AUDIO, PRINCIPAL),
                () -> controller.finish(10L, PRINCIPAL),
                () -> controller.get(10L, PRINCIPAL));
    }

    private static void authenticate(String role) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                EMAIL, "", List.of(new SimpleGrantedAuthority(role))));
    }

    @Configuration
    @EnableMethodSecurity
    static class Config {
        @Bean SpeakingService speakingService() { return mock(SpeakingService.class); }
        @Bean StudentSpeakingController controller(SpeakingService service) {
            return new StudentSpeakingController(service);
        }
    }
}
