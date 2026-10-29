package com.jtech.controller;

import com.jtech.entity.*;
import com.jtech.dto.request.VocabularyRequest;
import com.jtech.exception.GlobalExceptionHandler;
import com.jtech.repository.VocabularyRepository;
import com.jtech.service.VocabularyService;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.util.Optional;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class VocabularyControllerTest {
    private final VocabularyRepository repository = mock(VocabularyRepository.class);
    private final VocabularyService service = mock(VocabularyService.class);
    private final VocabularyController controller = new VocabularyController(repository, service);

    private static final String VALID_INPUT = """
            {"word":" 日本語 ","reading":" にほんご ","meaningVi":" Tiếng Nhật ",
             "audioUrl":"https://example.com/audio.mp3","displayOrder":2,"status":"DRAFT"}
            """;

    @Test void listChecksLessonThenLoadsAndFiltersWithoutStatusParameter() throws Exception {
        Vocabulary archived = new Vocabulary(); archived.setStatus(Course.Status.ARCHIVED);
        var items = List.of(archived);
        when(repository.findByLessonIdOrderByDisplayOrderAscIdAsc(12L)).thenReturn(items);
        when(service.visible(items, null, null)).thenReturn(items);
        var mvc = MockMvcBuilders.standaloneSetup(controller).build();
        mvc.perform(get("/lessons/12/vocabularies"))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].status").value("ARCHIVED"));
        var order = inOrder(service, repository);
        order.verify(service).checkLesson(12L, null);
        order.verify(repository).findByLessonIdOrderByDisplayOrderAscIdAsc(12L);
        order.verify(service).visible(items, null, null);
        verifyNoMoreInteractions(service, repository);
    }

    @Test void createAndUpdateFollowDiagramOrderAndReturnSavedVocabulary() throws Exception {
        Vocabulary existing = new Vocabulary(); existing.setId(5L); existing.setLessonId(12L);
        when(service.require(repository, 5L)).thenReturn(existing);
        when(repository.save(any())).thenAnswer(call -> call.getArgument(0));
        var mvc = MockMvcBuilders.standaloneSetup(controller).setControllerAdvice(new GlobalExceptionHandler()).build();
        mvc.perform(post("/lessons/12/vocabularies").contentType(MediaType.APPLICATION_JSON).content(VALID_INPUT))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.word").value("日本語"));
        var order = inOrder(service, repository);
        order.verify(service).checkLesson(12L, null);
        order.verify(repository).existsByLessonIdAndWordIgnoreCase(12L, "日本語");
        order.verify(repository).save(any());
        clearInvocations(service, repository);
        mvc.perform(put("/vocabularies/5").contentType(MediaType.APPLICATION_JSON).content(VALID_INPUT))
                .andExpect(status().isOk()).andExpect(jsonPath("$.reading").value("にほんご"))
                .andExpect(jsonPath("$.displayOrder").value(2));
        order = inOrder(service, repository);
        order.verify(service).require(repository, 5L);
        order.verify(repository).existsByLessonIdAndWordIgnoreCaseAndIdNot(12L, "日本語", 5L);
        order.verify(repository).save(existing);
        verifyNoMoreInteractions(service, repository);
    }

    @Test void duplicateCreateAndUpdateReturnConflictWithoutSaving() throws Exception {
        Vocabulary existing = new Vocabulary(); existing.setLessonId(12L);
        when(service.require(repository, 5L)).thenReturn(existing);
        when(repository.existsByLessonIdAndWordIgnoreCase(12L, "日本語")).thenReturn(true);
        when(repository.existsByLessonIdAndWordIgnoreCaseAndIdNot(12L, "日本語", 5L)).thenReturn(true);
        var mvc = MockMvcBuilders.standaloneSetup(controller).setControllerAdvice(new GlobalExceptionHandler()).build();
        mvc.perform(post("/lessons/12/vocabularies").contentType(MediaType.APPLICATION_JSON).content(VALID_INPUT))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.message").isNotEmpty());
        mvc.perform(put("/vocabularies/5").contentType(MediaType.APPLICATION_JSON).content(VALID_INPUT))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.message").isNotEmpty());
        verify(repository, never()).save(any());
    }

    @Test void invalidAudioIsRejectedByValidBeforeAnyBusinessOperation() throws Exception {
        var mvc = MockMvcBuilders.standaloneSetup(controller).setControllerAdvice(new GlobalExceptionHandler()).build();
        String invalid = VALID_INPUT.replace("https://example.com/audio.mp3", "javascript:alert(1)");
        mvc.perform(post("/lessons/12/vocabularies").contentType(MediaType.APPLICATION_JSON).content(invalid))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").isNotEmpty());
        mvc.perform(put("/vocabularies/5").contentType(MediaType.APPLICATION_JSON).content(invalid))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service, repository);
    }

    @Test void createKeepsLessonScopeAndTrimsText() {
        when(repository.save(any())).thenAnswer(call -> call.getArgument(0));
        var request = new VocabularyRequest(" 日本語 ", " にほんご ", " Tiếng Nhật ", "Danh từ", "", "", "https://example.com/audio.mp3", "", 1, Course.Status.DRAFT);
        Vocabulary result = controller.create(12L, request, null).getBody();
        assertNotNull(result); assertEquals(12L, result.getLessonId());
        assertEquals("日本語", result.getWord()); assertEquals("にほんご", result.getReading());
        assertEquals(Course.Status.DRAFT, result.getStatus());
        verify(service).checkLesson(12L, null);
    }
    @Test void deleteArchivesWithoutRemovingLearningHistory() {
        Vocabulary item = new Vocabulary(); item.setId(5L);
        when(service.require(repository, 5L)).thenReturn(item);
        assertEquals(204, controller.archive(5L).getStatusCode().value());
        assertEquals(Course.Status.ARCHIVED, item.getStatus());
        verify(repository).save(item); verify(repository, never()).deleteById(anyLong());
    }
    @Test void preventsDuplicateVocabularyWithinLesson() {
        when(repository.existsByLessonIdAndWordIgnoreCase(12L, "日本語")).thenReturn(true);
        var request = new VocabularyRequest("日本語", "にほんご", "Tiếng Nhật", "", "", "", "https://example.com/audio.mp3", "", 1, Course.Status.DRAFT);
        assertThrows(IllegalStateException.class, () -> controller.create(12L, request, null));
        verify(repository, never()).save(any());
    }
    @Test void invalidInputIsRejectedBeforeSaving() throws Exception {
        var mvc = MockMvcBuilders.standaloneSetup(controller).setControllerAdvice(new GlobalExceptionHandler()).build();
        mvc.perform(post("/lessons/12/vocabularies").contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"word":" ","reading":"にほんご","meaningVi":"Tiếng Nhật","displayOrder":-1,"status":"DRAFT"}
                    """))
                .andExpect(status().isBadRequest());
        verify(repository, never()).save(any());
    }
    @Test void missingItemReturnsNotFoundInsteadOfInternalServerError() throws Exception {
        var realService = new VocabularyService(mock(com.jtech.repository.LessonRepository.class));
        when(repository.findById(404L)).thenReturn(Optional.empty());
        var mvc = MockMvcBuilders.standaloneSetup(new VocabularyController(repository, realService))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
        mvc.perform(delete("/vocabularies/404")).andExpect(status().isNotFound());
    }
}
