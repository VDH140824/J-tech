package com.jtech.controller;

import com.jtech.service.AdminSystemLogService;
import org.junit.jupiter.api.*;
import org.springframework.context.annotation.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AdminSystemLogControllerTest {
    @Configuration @EnableMethodSecurity static class Config {
        @Bean AdminSystemLogService service() { return mock(AdminSystemLogService.class); }
        @Bean AdminSystemLogController controller(AdminSystemLogService service) { return new AdminSystemLogController(service); }
    }
    @AfterEach void clear() { SecurityContextHolder.clearContext(); }
    private void login(String role) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("user","",List.of(new SimpleGrantedAuthority(role))));
    }
    @Test void onlyAdminCanReadListAndDetail() {
        try (var context=new AnnotationConfigApplicationContext(Config.class)) {
            var controller=context.getBean(AdminSystemLogController.class);
            var service=context.getBean(AdminSystemLogService.class);
            login("ROLE_STUDENT");
            assertThrows(org.springframework.security.access.AccessDeniedException.class, () -> controller.detail(1));
            assertThrows(org.springframework.security.access.AccessDeniedException.class, () -> controller.list(null,null,null,null,null,0,10));
            verifyNoInteractions(service);
            login("ROLE_ADMIN"); controller.detail(1); controller.list(null,null,null,null,null,0,10);
            verify(service).detail(1); verify(service).list(null,null,null,null,null,0,10);
        }
    }
}
