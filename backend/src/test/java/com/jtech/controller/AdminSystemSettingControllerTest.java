package com.jtech.controller;

import com.jtech.service.SystemSettingService;
import java.util.List;
import org.junit.jupiter.api.*;
import org.springframework.context.annotation.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AdminSystemSettingControllerTest {
    @Configuration @EnableMethodSecurity static class Config {
        @Bean SystemSettingService service() { return mock(SystemSettingService.class); }
        @Bean AdminSystemSettingController controller(SystemSettingService service) { return new AdminSystemSettingController(service); }
    }
    @AfterEach void clear() { SecurityContextHolder.clearContext(); }
    private void login(String role) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("user","",List.of(new SimpleGrantedAuthority(role))));
    }
    @Test void onlyAdminCanReadAndWriteSettings() {
        try (var context=new AnnotationConfigApplicationContext(Config.class)) {
            var controller=context.getBean(AdminSystemSettingController.class);
            var service=context.getBean(SystemSettingService.class);
            for (String role:List.of("ROLE_STUDENT","ROLE_MODERATOR")) {
                login(role);
                assertThrows(org.springframework.security.access.AccessDeniedException.class,controller::get);
                assertThrows(org.springframework.security.access.AccessDeniedException.class,() -> controller.update(SystemSettingService.defaults(),() -> "user"));
            }
            verifyNoInteractions(service);
            login("ROLE_ADMIN"); controller.get();
            var principal=(java.security.Principal)() -> "user";
            controller.update(SystemSettingService.defaults(),principal);
            verify(service).get(); verify(service).save(SystemSettingService.defaults(),principal);
        }
    }
    @Test void announcementEndpointReturnsOnlyAnnouncementProjection() {
        var service=mock(SystemSettingService.class);
        when(service.announcement()).thenReturn(new SystemSettingService.Announcement(true,"Title","Content"));
        var result=new SystemSettingController(service).announcement();
        assertEquals("Title",result.title()); verify(service).announcement(); verifyNoMoreInteractions(service);
    }
}
