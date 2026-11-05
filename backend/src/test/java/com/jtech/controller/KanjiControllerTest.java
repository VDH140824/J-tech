package com.jtech.controller;

import com.jtech.dto.response.*;
import com.jtech.entity.*;
import com.jtech.exception.*;
import com.jtech.repository.UserRepository;
import com.jtech.service.KanjiService;
import org.junit.jupiter.api.*;
import org.springframework.data.domain.Page;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class KanjiControllerTest {
    MockMvc mvc;
    KanjiService service;
    UserRepository users;
    @BeforeEach void setup() {
        service = mock(KanjiService.class); users = mock(UserRepository.class);
        var user = User.builder().userId(9L).build();
        when(users.findByEmail("moderator@example.test")).thenReturn(Optional.of(user));
        mvc = MockMvcBuilders.standaloneSetup(new KanjiController(service, users))
                .setControllerAdvice(new KanjiExceptionHandler(), new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver()).build();
    }
    @Test void multipartCreateReturns201AndUsesAuthenticatedActor() throws Exception {
        var part = new MockMultipartFile("request", "", "application/json",
                "{\"characterText\":\"日\",\"meaningVi\":\"Ngày\"}".getBytes(StandardCharsets.UTF_8));
        when(service.create(eq(9L), eq(1L), any(), isNull())).thenReturn(
                new KanjiDetailResponse(2L, 1L, "日", null, null, null, "Ngày", null, null, null, null, 1, Kanji.Status.DRAFT, null, null));
        mvc.perform(multipart("/lessons/1/kanji").file(part).principal(() -> "moderator@example.test"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("DRAFT"));
        verify(service).create(eq(9L), eq(1L), any(), isNull());
    }
    @Test void invalidFormReturns400() throws Exception {
        var part = new MockMultipartFile("request", "", "application/json", "{}".getBytes(StandardCharsets.UTF_8));
        mvc.perform(multipart("/lessons/1/kanji").file(part)).andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
    @Test void notFoundRetains404() throws Exception {
        when(service.getDetail(99L)).thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Kanji not found"));
        mvc.perform(get("/kanji/99")).andExpect(status().isNotFound()).andExpect(jsonPath("$.message").value("Kanji not found"));
    }
    @Test void hardDeleteReturns204() throws Exception {
        when(service.deleteOrArchive(9L, 2L)).thenReturn(true);
        mvc.perform(delete("/kanji/2").principal(() -> "moderator@example.test")).andExpect(status().isNoContent());
    }
    @Test void archiveReturns200WithResult() throws Exception {
        when(service.deleteOrArchive(9L, 2L)).thenReturn(false);
        mvc.perform(delete("/kanji/2").principal(() -> "moderator@example.test"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.result").value("ARCHIVED"));
    }
    @Test void invalidStatusReturns400() throws Exception {
        mvc.perform(get("/lessons/1/kanji").param("status", "UNKNOWN")).andExpect(status().isBadRequest());
    }
    @Test void emptyListIsSuccessfulPage() throws Exception {
        when(service.listByLesson(eq(1L), any(), any(), any())).thenReturn(Page.empty(org.springframework.data.domain.PageRequest.of(0, 20)));
        mvc.perform(get("/lessons/1/kanji").param("search", "日").param("page", "0"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content").isEmpty());
    }
}
