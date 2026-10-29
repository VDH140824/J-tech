package com.jtech.controller;

import com.cloudinary.Cloudinary;
import com.jtech.entity.*;
import com.jtech.exception.GlobalExceptionHandler;
import com.jtech.repository.UserRepository;
import com.jtech.service.FeedbackService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.util.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class FeedbackControllerTest {
    private final JdbcTemplate db = mock(JdbcTemplate.class);
    private final UserRepository users = mock(UserRepository.class);
    private MockMvc mvc;

    @BeforeEach void setup() {
        var service = new FeedbackService(db, users, mock(Cloudinary.class), mock(ApplicationEventPublisher.class));
        mvc = MockMvcBuilders.standaloneSetup(new FeedbackController(service, db))
            .setControllerAdvice(new GlobalExceptionHandler()).build();
        for (String role : List.of("STUDENT", "MODERATOR", "ADMIN")) {
            when(users.findByEmail(role)).thenReturn(Optional.of(User.builder().userId(4L).email(role)
                .status(UserStatus.ACTIVE).role(Role.builder().roleName(role).build()).build()));
        }
    }
    @Test void studentCannotAccessStaffQueues() throws Exception {
        for (String portal : List.of("admin", "moderator")) {
            mvc.perform(get("/" + portal + "/feedback").principal(() -> "STUDENT")).andExpect(status().isForbidden());
        }
        verifyNoInteractions(db);
    }
    @Test void staffCannotAccessOtherQueue() throws Exception {
        mvc.perform(get("/admin/feedback").principal(() -> "MODERATOR")).andExpect(status().isForbidden());
        mvc.perform(get("/moderator/feedback").principal(() -> "ADMIN")).andExpect(status().isForbidden());
        verifyNoInteractions(db);
    }
    @Test void studentCannotReadAnotherStudentsTicket() throws Exception {
        when(db.queryForList(anyString(), any(Object[].class))).thenReturn(List.of());
        mvc.perform(get("/feedback/8").principal(() -> "STUDENT")).andExpect(status().isNotFound());
        verify(db).queryForList(contains("AND f.user_id=?"), eq(8L), eq(4L));
    }
    @Test void rejectsBlankMultipartFeedback() throws Exception {
        var json = new MockMultipartFile("feedback", "", "application/json", "{\"feedbackType\":\"TECHNICAL\",\"category\":\"SYSTEM\",\"title\":\" \",\"content\":\"Body\"}".getBytes());
        mvc.perform(multipart("/feedback").file(json).principal(() -> "STUDENT")).andExpect(status().isBadRequest());
        verifyNoInteractions(db);
    }
    @Test void rejectsInvalidStatusAndMissingMultipartPart() throws Exception {
        mvc.perform(patch("/moderator/feedback/8").principal(() -> "MODERATOR").contentType("application/json")
            .content("{\"status\":\"FAKE\"}")).andExpect(status().isBadRequest());
        mvc.perform(multipart("/feedback").principal(() -> "STUDENT")).andExpect(status().isBadRequest());
    }
    @Test void staticReferencesRouteDoesNotMatchTicketIdRoute() throws Exception {
        when(db.queryForList(anyString())).thenReturn(List.of());
        mvc.perform(get("/moderator/feedback/references").principal(() -> "MODERATOR"))
            .andExpect(status().isOk()).andExpect(content().json("[]"));
    }
    @Test void notificationReadIsScopedToItsOwner() throws Exception {
        mvc.perform(patch("/feedback/notifications/8/read").principal(() -> "STUDENT"))
            .andExpect(status().isNotFound());
        verify(db).update(contains("AND user_id=?"), eq(8L), eq(4L));
    }
}
