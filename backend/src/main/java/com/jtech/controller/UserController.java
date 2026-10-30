package com.jtech.controller;

import com.jtech.dto.request.UpdateProfileRequest;
import com.jtech.dto.response.UserResponse;
import com.jtech.service.AuthService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.security.Principal;

@RestController
@RequestMapping("/users")
public class UserController {

    private static final Logger log = LoggerFactory.getLogger(UserController.class);

    private final AuthService authService;

    public UserController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getCurrentUser(Principal principal) {
        traceAuthentication("/users/me", principal);
        return ResponseEntity.ok(authService.getCurrentUser(principal));
    }

    private void traceAuthentication(String path, Principal principal) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Object authenticationPrincipal = authentication != null ? authentication.getPrincipal() : null;
        log.info("[AUTH-TRACE] path={} authenticationClass={} principalClass={} principalName={} authenticated={}",
                path,
                authentication != null ? authentication.getClass().getName() : null,
                authenticationPrincipal != null ? authenticationPrincipal.getClass().getName() : null,
                principal != null ? principal.getName() : null,
                authentication != null && authentication.isAuthenticated());
    }

    @PutMapping("/profile")
    public ResponseEntity<UserResponse> updateProfile(
            @RequestParam(value = "userId", required = false) Long userId,
            @Valid @RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(authService.updateProfile(userId, request));
    }

    @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UserResponse> updateAvatar(@RequestPart("file") MultipartFile file) {
        try {
            return ResponseEntity.ok(authService.updateAvatar(file));
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, exception.getMessage(), exception);
        }
    }

}
