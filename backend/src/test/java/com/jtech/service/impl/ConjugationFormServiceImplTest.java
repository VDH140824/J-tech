package com.jtech.service.impl;

import com.jtech.dto.request.ConjugationFormRequest;
import com.jtech.dto.request.ConjugationQuestionRequest;
import com.jtech.dto.response.ConjugationFormResponse;
import com.jtech.dto.response.DeleteResultResponse;
import com.jtech.dto.response.PracticeQuestionResponse;
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
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit test UC-47 Quản lý thể chia (phía Moderator).
 * Tên test = mã sheet trong Report5_Unit_Test_Linh.xlsx + UTCID (CF-01 … CF-09).
 * CF-01 UTCID08–09 và CF-07 UTCID09 (ràng buộc request) nằm ở ConjugationFormRequestValidationTest.
 */
@ExtendWith(MockitoExtension.class)
class ConjugationFormServiceImplTest {

    private static final String EMAIL = "mod@fpt.edu.vn";
    private static final String FULL_THEORY = "【Nhóm I】\n書く → 書いて\n\n【Nhóm II】\n食べる → 食べて\n\n【Nhóm III】\nする → して";
    private static final String ONLY_GROUP_1 = "【Nhóm I】\n書く → 書いて";
    private static final String CONTENT_KAKU = "Chia động từ 書く (かく) sang thể te.";

    @Mock private ConjugationFormRepository conjugationFormRepository;
    @Mock private UserRepository userRepository;
    @Mock private QuestionConjugationRepository questionRepository;

    @InjectMocks private ConjugationFormServiceImpl service;

    // ===================== helpers =====================

    private static User moderator() {
        return User.builder().userId(7L).email(EMAIL).build();
    }

