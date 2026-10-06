package com.jtech.security;

import com.jtech.entity.Role;
import com.jtech.entity.User;
import com.jtech.entity.UserStatus;
import com.jtech.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.core.context.SecurityContextHolder;

import java.io.IOException;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class JwtAuthenticationFilterTest {

    private JwtService jwtService;
    private CustomUserDetailsService customUserDetailsService;
    private UserRepository userRepository;
    private JwtAuthenticationFilter filter;

    private HttpServletRequest request;
    private HttpServletResponse response;
    private FilterChain filterChain;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
        jwtService = mock(JwtService.class);
        customUserDetailsService = mock(CustomUserDetailsService.class);
        userRepository = mock(UserRepository.class);

        filter = new JwtAuthenticationFilter(jwtService, customUserDetailsService, userRepository);

        request = mock(HttpServletRequest.class);
        response = mock(HttpServletResponse.class);
        filterChain = mock(FilterChain.class);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void testDoFilterInternal_SingleDbQueryAndSuccessfulAuthentication() throws ServletException, IOException {
        String token = "valid.jwt.token";
        String email = "student@jtech.edu.vn";

        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        when(jwtService.extractUsername(token)).thenReturn(email);
        when(jwtService.isTokenValid(token, email)).thenReturn(true);

        User user = new User();
        user.setEmail(email);
        user.setStatus(UserStatus.ACTIVE);
        Role role = new Role();
        role.setRoleName("STUDENT");
        user.setRole(role);

        when(userRepository.findByEmail(email)).thenReturn(Optional.of(user));
        org.springframework.security.core.userdetails.User userDetails =
                new org.springframework.security.core.userdetails.User(
                        email, "", java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_STUDENT")));
        when(customUserDetailsService.buildUserDetails(user)).thenReturn(userDetails);

        filter.doFilterInternal(request, response, filterChain);

        // Verify single query
        verify(userRepository, times(1)).findByEmail(email);

        // Verify loadUserByUsername was NOT called (double query eliminated)
        verify(customUserDetailsService, never()).loadUserByUsername(anyString());

        // Verify buildUserDetails was called directly with the already loaded user
        verify(customUserDetailsService, times(1)).buildUserDetails(user);

        // Verify authentication is set in SecurityContext
        assertNotNull(SecurityContextHolder.getContext().getAuthentication());
        assertEquals(email, SecurityContextHolder.getContext().getAuthentication().getName());
        assertTrue(SecurityContextHolder.getContext().getAuthentication().getAuthorities()
                .stream().anyMatch(a -> a.getAuthority().equals("ROLE_STUDENT")));

        verify(filterChain, times(1)).doFilter(request, response);
    }

    @Test
    void testDoFilterInternal_UserNotActive_NotAuthenticated() throws ServletException, IOException {
        String token = "valid.jwt.token";
        String email = "pending@jtech.edu.vn";

        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        when(jwtService.extractUsername(token)).thenReturn(email);
        when(jwtService.isTokenValid(token, email)).thenReturn(true);

        User user = new User();
        user.setEmail(email);
        user.setStatus(UserStatus.PENDING);

        when(userRepository.findByEmail(email)).thenReturn(Optional.of(user));

        filter.doFilterInternal(request, response, filterChain);

        verify(userRepository, times(1)).findByEmail(email);
        verify(customUserDetailsService, never()).buildUserDetails(any());
        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(filterChain, times(1)).doFilter(request, response);
    }

    @Test
    void testDoFilterInternal_NoBearerToken_NoDbQuery() throws ServletException, IOException {
        when(request.getHeader("Authorization")).thenReturn(null);

        filter.doFilterInternal(request, response, filterChain);

        verify(userRepository, never()).findByEmail(anyString());
        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(filterChain, times(1)).doFilter(request, response);
    }
}
