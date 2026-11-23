package com.jtech.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jtech.dto.response.KanjiExerciseResponse;
import com.jtech.entity.Question;
import jakarta.validation.Validation;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.security.Principal;
import java.util.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.*;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.data.domain.*;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;

class KanjiExerciseExcelServiceTest {
    private final KanjiChapterService chapters = mock(KanjiChapterService.class);
    private final Principal principal = () -> "moderator@example.com";
    private KanjiExerciseExcelService service;
    private jakarta.validation.ValidatorFactory factory;

    @BeforeEach void setup() {
        factory = Validation.buildDefaultValidatorFactory();
        var validator = new KanjiExerciseService(null, null, null, new ObjectMapper(), factory.getValidator());
        service = new KanjiExerciseExcelService(chapters, validator, new ObjectMapper());
    }
    @AfterEach void close() { factory.close(); }

    private KanjiExerciseResponse question(Question.QuestionType type, int order) {
        return new KanjiExerciseResponse((long) order + 1, 7L, type, "日 là gì?", "Giải thích", Question.Difficulty.EASY,
            order, Question.QuestionStatus.ACTIVE, type == Question.QuestionType.MCQ ? List.of("nhật", "nguyệt", "hỏa", "thủy", "mộc", "kim") : List.of(),
            type == Question.QuestionType.MCQ ? "kim" : type == Question.QuestionType.FILL_IN ? "nhật" : "",
            type == Question.QuestionType.MATCHING ? Map.of("日", "nhật", "月", "nguyệt") : Map.of());
    }
    private MockMultipartFile file(byte[] bytes) { return new MockMultipartFile("file", "kanji.xlsx", "application/octet-stream", bytes); }

    @Test void exportedWorkbookCanBeImportedForAllTypesAndSixOptions() {
        var rows = List.of(question(Question.QuestionType.MCQ, 1), question(Question.QuestionType.FILL_IN, 2), question(Question.QuestionType.MATCHING, 3));
        var parsed = service.parse(file(service.workbook(rows)));
        assertEquals(3, parsed.size());
        assertEquals("kim", parsed.get(0).correctAnswer());
        assertEquals(6, parsed.get(0).options().size());
        assertEquals("nhật", parsed.get(1).correctAnswer());
        assertEquals(rows.get(2).matches(), parsed.get(2).matches());
        assertEquals(3, parsed.get(2).displayOrder());
    }

    @Test void invalidRowPreventsAnySaveAndReportsExcelRow() throws Exception {
        byte[] bytes = service.workbook(List.of(question(Question.QuestionType.MCQ, 1), question(Question.QuestionType.FILL_IN, 2)));
        try (var book = new XSSFWorkbook(new ByteArrayInputStream(bytes)); var out = new ByteArrayOutputStream()) {
            book.getSheetAt(0).getRow(3).getCell(1).setBlank();
            book.write(out);
            var error = assertThrows(KanjiExerciseExcelService.InvalidExcel.class,
                () -> service.importFile(principal, 1L, 7L, file(out.toByteArray())));
            assertEquals(4, error.errors.get(0).row());
            verify(chapters, never()).saveExercise(any(), anyLong(), any(), any(), any());
        }
    }

    @Test void formulaIsRejectedAndNeverEvaluated() throws Exception {
        try (var book = new XSSFWorkbook(new ByteArrayInputStream(service.workbook(List.of(question(Question.QuestionType.MCQ, 1)))));
             var out = new ByteArrayOutputStream()) {
            book.getSheetAt(0).getRow(2).getCell(1).setCellFormula("1+1"); book.write(out);
            var error = assertThrows(KanjiExerciseExcelService.InvalidExcel.class, () -> service.parse(file(out.toByteArray())));
            assertTrue(error.errors.stream().anyMatch(e -> e.row() == 3 && e.message().contains("công thức")));
        }
    }

    @Test void rejectsEmptyTemplateAndMoreThan500Questions() {
        assertThrows(KanjiExerciseExcelService.InvalidExcel.class, () -> service.parse(file(service.workbook(List.of()))));
        assertThrows(KanjiExerciseExcelService.InvalidExcel.class, () -> service.parse(file(service.workbook(Collections.nCopies(501, question(Question.QuestionType.MCQ, 1))))));
    }

    @Test void exportFetchesEveryPageWithDocumentAndStatusFilter() throws Exception {
        var q = question(Question.QuestionType.MCQ, 1);
        when(chapters.exercises(principal, 1L, Question.QuestionStatus.ACTIVE, 0, 100, 7L, false))
            .thenReturn(new PageImpl<>(Collections.nCopies(100, q), PageRequest.of(0, 100), 101));
        when(chapters.exercises(principal, 1L, Question.QuestionStatus.ACTIVE, 1, 100, 7L, false))
            .thenReturn(new PageImpl<>(List.of(q), PageRequest.of(1, 100), 101));
        try (var book = new XSSFWorkbook(new ByteArrayInputStream(service.exportFile(principal, 1L, 7L, Question.QuestionStatus.ACTIVE)))) {
            assertEquals(102, book.getSheetAt(0).getLastRowNum());
        }
    }

    @Test void successfulImportSavesOnlyToSelectedDocument() {
        var result = service.importFile(principal, 1L, 7L, file(service.workbook(List.of(question(Question.QuestionType.FILL_IN, 1)))));
        assertEquals(1, result.importedCount());
        verify(chapters).saveExercise(eq(principal), eq(1L), isNull(), any(), eq(7L));
    }

    @Test void failureDuringPersistenceRollsBackOuterImportTransaction() {
        var manager = new AbstractPlatformTransactionManager() {
            @Override protected Object doGetTransaction() { return new Object(); }
            @Override protected void doBegin(Object transaction, TransactionDefinition definition) {}
            @Override protected void doCommit(DefaultTransactionStatus status) { fail("Must roll back"); }
            @Override protected void doRollback(DefaultTransactionStatus status) { rolledBack = true; }
        };
        var proxy = new ProxyFactory(service);
        proxy.addAdvice(new TransactionInterceptor(manager, new AnnotationTransactionAttributeSource()));
        var transactional = (KanjiExerciseExcelService) proxy.getProxy();
        when(chapters.saveExercise(eq(principal), eq(1L), isNull(), any(), eq(7L)))
            .thenReturn(null).thenThrow(new IllegalStateException("Database failure"));
        var bytes = service.workbook(List.of(question(Question.QuestionType.FILL_IN, 1), question(Question.QuestionType.FILL_IN, 2)));
        assertThrows(IllegalStateException.class, () -> transactional.importFile(principal, 1L, 7L, file(bytes)));
        assertTrue(rolledBack);
    }
    private boolean rolledBack;
}