    private void givenModerator() {
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(moderator()));
    }

    private static ConjugationForm form() {
        return ConjugationForm.builder().id(1L).code("TE_OLD").nameVi("Thể te").nameJp("て形")
                .materialContent("cũ").questionsPerPractice(10).displayOrder(0).status(Course.Status.DRAFT).build();
    }

    private static ConjugationForm publishedForm(int questionsPerPractice) {
        ConjugationForm f = form();
        f.setStatus(Course.Status.PUBLISHED);
        f.setQuestionsPerPractice(questionsPerPractice);
        return f;
    }

    private static ConjugationFormRequest createRequest(String code, String nameVi, String description,
                                                        Integer displayOrder, Course.Status status) {
        return new ConjugationFormRequest(code, nameVi, "て形", description, FULL_THEORY, 10, displayOrder, status);
    }

    private static ConjugationFormRequest updateRequest(String material, int questionsPerPractice, Course.Status status) {
        return new ConjugationFormRequest(" TE_FORM ", "Thể te (sửa)", "て形", "Mô tả mới", material,
                questionsPerPractice, 3, status);
    }

    private static Question question(long id) {
        Question q = new Question();
        q.setId(id);
        return q;
    }

    private static Question conjugationQuestion(long id, long formId, int verbGroup, boolean selected) {
        Question q = question(id);
        q.setConjugationFormId(formId);
        q.setStatus(Question.QuestionStatus.ACTIVE);
        q.setDifficulty(Question.Difficulty.EASY);
        q.setIsExerciseQuestion(selected);
        q.setContent(CONTENT_KAKU);
        q.setAnswerData("{\"verb\":\"書く\",\"reading\":\"かく\",\"verbGroup\":" + verbGroup + ",\"correctAnswer\":\"書いて\"}");
        return q;
    }

    private static List<Question> pool(long... ids) {
        List<Question> list = new ArrayList<>();
        for (long id : ids) list.add(question(id));
        return list;
    }

    private static ConjugationQuestionRequest questionRequest(String verb, String reading, String answer,
                                                              List<String> accepted, List<String> options, Boolean exercise) {
        return new ConjugationQuestionRequest(verb, reading, "viết", 1, Question.Difficulty.EASY,
                answer, accepted, options, "Nhóm I: く → いて", exercise);
    }

    private static ConjugationQuestionRequest kaku(List<String> accepted, List<String> options, Boolean exercise) {
        return questionRequest(" 書く ", "かく", " 書いて ", accepted, options, exercise);
    }

    private void stubSaveFormReturnsArgument() {
        when(conjugationFormRepository.save(any(ConjugationForm.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private void stubSaveQuestionReturnsArgument() {
        when(questionRepository.save(any(Question.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    // ===================== CF-01 create =====================

    @Test
    void CF01_UTCID01_validRequest_savesDraftWithModerator() {
        givenModerator();
        stubSaveFormReturnsArgument();

        ConjugationFormResponse response = service.create(createRequest("TE_FORM", "Thể te", "Mô tả", 1, null), EMAIL);

        ArgumentCaptor<ConjugationForm> captor = ArgumentCaptor.forClass(ConjugationForm.class);
        verify(conjugationFormRepository).save(captor.capture());
        assertEquals(Course.Status.DRAFT, response.status());
        assertEquals(7L, captor.getValue().getCreatedBy().getUserId());
        assertEquals(0L, response.linkedQuestionCount());
        assertEquals(0L, response.practiceQuestionCount());
    }

    @Test
    void CF01_UTCID02_publishedStatusInRequest_stillSavesDraft() {
        givenModerator();
        stubSaveFormReturnsArgument();

        ConjugationFormResponse response = service.create(
                createRequest("TE_FORM", "Thể te", "Mô tả", 1, Course.Status.PUBLISHED), EMAIL);

        assertEquals(Course.Status.DRAFT, response.status());
    }

    @Test
    void CF01_UTCID03_trimsFieldsAndBlankDescriptionBecomesNull() {
        givenModerator();
        stubSaveFormReturnsArgument();

        ConjugationFormResponse response = service.create(createRequest("  TE_FORM  ", " Thể te ", "   ", null, null), EMAIL);

        assertEquals("TE_FORM", response.code());
        assertEquals("Thể te", response.nameVi());
        assertNull(response.description());
    }

    @Test
    void CF01_UTCID04_nullDisplayOrder_defaultsToZero() {
        givenModerator();
        stubSaveFormReturnsArgument();

        ConjugationFormResponse response = service.create(createRequest("TE_FORM", "Thể te", "Mô tả", null, null), EMAIL);

        assertEquals(0, response.displayOrder());
    }

    @Test
    void CF01_UTCID05_duplicateCode_throws409() {
        when(conjugationFormRepository.existsByCode("TE_FORM")).thenReturn(true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.create(createRequest("TE_FORM", "Thể te", "Mô tả", 1, null), EMAIL));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertEquals("Thể chia này đã tồn tại trong hệ thống. Vui lòng kiểm tra lại!", ex.getReason());
        verify(conjugationFormRepository, never()).save(any());
    }

    @Test
    void CF01_UTCID06_duplicateNameIgnoreCase_throws409() {
        when(conjugationFormRepository.existsByNameViIgnoreCase("Thể te")).thenReturn(true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.create(createRequest("TE_FORM", "Thể te", "Mô tả", 1, null), EMAIL));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        verify(conjugationFormRepository, never()).save(any());
    }

    @Test
    void CF01_UTCID07_moderatorNotFound_throwsAndDoesNotSave() {
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.empty());

        assertThrows(AuthenticationCredentialsNotFoundException.class,
                () -> service.create(createRequest("TE_FORM", "Thể te", "Mô tả", 1, null), EMAIL));

        verify(conjugationFormRepository, never()).save(any());
    }

    // ===================== CF-02 getAll =====================

    @Test
    void CF02_UTCID01_countsQuestionsPerForm() {
        Pageable pageable = PageRequest.of(0, 10);
        ConjugationForm te = ConjugationForm.builder().id(1L).code("TE_FORM").materialContent(FULL_THEORY)
                .status(Course.Status.PUBLISHED).build();
        ConjugationForm nai = ConjugationForm.builder().id(2L).code("NAI_FORM").materialContent(FULL_THEORY)
                .status(Course.Status.PUBLISHED).build();
        when(conjugationFormRepository.search("te", Course.Status.PUBLISHED, pageable))
                .thenReturn(new PageImpl<>(List.of(te, nai), pageable, 2));
        when(questionRepository.countByConjugationFormIdAndStatus(1L, Question.QuestionStatus.ACTIVE)).thenReturn(12L);
        when(questionRepository.countPracticeQuestions(1L, Question.QuestionStatus.ACTIVE)).thenReturn(8L);

        Page<ConjugationFormResponse> result = service.getAll("  te ", Course.Status.PUBLISHED, pageable);

        assertEquals(2, result.getTotalElements());
        assertEquals(12L, result.getContent().get(0).linkedQuestionCount());
        assertEquals(8L, result.getContent().get(0).practiceQuestionCount());
        assertEquals(0L, result.getContent().get(1).linkedQuestionCount());
    }

    @Test
    void CF02_UTCID02_blankKeyword_searchesWithNull() {
        Pageable pageable = PageRequest.of(0, 10);
        when(conjugationFormRepository.search(null, null, pageable)).thenReturn(Page.empty(pageable));

        Page<ConjugationFormResponse> result = service.getAll("   ", null, pageable);

        assertTrue(result.getContent().isEmpty());
        verifyNoInteractions(questionRepository);
    }

    @Test
    void CF02_UTCID03_reportsMissingTheoryGroups() {
        Pageable pageable = PageRequest.of(0, 10);
        ConjugationForm full = ConjugationForm.builder().id(1L).code("TE_FORM").materialContent(FULL_THEORY)
                .status(Course.Status.PUBLISHED).build();
        ConjugationForm partial = ConjugationForm.builder().id(2L).code("NAI_FORM")
                .materialContent("【Nhóm I】\n書く → 書かない\n\n【Nhóm II】\n食べる → 食べない").status(Course.Status.DRAFT).build();
        when(conjugationFormRepository.search(null, null, pageable))
                .thenReturn(new PageImpl<>(List.of(full, partial), pageable, 2));

        Page<ConjugationFormResponse> result = service.getAll(null, null, pageable);

        assertTrue(result.getContent().get(0).missingTheoryGroups().isEmpty());
        assertEquals(List.of("Nhóm III"), result.getContent().get(1).missingTheoryGroups());
    }

    @Test
    void CF02_UTCID04_statusFilter_passedToSearch() {
        Pageable pageable = PageRequest.of(0, 10);
        when(conjugationFormRepository.search(null, Course.Status.HIDDEN, pageable)).thenReturn(Page.empty(pageable));

        service.getAll(null, Course.Status.HIDDEN, pageable);

        verify(conjugationFormRepository).search(null, Course.Status.HIDDEN, pageable);
    }

    @Test
    void CF02_UTCID05_pageBeyondLastPage_returnsEmptyContent() {
        Pageable pageable = PageRequest.of(5, 10);
        when(conjugationFormRepository.search("te", null, pageable)).thenReturn(Page.empty(pageable));

        Page<ConjugationFormResponse> result = service.getAll("te", null, pageable);

        assertTrue(result.getContent().isEmpty());
        verifyNoInteractions(questionRepository);
    }

    @Test
    void CF02_UTCID06_databaseError_propagates() {
        Pageable pageable = PageRequest.of(0, 10);
        when(conjugationFormRepository.search(null, null, pageable))
                .thenThrow(new DataAccessResourceFailureException("DB down"));

        assertThrows(DataAccessException.class, () -> service.getAll(null, null, pageable));
    }

    // ===================== CF-03 update =====================

    @Test
    void CF03_UTCID01_validPublish_assignsFieldsAndSaves() {
        ConjugationForm f = form();
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(f));
        givenModerator();
        when(questionRepository.countByConjugationFormIdAndStatus(1L, Question.QuestionStatus.ACTIVE)).thenReturn(12L);
        when(questionRepository.countPracticeQuestions(1L, Question.QuestionStatus.ACTIVE)).thenReturn(12L);
        when(conjugationFormRepository.save(f)).thenReturn(f);

        ConjugationFormResponse response = service.update(1L, updateRequest(FULL_THEORY, 8, Course.Status.PUBLISHED), EMAIL);

        assertEquals(Course.Status.PUBLISHED, response.status());
        assertEquals("TE_FORM", f.getCode());
        assertEquals("Thể te (sửa)", f.getNameVi());
        assertEquals(8, f.getQuestionsPerPractice());
        verify(conjugationFormRepository).save(f);
    }

    @Test
    void CF03_UTCID02_nullStatus_keepsCurrentStatus() {
        ConjugationForm f = form();
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(f));
        givenModerator();
        when(conjugationFormRepository.save(f)).thenReturn(f);

        ConjugationFormResponse response = service.update(1L, updateRequest(FULL_THEORY, 10, null), EMAIL);

        assertEquals(Course.Status.DRAFT, response.status());
    }

    @Test
    void CF03_UTCID03_draftWithZeroPracticeQuestions_savesWithoutActivationCheck() {
        ConjugationForm f = form();
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(f));
        givenModerator();
        when(conjugationFormRepository.save(f)).thenReturn(f);

        ConjugationFormResponse response = service.update(1L, updateRequest(FULL_THEORY, 10, Course.Status.DRAFT), EMAIL);

        assertEquals(Course.Status.DRAFT, response.status());
        assertEquals(0L, response.practiceQuestionCount());
    }

    @Test
    void CF03_UTCID04_formNotFound_throws404() {
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.update(1L, updateRequest(FULL_THEORY, 10, Course.Status.DRAFT), EMAIL));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        assertEquals("Không tìm thấy thể chia.", ex.getReason());
        verify(conjugationFormRepository, never()).save(any());
    }

    @Test
    void CF03_UTCID05_duplicateCodeOfAnotherForm_throws409() {
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(form()));
        when(conjugationFormRepository.existsByCodeAndIdNot("TE_FORM", 1L)).thenReturn(true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.update(1L, updateRequest(FULL_THEORY, 10, Course.Status.DRAFT), EMAIL));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        verify(conjugationFormRepository, never()).save(any());
    }

    @Test
    void CF03_UTCID06_duplicateNameOfAnotherForm_throws409() {
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(form()));
        when(conjugationFormRepository.existsByNameViIgnoreCaseAndIdNot("Thể te (sửa)", 1L)).thenReturn(true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.update(1L, updateRequest(FULL_THEORY, 10, Course.Status.DRAFT), EMAIL));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        verify(conjugationFormRepository, never()).save(any());
    }

    @Test
    void CF03_UTCID07_publishWithMissingTheory_throws() {
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(form()));
        givenModerator();
        when(questionRepository.countPracticeQuestions(1L, Question.QuestionStatus.ACTIVE)).thenReturn(20L);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.update(1L, updateRequest(ONLY_GROUP_1, 10, Course.Status.PUBLISHED), EMAIL));

        assertTrue(ex.getMessage().contains("Vui lòng hoàn thiện lý thuyết cho Nhóm II, Nhóm III."));
        verify(conjugationFormRepository, never()).save(any());
    }

    @Test
    void CF03_UTCID08_publishWithNotEnoughPracticeQuestions_throws() {
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(form()));
        givenModerator();
        when(questionRepository.countPracticeQuestions(1L, Question.QuestionStatus.ACTIVE)).thenReturn(6L);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.update(1L, updateRequest(FULL_THEORY, 10, Course.Status.PUBLISHED), EMAIL));

        assertTrue(ex.getMessage().contains("Cần ít nhất 10 câu hỏi luyện tập, hiện có 6 câu."));
        verify(conjugationFormRepository, never()).save(any());
    }

    @Test
    void CF03_UTCID09_publishMissingTheoryAndQuestions_reportsBothReasons() {
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(form()));
        givenModerator();
        when(questionRepository.countPracticeQuestions(1L, Question.QuestionStatus.ACTIVE)).thenReturn(3L);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.update(1L, updateRequest(ONLY_GROUP_1, 10, Course.Status.PUBLISHED), EMAIL));

        assertTrue(ex.getMessage().contains("Nhóm II, Nhóm III"));
        assertTrue(ex.getMessage().contains("hiện có 3 câu"));
        verify(conjugationFormRepository, never()).save(any());
    }

    @Test
    void CF03_UTCID10_practiceCountEqualsQuestionsPerPractice_publishes() {
        ConjugationForm f = form();
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(f));
        givenModerator();
        when(questionRepository.countPracticeQuestions(1L, Question.QuestionStatus.ACTIVE)).thenReturn(10L);
        when(conjugationFormRepository.save(f)).thenReturn(f);

        ConjugationFormResponse response = service.update(1L, updateRequest(FULL_THEORY, 10, Course.Status.PUBLISHED), EMAIL);

        assertEquals(Course.Status.PUBLISHED, response.status());
        assertEquals(10L, response.practiceQuestionCount());
    }

    @Test
    void CF03_UTCID11_practiceCountOneLessThanRequired_throws() {
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(form()));
        givenModerator();
        when(questionRepository.countPracticeQuestions(1L, Question.QuestionStatus.ACTIVE)).thenReturn(9L);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.update(1L, updateRequest(FULL_THEORY, 10, Course.Status.PUBLISHED), EMAIL));

        assertTrue(ex.getMessage().contains("hiện có 9 câu"));
        verify(conjugationFormRepository, never()).save(any());
    }

    // ===================== CF-04 delete =====================

    @Test
    void CF04_UTCID01_hasLearningData_archives() {
        ConjugationForm f = form();
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(f));
        when(conjugationFormRepository.countPracticeAttempts(1L)).thenReturn(3L);
        givenModerator();

        DeleteResultResponse result = service.delete(1L, EMAIL);

        assertTrue(result.archived());
        assertEquals(Course.Status.ARCHIVED, f.getStatus());
        assertEquals(7L, f.getUpdatedBy().getUserId());
        verify(conjugationFormRepository, never()).delete(any());
    }

    @Test
    void CF04_UTCID02_noLearningData_unlinksQuestionsThenDeletes() {
        ConjugationForm f = form();
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(f));
        when(conjugationFormRepository.countPracticeAttempts(1L)).thenReturn(0L);

        DeleteResultResponse result = service.delete(1L, EMAIL);

        assertFalse(result.archived());
        InOrder inOrder = inOrder(questionRepository, conjugationFormRepository);
        inOrder.verify(questionRepository).unlinkConjugationForm(1L);
        inOrder.verify(conjugationFormRepository).delete(f);
    }

    @Test
    void CF04_UTCID03_exactlyOneAttempt_archives() {
        ConjugationForm f = form();
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(f));
        when(conjugationFormRepository.countPracticeAttempts(1L)).thenReturn(1L);
        givenModerator();

        DeleteResultResponse result = service.delete(1L, EMAIL);

        assertTrue(result.archived());
        verify(conjugationFormRepository, never()).delete(any());
    }

    @Test
    void CF04_UTCID04_formNotFound_throws404() {
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.delete(1L, EMAIL));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
    }

    @Test
    void CF04_UTCID05_archiveBranchModeratorNotFound_throwsAndDoesNotSave() {
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(form()));
        when(conjugationFormRepository.countPracticeAttempts(1L)).thenReturn(2L);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.empty());

        assertThrows(AuthenticationCredentialsNotFoundException.class, () -> service.delete(1L, EMAIL));

        verify(conjugationFormRepository, never()).save(any());
        verify(conjugationFormRepository, never()).delete(any());
    }

    // ===================== CF-05 getPracticeQuestions =====================

    @Test
    void CF05_UTCID01_readsVerbDataFromAnswerData() {
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(form()));
        when(questionRepository.findForPractice(1L, null)).thenReturn(List.of(
                conjugationQuestion(5L, 1L, 1, true), conjugationQuestion(6L, 1L, 2, false)));

        List<PracticeQuestionResponse> result = service.getPracticeQuestions(1L, null, null);

        assertEquals(2, result.size());
        assertTrue(result.get(0).selected());
        assertFalse(result.get(1).selected());
        assertEquals("書く", result.get(0).verb());
        assertEquals(1, result.get(0).verbGroup());
        assertEquals("書いて", result.get(0).correctAnswer());
    }

    @Test
    void CF05_UTCID02_difficultyFilter_passedToRepository() {
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(form()));
        when(questionRepository.findForPractice(1L, Question.Difficulty.HARD)).thenReturn(List.of());

        service.getPracticeQuestions(1L, Question.Difficulty.HARD, null);

        verify(questionRepository).findForPractice(1L, Question.Difficulty.HARD);
    }

    @Test
    void CF05_UTCID03_verbGroupFilter_keepsOnlyThatGroup() {
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(form()));
        when(questionRepository.findForPractice(1L, null)).thenReturn(List.of(
                conjugationQuestion(5L, 1L, 1, true), conjugationQuestion(6L, 1L, 2, false)));

        List<PracticeQuestionResponse> result = service.getPracticeQuestions(1L, null, 2);

        assertEquals(1, result.size());
        assertEquals(6L, result.get(0).id());
    }

    @Test
    void CF05_UTCID04_emptyAnswerData_stillListedWithGroupZero() {
        Question old = question(8L);
        old.setContent("Câu cũ");
        old.setDifficulty(Question.Difficulty.EASY);
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(form()));
        when(questionRepository.findForPractice(1L, null)).thenReturn(List.of(old));

        List<PracticeQuestionResponse> result = service.getPracticeQuestions(1L, null, null);

        assertEquals(1, result.size());
        assertEquals(0, result.get(0).verbGroup());
    }

    @Test
    void CF05_UTCID05_noQuestions_returnsEmptyList() {
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(form()));
        when(questionRepository.findForPractice(1L, null)).thenReturn(List.of());

        assertTrue(service.getPracticeQuestions(1L, null, null).isEmpty());
    }

    @Test
    void CF05_UTCID06_formNotFound_throws404() {
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.getPracticeQuestions(1L, null, null));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        verifyNoInteractions(questionRepository);
    }

    // ===================== CF-06 updatePracticeQuestions =====================

    @Test
    void CF06_UTCID01_draftForm_clearsThenMarksSelected() {
        ConjugationForm f = form();
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(f));
        when(questionRepository.findForPractice(1L, null)).thenReturn(pool(1, 2, 3, 4, 5, 6, 7));
        givenModerator();
        when(conjugationFormRepository.save(f)).thenReturn(f);

        ConjugationFormResponse response = service.updatePracticeQuestions(1L, List.of(5L, 6L), EMAIL);

        InOrder inOrder = inOrder(questionRepository);
        inOrder.verify(questionRepository).clearExerciseFlags(1L);
        inOrder.verify(questionRepository).markExerciseQuestions(eq(1L), argThat(ids -> ids.size() == 2));
        assertEquals(2L, response.practiceQuestionCount());
    }

    @Test
    void CF06_UTCID02_duplicateIds_countedOnce() {
        ConjugationForm f = form();
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(f));
        when(questionRepository.findForPractice(1L, null)).thenReturn(pool(1, 2, 3, 4, 5, 6, 7));
        givenModerator();
        when(conjugationFormRepository.save(f)).thenReturn(f);

        ConjugationFormResponse response = service.updatePracticeQuestions(1L, List.of(5L, 5L), EMAIL);

        assertEquals(1L, response.practiceQuestionCount());
    }

    @Test
    void CF06_UTCID03_emptyList_onlyClears() {
        ConjugationForm f = form();
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(f));
        when(questionRepository.findForPractice(1L, null)).thenReturn(pool(1, 2, 3, 4, 5, 6, 7));
        givenModerator();
        when(conjugationFormRepository.save(f)).thenReturn(f);

        ConjugationFormResponse response = service.updatePracticeQuestions(1L, List.of(), EMAIL);

        verify(questionRepository).clearExerciseFlags(1L);
        verify(questionRepository, never()).markExerciseQuestions(anyLong(), any());
        assertEquals(0L, response.practiceQuestionCount());
    }

    @Test
    void CF06_UTCID04_publishedWithExactlyRequiredCount_saves() {
        ConjugationForm f = publishedForm(5);
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(f));
        when(questionRepository.findForPractice(1L, null)).thenReturn(pool(1, 2, 3, 4, 5, 6, 7));
        givenModerator();
        when(conjugationFormRepository.save(f)).thenReturn(f);

        ConjugationFormResponse response = service.updatePracticeQuestions(1L, List.of(1L, 2L, 3L, 4L, 5L), EMAIL);

        verify(questionRepository).markExerciseQuestions(eq(1L), any());
        assertEquals(5L, response.practiceQuestionCount());
    }

    @Test
    void CF06_UTCID05_questionNotInForm_throws400() {
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(form()));
        when(questionRepository.findForPractice(1L, null)).thenReturn(pool(1, 2, 3, 4, 5, 6, 7));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.updatePracticeQuestions(1L, List.of(5L, 99L), EMAIL));

        assertEquals("Có câu hỏi không thuộc thể chia này hoặc không còn hoạt động.", ex.getMessage());
        verify(questionRepository, never()).clearExerciseFlags(anyLong());
    }

    @Test
    void CF06_UTCID06_publishedWithTooFewQuestions_throws400() {
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(publishedForm(10)));
        when(questionRepository.findForPractice(1L, null)).thenReturn(pool(1, 2, 3, 4, 5, 6, 7));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.updatePracticeQuestions(1L, List.of(5L), EMAIL));

        assertEquals("Số câu hỏi luyện tập không đủ cho một lượt làm bài.", ex.getMessage());
        verify(questionRepository, never()).clearExerciseFlags(anyLong());
    }

    @Test
    void CF06_UTCID07_formNotFound_throws404() {
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.updatePracticeQuestions(1L, List.of(1L), EMAIL));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        verifyNoInteractions(questionRepository);
    }

    // ===================== CF-07 createQuestion =====================

    @Test
    void CF07_UTCID01_valid_savesGeneratedContentAndAnswerData() {
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(form()));
        givenModerator();
        when(questionRepository.findMaxDisplayOrder(1L)).thenReturn(4);
        stubSaveQuestionReturnsArgument();

        PracticeQuestionResponse response = service.createQuestion(1L,
                kaku(List.of("かいて"), List.of("書きて", "書って"), null), EMAIL);

        ArgumentCaptor<Question> captor = ArgumentCaptor.forClass(Question.class);
        verify(questionRepository).save(captor.capture());
        Question saved = captor.getValue();
        assertEquals(CONTENT_KAKU, saved.getContent());
        assertEquals(Question.Skill.CONJUGATION, saved.getSkill());
        assertEquals(5, saved.getDisplayOrder());
        assertEquals(7L, saved.getCreatedBy());
        assertTrue(saved.getIsExerciseQuestion());
        assertEquals(1, response.verbGroup());
        assertEquals(List.of("書きて", "書って"), response.options());
    }

    @Test
    void CF07_UTCID02_notForPractice_savedUnselected() {
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(form()));
        givenModerator();
        stubSaveQuestionReturnsArgument();

        PracticeQuestionResponse response = service.createQuestion(1L, kaku(List.of("かいて"), null, false), EMAIL);

        assertFalse(response.selected());
    }

    @Test
    void CF07_UTCID03_duplicateAcceptedAnswers_areRemoved() {
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(form()));
        givenModerator();
        stubSaveQuestionReturnsArgument();

        PracticeQuestionResponse response = service.createQuestion(1L,
                kaku(List.of("かいて", " かいて ", "書いて", ""), null, null), EMAIL);

        assertEquals(List.of("かいて"), response.acceptedAnswers());
    }

    @Test
    void CF07_UTCID04_noOptions_savesEmptyOptions() {
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(form()));
        givenModerator();
        stubSaveQuestionReturnsArgument();

        PracticeQuestionResponse response = service.createQuestion(1L, kaku(List.of("かいて"), null, null), EMAIL);

        assertTrue(response.options().isEmpty());
    }

    @Test
    void CF07_UTCID05_threeOptions_savesAll() {
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(form()));
        givenModerator();
        stubSaveQuestionReturnsArgument();

        PracticeQuestionResponse response = service.createQuestion(1L,
                kaku(List.of("かいて"), List.of("書きて", "書って", "書かて"), null), EMAIL);

        assertEquals(3, response.options().size());
    }

    @Test
    void CF07_UTCID06_duplicateVerb_throws409() {
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(form()));
        when(questionRepository.existsByConjugationFormIdAndContentAndStatus(
                1L, CONTENT_KAKU, Question.QuestionStatus.ACTIVE)).thenReturn(true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.createQuestion(1L, kaku(null, null, null), EMAIL));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertEquals("Động từ này đã có câu hỏi trong thể chia.", ex.getReason());
        verify(questionRepository, never()).save(any());
    }

    @Test
    void CF07_UTCID07_optionEqualsAcceptedAnswerAfterNormalize_throws400() {
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(form()));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.createQuestion(1L, kaku(List.of("かいて"), List.of("カイテ"), null), EMAIL));

        assertEquals("Phương án nhiễu \"カイテ\" trùng với đáp án đúng.", ex.getMessage());
        verify(questionRepository, never()).save(any());
    }

    @Test
    void CF07_UTCID08_formNotFound_throws404() {
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.createQuestion(1L, kaku(null, null, null), EMAIL));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        verify(questionRepository, never()).save(any());
    }

    // ===================== CF-08 updateQuestion =====================

    @Test
    void CF08_UTCID01_valid_updatesFieldsAndAudit() {
        Question q = conjugationQuestion(9L, 1L, 1, true);
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(form()));
        when(questionRepository.findById(9L)).thenReturn(Optional.of(q));
        givenModerator();
        stubSaveQuestionReturnsArgument();

        service.updateQuestion(1L, 9L, kaku(List.of("かいて"), null, true), EMAIL);

        assertEquals(7L, q.getUpdatedBy());
        assertNotNull(q.getUpdatedAt());
        assertEquals("Nhóm I: く → いて", q.getExplanation());
        verify(questionRepository).save(q);
    }

    @Test
    void CF08_UTCID02_verbChanged_regeneratesContent() {
        Question q = conjugationQuestion(9L, 1L, 1, true);
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(form()));
        when(questionRepository.findById(9L)).thenReturn(Optional.of(q));
        givenModerator();
        stubSaveQuestionReturnsArgument();

        PracticeQuestionResponse response = service.updateQuestion(1L, 9L,
                questionRequest("飲む", "のむ", "飲んで", null, null, true), EMAIL);

        assertEquals("Chia động từ 飲む (のむ) sang thể te.", response.content());
    }

    @Test
    void CF08_UTCID03_questionOfAnotherForm_throws404() {
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(form()));
        when(questionRepository.findById(9L)).thenReturn(Optional.of(conjugationQuestion(9L, 2L, 1, true)));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.updateQuestion(1L, 9L, kaku(null, null, true), EMAIL));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        assertEquals("Không tìm thấy câu hỏi.", ex.getReason());
        verify(questionRepository, never()).save(any());
    }

    @Test
    void CF08_UTCID04_archivedQuestion_throws404() {
        Question q = conjugationQuestion(9L, 1L, 1, false);
        q.setStatus(Question.QuestionStatus.ARCHIVED);
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(form()));
        when(questionRepository.findById(9L)).thenReturn(Optional.of(q));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.updateQuestion(1L, 9L, kaku(null, null, true), EMAIL));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        verify(questionRepository, never()).save(any());
    }

    @Test
    void CF08_UTCID05_duplicateVerbWithAnotherQuestion_throws409() {
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(form()));
        when(questionRepository.findById(9L)).thenReturn(Optional.of(conjugationQuestion(9L, 1L, 1, true)));
        when(questionRepository.existsByConjugationFormIdAndContentAndStatusAndIdNot(
                1L, CONTENT_KAKU, Question.QuestionStatus.ACTIVE, 9L)).thenReturn(true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.updateQuestion(1L, 9L, kaku(null, null, true), EMAIL));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        verify(questionRepository, never()).save(any());
    }

    @Test
    void CF08_UTCID06_removeFromPracticeWithoutEnoughQuestions_throws400() {
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(publishedForm(10)));
        when(questionRepository.findById(9L)).thenReturn(Optional.of(conjugationQuestion(9L, 1L, 1, true)));
        when(questionRepository.countPracticeQuestions(1L, Question.QuestionStatus.ACTIVE)).thenReturn(10L);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.updateQuestion(1L, 9L, kaku(null, null, false), EMAIL));

        assertEquals("Số câu hỏi luyện tập không đủ cho một lượt làm bài.", ex.getMessage());
        verify(questionRepository, never()).save(any());
    }

    @Test
    void CF08_UTCID07_removeFromPracticeRemainingEqualsRequired_saves() {
        Question q = conjugationQuestion(9L, 1L, 1, true);
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(publishedForm(10)));
        when(questionRepository.findById(9L)).thenReturn(Optional.of(q));
        when(questionRepository.countPracticeQuestions(1L, Question.QuestionStatus.ACTIVE)).thenReturn(11L);
        givenModerator();
        stubSaveQuestionReturnsArgument();

        PracticeQuestionResponse response = service.updateQuestion(1L, 9L, kaku(null, null, false), EMAIL);

        assertFalse(response.selected());
        verify(questionRepository).save(q);
    }

    // ===================== CF-09 deleteQuestion =====================

    @Test
    void CF09_UTCID01_softDeletes() {
        Question q = conjugationQuestion(9L, 1L, 1, true);
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(form()));
        when(questionRepository.findById(9L)).thenReturn(Optional.of(q));
        givenModerator();

        service.deleteQuestion(1L, 9L, EMAIL);

        assertEquals(Question.QuestionStatus.ARCHIVED, q.getStatus());
        assertFalse(q.getIsExerciseQuestion());
        verify(questionRepository).save(q);
        verify(questionRepository, never()).delete(any());
    }

    @Test
    void CF09_UTCID02_notPracticeQuestionOnPublishedForm_deletesWithoutCount() {
        Question q = conjugationQuestion(9L, 1L, 1, false);
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(publishedForm(10)));
        when(questionRepository.findById(9L)).thenReturn(Optional.of(q));
        givenModerator();

        service.deleteQuestion(1L, 9L, EMAIL);

        assertEquals(Question.QuestionStatus.ARCHIVED, q.getStatus());
        verify(questionRepository, never()).countPracticeQuestions(anyLong(), any());
        verify(questionRepository, never()).delete(any());
    }

    @Test
    void CF09_UTCID03_practiceQuestionOnPublishedFormWithoutEnough_throws400() {
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(publishedForm(10)));
        when(questionRepository.findById(9L)).thenReturn(Optional.of(conjugationQuestion(9L, 1L, 1, true)));
        when(questionRepository.countPracticeQuestions(1L, Question.QuestionStatus.ACTIVE)).thenReturn(10L);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.deleteQuestion(1L, 9L, EMAIL));

        assertEquals("Số câu hỏi luyện tập không đủ cho một lượt làm bài.", ex.getMessage());
        verify(questionRepository, never()).save(any());
    }

    @Test
    void CF09_UTCID04_questionNotFound_throws404() {
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(form()));
        when(questionRepository.findById(9L)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.deleteQuestion(1L, 9L, EMAIL));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        verify(questionRepository, never()).save(any());
    }

    @Test
    void CF09_UTCID05_moderatorNotFound_throwsAndDoesNotSave() {
        when(conjugationFormRepository.findById(1L)).thenReturn(Optional.of(form()));
        when(questionRepository.findById(9L)).thenReturn(Optional.of(conjugationQuestion(9L, 1L, 1, true)));
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.empty());

        assertThrows(AuthenticationCredentialsNotFoundException.class, () -> service.deleteQuestion(1L, 9L, EMAIL));

        verify(questionRepository, never()).save(any());
    }
}
