package com.jtech.security;

import com.jtech.entity.RefreshToken;
import com.jtech.entity.Role;
import com.jtech.entity.User;
import com.jtech.entity.UserStatus;
import com.jtech.repository.RefreshTokenRepository;
import com.jtech.repository.RoleRepository;
import com.jtech.repository.UserRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.UUID;

@Component
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;
    private final OAuth2ExchangeStore oAuth2ExchangeStore;
    private final CookieService cookieService;
    private final String frontendUrl;

    public OAuth2SuccessHandler(
            UserRepository userRepository,
            RoleRepository roleRepository,
            RefreshTokenRepository refreshTokenRepository,
            JwtService jwtService,
            OAuth2ExchangeStore oAuth2ExchangeStore,
            CookieService cookieService,
            @Value("${app.frontend.url:http://localhost:5173}") String frontendUrl) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.jwtService = jwtService;
        this.oAuth2ExchangeStore = oAuth2ExchangeStore;
        this.cookieService = cookieService;
        this.frontendUrl = frontendUrl;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        String email = oAuth2User.getAttribute("email");
        String picture = oAuth2User.getAttribute("picture");

        if (email == null || email.isBlank()) {
            getRedirectStrategy().sendRedirect(request, response, frontendUrl + "/login?error=no_email");
            return;
        }

        String displayName = oAuth2User.getAttribute("name");

        User user = userRepository.findByEmail(email).map(existingUser -> {
            existingUser.setLastLogin(LocalDateTime.now());
            if ((existingUser.getDisplayName() == null || existingUser.getDisplayName().isBlank())
                    && displayName != null && !displayName.isBlank()) {
                existingUser.setDisplayName(displayName);
            }
            return userRepository.save(existingUser);
        }).orElseGet(() -> {
            Role userRole = roleRepository.findByRoleName("STUDENT")
                    .orElseGet(() -> {
                        Role role = new Role();
                        role.setRoleName("STUDENT");
                        role.setDescription("Default student role");
                        return roleRepository.save(role);
                    });

            User newUser = new User();
            newUser.setRole(userRole);
            newUser.setEmail(email);
            newUser.setDisplayName(displayName != null && !displayName.isBlank() ? displayName : email);
            newUser.setAvatarUrl(picture);
            newUser.setStatus(UserStatus.PENDING);
            newUser.setLastLogin(LocalDateTime.now());

            return userRepository.save(newUser);

        });

        if (user.getStatus() != UserStatus.ACTIVE) {
            String statusRoute = user.getStatus() == UserStatus.PENDING
                    ? "/pending-approval"
                    : "/account-rejected";
            getRedirectStrategy().sendRedirect(request, response, frontendUrl + statusRoute);
            return;
        }

        RefreshToken refreshToken = refreshTokenRepository.save(RefreshToken.builder()
                .user(user)
                .token(UUID.randomUUID().toString())
                .expiresAt(LocalDateTime.now().plusDays(30))
                .revoked(false)
                .build());

        String token = jwtService.generateToken(user.getEmail());
        String exchangeCode = oAuth2ExchangeStore.createExchangeCode(
                user.getUserId(), token, refreshToken.getToken());

        ResponseCookie refreshCookie = cookieService.createRefreshTokenCookie(refreshToken.getToken());
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());

        ResponseCookie exchangeCookie = cookieService.createExchangeCookie(exchangeCode);
        response.addHeader(HttpHeaders.SET_COOKIE, exchangeCookie.toString());

        if (request.getSession(false) != null) {
            request.getSession().setAttribute("AUTH_EXCHANGE_CODE", exchangeCode);
        }

        String targetUrl = frontendUrl + "/oauth2/redirect";
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}
