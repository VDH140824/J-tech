package com.jtech.audit;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jtech.entity.User;
import com.jtech.repository.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.mock.web.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerMapping;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AdminAuditInterceptorTest {
    private final UserRepository users=mock(UserRepository.class);
    private final SystemLogRepository logs=mock(SystemLogRepository.class);
    private final AdminAuditInterceptor interceptor=new AdminAuditInterceptor(users,logs,new ObjectMapper());
    private final MockHttpServletRequest request=new MockHttpServletRequest("PATCH","/api/admin/users/8/status");
    private final MockHttpServletResponse response=new MockHttpServletResponse();
    static class ExampleController { public void update() {} }
    private HandlerMethod handler() throws Exception { return new HandlerMethod(new ExampleController(),ExampleController.class.getMethod("update")); }
    private void login(String role) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("admin@test.local","secret",
            List.of(new SimpleGrantedAuthority(role))));
    }
    @AfterEach void clear() { SecurityContextHolder.clearContext(); }
    @Test void capturesActorBeforeChangesAndWritesSafeOutcomeForSharedEndpoint() throws Exception {
        login("ROLE_ADMIN"); var actor=new User(); actor.setUserId(3L);
        when(users.findByEmail("admin@test.local")).thenReturn(Optional.of(actor));
        request.setRequestURI("/api/lessons/8");
        request.setAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE,"/lessons/{id}");
        request.setAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE,Map.of("id","8"));
        request.addHeader("Authorization","Bearer secret-token"); request.setContent("private-body".getBytes());
        var handler=handler(); interceptor.preHandle(request,response,handler);
        SecurityContextHolder.clearContext();
        interceptor.afterCompletion(request,response,handler,null);
        var detail=org.mockito.ArgumentCaptor.forClass(String.class);
        verify(logs).append(eq(3L),eq("ExampleController.update"),eq("Example"),eq(8L),eq("INFO"),detail.capture(),anyString(),isNull());
        assertTrue(detail.getValue().contains("SUCCESS"));
        assertFalse(detail.getValue().contains("secret")); assertFalse(detail.getValue().contains("private-body"));
    }
    @Test void recordsResolvedFailureAndDoesNotBreakResponseIfAuditStorageFails() throws Exception {
        login("ADMIN"); var actor=new User(); actor.setUserId(3L);
        when(users.findByEmail(anyString())).thenReturn(Optional.of(actor));
        var handler=handler(); interceptor.preHandle(request,response,handler); response.setStatus(400);
        doThrow(new IllegalStateException("unavailable")).when(logs).append(anyLong(),anyString(),anyString(),isNull(),eq("WARNING"),anyString(),anyString(),isNull());
        assertDoesNotThrow(() -> interceptor.afterCompletion(request,response,handler,null));
        verify(logs).append(eq(3L),anyString(),anyString(),isNull(),eq("WARNING"),contains("FAILED"),anyString(),isNull());
    }
    @Test void ignoresReadsAndOtherRoles() throws Exception {
        var handler=handler(); login("ROLE_ADMIN"); request.setMethod("GET");
        interceptor.preHandle(request,response,handler); interceptor.afterCompletion(request,response,handler,null);
        request.setMethod("DELETE"); login("ROLE_MODERATOR");
        interceptor.preHandle(request,response,handler); interceptor.afterCompletion(request,response,handler,null);
        verifyNoInteractions(users,logs);
    }
    @Test void recordsUnhandledFailureAsError() throws Exception {
        login("ROLE_ADMIN"); var actor=new User(); actor.setUserId(3L);
        when(users.findByEmail(anyString())).thenReturn(Optional.of(actor));
        var handler=handler(); interceptor.preHandle(request,response,handler);
        interceptor.afterCompletion(request,response,handler,new IllegalStateException("private internal details"));
        verify(logs).append(eq(3L),anyString(),anyString(),isNull(),eq("ERROR"),contains("\"status\":500"),anyString(),isNull());
    }
}
