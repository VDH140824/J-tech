package com.jtech.service.impl;

import com.jtech.dto.request.ConjugationFormRequest;
import com.jtech.dto.response.ConjugationFormResponse;
import com.jtech.dto.response.DeleteResultResponse;
import com.jtech.entity.ConjugationForm;
import com.jtech.entity.Course;
import com.jtech.entity.Question;
import com.jtech.entity.User;
import com.jtech.repository.ConjugationFormRepository;
import com.jtech.repository.QuestionConjugationRepository;
import com.jtech.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ConjugationFormServiceImplTest {

    private static final String EMAIL = "mod@fpt.edu.vn";
    private static final String MSG32 = "Không thể xuất bản: số câu hỏi mỗi lượt phải từ 5 trở lên và không vượt quá số câu hỏi đã soạn.";

    @Mock
    private ConjugationFormRepository conjugationFormRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private QuestionConjugationRepository questionRepository;

    @InjectMocks
    private ConjugationFormServiceImpl service;

    private final ConjugationFormRequest request = new ConjugationFormRequest(
            "  TE_FORM  ",
            " Thể te ",
            "て形",
            "   ",
            "【Nhóm I】\n書く → 書いて\n\n【Nhóm II】\n食べる → 食べて\n\n【Nhóm III】\nする → して",
            10,
            null,
            null
    );

    private static ConjugationFormRequest updateRequest(int questionsPerPractice, Course.Status status) {
        return new ConjugationFormRequest(
                " TE_FORM ", "Thể te (sửa)", "て形", "Mô tả mới",
                "【Nhóm I】\n書く → 書いて", questionsPerPractice, 3, status);
    }

    private ConjugationForm existingForm() {
        return ConjugationForm.builder().id(1L).code("TE_OLD").nameVi("Thể te").nameJp("て形")
                .materialContent("cũ").questionsPerPractice(10).displayOrder(0).status(Course.Status.DRAFT).build();
    }

    @Test
    void update_validRequest_assignsFieldsAndSaves() {
        ConjugationForm form = existingForm();
        User moderator = User.builder().userId(7L).email(EMAIL).build();
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(form));
        when(conjugationFormRepository.existsByCodeAndIdNot("TE_FORM", 1L)).thenReturn(false);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(moderator));
        when(questionRepository.countByConjugationFormIdAndStatus(1L, Question.QuestionStatus.ACTIVE)).thenReturn(12L);
        when(conjugationFormRepository.save(form)).thenReturn(form);

        ConjugationFormResponse response = service.update(1L, updateRequest(8, Course.Status.PUBLISHED), EMAIL);

        assertEquals("TE_FORM", form.getCode());
        assertEquals("Thể te (sửa)", form.getNameVi());
        assertEquals(3, form.getDisplayOrder());
        assertEquals(Course.Status.PUBLISHED, form.getStatus());
        assertSame(moderator, form.getUpdatedBy());
        assertEquals(12L, response.linkedQuestionCount());
    }

    @Test
    void update_nullStatus_keepsCurrentStatus() {
        ConjugationForm form = existingForm();
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(form));
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(User.builder().email(EMAIL).build()));
        when(conjugationFormRepository.save(form)).thenReturn(form);

        service.update(1L, updateRequest(2, null), EMAIL);

        assertEquals(Course.Status.DRAFT, form.getStatus());
    }

    @Test
    void update_notFound_throws404() {
        when(conjugationFormRepository.findById(99L)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.update(99L, updateRequest(10, null), EMAIL));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());

        verify(conjugationFormRepository, never()).save(any());
    }

    @Test
    void update_duplicateCode_throwsAndDoesNotSave() {
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(existingForm()));
        when(conjugationFormRepository.existsByCodeAndIdNot("TE_FORM", 1L)).thenReturn(true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.update(1L, updateRequest(10, null), EMAIL));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());

        verify(userRepository, never()).findByEmail(anyString());
        verify(conjugationFormRepository, never()).save(any());
    }

    @Test
    void update_publishWithFewerThanFiveQuestionsPerPractice_throwsMsg32() {
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(existingForm()));
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(User.builder().email(EMAIL).build()));
        when(questionRepository.countByConjugationFormIdAndStatus(1L, Question.QuestionStatus.ACTIVE)).thenReturn(20L);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.update(1L, updateRequest(4, Course.Status.PUBLISHED), EMAIL));

        assertEquals(MSG32, ex.getMessage());
        verify(conjugationFormRepository, never()).save(any());
    }

    @Test
    void update_publishWithMoreQuestionsThanLinked_throwsMsg32AndDoesNotSave() {
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(existingForm()));
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(User.builder().email(EMAIL).build()));
        when(questionRepository.countByConjugationFormIdAndStatus(1L, Question.QuestionStatus.ACTIVE)).thenReturn(6L);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.update(1L, updateRequest(10, Course.Status.PUBLISHED), EMAIL));

        // Thứ tự theo SD-29.3: findByEmail (3.3.1.3) -> gán (3.3.1.4) -> count (3.3.1.5) -> BR-111 (3.3.1.6).
        // Không gọi save; transaction rollback nên dữ liệu đã gán không xuống DB.
        assertEquals(MSG32, ex.getMessage());
        verify(conjugationFormRepository, never()).save(any());
    }

    @Test
    void update_draftWithZeroQuestions_skipsPublishCheckAndSaves() {
        ConjugationForm form = existingForm();
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(form));
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(User.builder().email(EMAIL).build()));
        when(questionRepository.countByConjugationFormIdAndStatus(1L, Question.QuestionStatus.ACTIVE)).thenReturn(0L);
        when(conjugationFormRepository.save(form)).thenReturn(form);

        ConjugationFormResponse response = service.update(1L, updateRequest(7, Course.Status.DRAFT), EMAIL);

        assertEquals(Course.Status.DRAFT, form.getStatus());
        assertEquals(7, form.getQuestionsPerPractice());
        assertEquals(0L, response.linkedQuestionCount());
    }

    @Test
    void create_validRequest_savesDraftWithCreatedBy() {
        User moderator = User.builder().userId(7L).email(EMAIL).build();
        when(conjugationFormRepository.existsByCode("TE_FORM")).thenReturn(false);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(moderator));
        when(conjugationFormRepository.save(any(ConjugationForm.class))).thenAnswer(invocation -> {
            ConjugationForm form = invocation.getArgument(0);
            form.setId(1L);
            return form;
        });

        ConjugationFormResponse response = service.create(request, EMAIL);

        ArgumentCaptor<ConjugationForm> captor = ArgumentCaptor.forClass(ConjugationForm.class);
        verify(conjugationFormRepository).save(captor.capture());
        ConjugationForm saved = captor.getValue();

        assertEquals("TE_FORM", saved.getCode());
        assertEquals("Thể te", saved.getNameVi());
        assertNull(saved.getDescription());
        assertEquals(0, saved.getDisplayOrder());
        assertEquals(Course.Status.DRAFT, saved.getStatus());
        assertSame(moderator, saved.getCreatedBy());

        assertEquals(1L, response.id());
        assertEquals(Course.Status.DRAFT, response.status());
        assertEquals(0L, response.linkedQuestionCount());
    }

    @Test
    void create_duplicateCode_throwsAndDoesNotSave() {
        when(conjugationFormRepository.existsByCode("TE_FORM")).thenReturn(true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.create(request, EMAIL));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());

        verify(userRepository, never()).findByEmail(anyString());
        verify(conjugationFormRepository, never()).save(any());
    }

    @Test
    void create_userNotFound_throwsAndDoesNotSave() {
        when(conjugationFormRepository.existsByCode("TE_FORM")).thenReturn(false);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.empty());

        assertThrows(AuthenticationCredentialsNotFoundException.class, () -> service.create(request, EMAIL));

        verify(conjugationFormRepository, never()).save(any());
    }

    @Test
    void getAll_mapsEachFormWithActiveQuestionCount() {
        Pageable pageable = PageRequest.of(0, 10);
        ConjugationForm te = ConjugationForm.builder().id(1L).code("TE_FORM").status(Course.Status.PUBLISHED).build();
        ConjugationForm nai = ConjugationForm.builder().id(2L).code("NAI_FORM").status(Course.Status.DRAFT).build();
        when(conjugationFormRepository.search("te", Course.Status.PUBLISHED, pageable))
                .thenReturn(new PageImpl<>(List.of(te, nai), pageable, 2));
        when(questionRepository.countByConjugationFormIdAndStatus(1L, Question.QuestionStatus.ACTIVE)).thenReturn(12L);
        when(questionRepository.countByConjugationFormIdAndStatus(2L, Question.QuestionStatus.ACTIVE)).thenReturn(0L);

        Page<ConjugationFormResponse> result = service.getAll("  te ", Course.Status.PUBLISHED, pageable);

        assertEquals(2, result.getTotalElements());
        assertEquals(12L, result.getContent().get(0).linkedQuestionCount());
        assertEquals("NAI_FORM", result.getContent().get(1).code());
        assertEquals(0L, result.getContent().get(1).linkedQuestionCount());
    }

    @Test
    void getAll_blankKeyword_searchesWithoutKeywordFilter() {
        Pageable pageable = PageRequest.of(0, 10);
        when(conjugationFormRepository.search(null, null, pageable)).thenReturn(Page.empty(pageable));

        Page<ConjugationFormResponse> result = service.getAll("   ", null, pageable);

        assertEquals(0, result.getTotalElements());
        verifyNoInteractions(questionRepository);
    }

    @Test
    void getAll_databaseError_propagatesDataAccessException() {
        Pageable pageable = PageRequest.of(0, 10);
        when(conjugationFormRepository.search(null, null, pageable))
                .thenThrow(new DataAccessResourceFailureException("connection lost"));

        assertThrows(DataAccessResourceFailureException.class, () -> service.getAll(null, null, pageable));
    }

    @Test
    void delete_withLearningData_archivesInsteadOfDeleting() {
        ConjugationForm form = existingForm();
        User moderator = User.builder().userId(7L).email(EMAIL).build();
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(form));
        when(conjugationFormRepository.countPracticeAttempts(1L)).thenReturn(3L);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(moderator));

        DeleteResultResponse result = service.delete(1L, EMAIL);

        assertTrue(result.archived());
        assertEquals(Course.Status.ARCHIVED, form.getStatus());
        assertSame(moderator, form.getUpdatedBy());
        verify(conjugationFormRepository).save(form);
        verify(conjugationFormRepository, never()).delete(any());
        verify(questionRepository, never()).deleteByConjugationFormId(any());
    }

    @Test
    void delete_withoutLearningData_deletesQuestionsThenForm() {
        ConjugationForm form = existingForm();
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(form));
        when(conjugationFormRepository.countPracticeAttempts(1L)).thenReturn(0L);

        DeleteResultResponse result = service.delete(1L, EMAIL);

        assertFalse(result.archived());
        var inOrder = inOrder(questionRepository, conjugationFormRepository);
        inOrder.verify(questionRepository).deleteByConjugationFormId(1L);
        inOrder.verify(conjugationFormRepository).delete(form);
        verify(userRepository, never()).findByEmail(anyString());
    }

    @Test
    void delete_notFound_throws404() {
        when(conjugationFormRepository.findById(99L)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.delete(99L, EMAIL));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        verifyNoInteractions(questionRepository);
    }
}
