package com.jtech.controller;

import com.jtech.dto.request.*;
import com.jtech.dto.response.*;
import com.jtech.entity.Kanji;
import com.jtech.entity.Question;
import com.jtech.service.KanjiChapterService;
import com.jtech.service.KanjiExerciseExcelService;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequiredArgsConstructor
@RequestMapping("/moderator/kanji/chapters/{chapterId}/content")
@PreAuthorize("hasAnyAuthority('ROLE_MODERATOR','MODERATOR')")
public class KanjiChapterController {
    private final KanjiChapterService service;
    private final KanjiExerciseExcelService excel;

    @GetMapping("/exercises/template")
    public ResponseEntity<byte[]> exerciseTemplate(Principal p, @PathVariable long chapterId) {
        return excelDownload(excel.template(p, chapterId), "Kanji_template.xlsx");
    }

    @GetMapping("/exercises/export")
    public ResponseEntity<byte[]> exportExercises(Principal p, @PathVariable long chapterId,
        @RequestParam long documentLessonId, @RequestParam(required = false) Question.QuestionStatus status) {
        return excelDownload(excel.exportFile(p, chapterId, documentLessonId, status), "Kanji_exercises.xlsx");
    }

    @PostMapping(value = "/exercises/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public KanjiExerciseExcelService.ImportResult importExercises(Principal p, @PathVariable long chapterId,
        @RequestParam long documentLessonId, @RequestParam("file") MultipartFile file) {
        return excel.importFile(p, chapterId, documentLessonId, file);
    }

    private ResponseEntity<byte[]> excelDownload(byte[] body, String filename) {
        return ResponseEntity.ok().contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"").body(body);
    }

    @ExceptionHandler(KanjiExerciseExcelService.InvalidExcel.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, Object> invalidExcel(KanjiExerciseExcelService.InvalidExcel error) {
        return Map.of("message", error.getMessage(), "errors", error.errors);
    }

    @GetMapping
    public KanjiChapterService.Content content(Principal p, @PathVariable long chapterId) {
        return service.content(p, chapterId);
    }

    @PostMapping(value = "/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public KanjiChapterService.Content upload(Principal p, @PathVariable long chapterId, @RequestPart("file") MultipartFile file,
        @RequestPart(value = "name", required = false) String name) {
        return service.upload(p, chapterId, file, name);
    }

    public record RenameDocumentRequest(
        @jakarta.validation.constraints.NotNull @jakarta.validation.constraints.Positive Long lessonId,
        @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max = 4000) String url,
        @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max = 200) String name
    ) {}

    @PatchMapping("/documents/name")
    public KanjiChapterService.Content renameDocument(Principal p, @PathVariable long chapterId,
        @Valid @RequestBody RenameDocumentRequest request) {
        return service.renameDocument(p, chapterId, request.lessonId(), request.url(), request.name());
    }

    public record DeleteDocumentRequest(
        @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max = 4000) String url,
        Long lessonId, boolean archiveExercises
    ) {}

    @DeleteMapping("/documents")
    public KanjiChapterService.DocumentDeletion deleteDocument(Principal p, @PathVariable long chapterId,
        @Valid @RequestBody DeleteDocumentRequest request) {
        return service.deleteDocument(p, chapterId, request.lessonId(), request.url(), request.archiveExercises());
    }

    public record PrepareDocumentRequest(
        @jakarta.validation.constraints.NotNull @jakarta.validation.constraints.Positive Long lessonId,
        @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max = 4000) String url
    ) {}

    @PostMapping("/documents/prepare")
    public KanjiChapterService.PreparedDocument prepareDocument(Principal p, @PathVariable long chapterId,
        @Valid @RequestBody PrepareDocumentRequest request) {
        return service.prepareDocument(p, chapterId, request.lessonId(), request.url());
    }

    public record AssignExerciseRequest(@jakarta.validation.constraints.NotNull @jakarta.validation.constraints.Positive Long lessonId) {}

    @PostMapping("/exercises/{id}/assign")
    public KanjiExerciseResponse assignExercise(Principal p, @PathVariable long chapterId, @PathVariable long id,
        @Valid @RequestBody AssignExerciseRequest request) {
        return service.assignExercise(p, chapterId, id, request.lessonId());
    }

    @GetMapping("/cards")
    public Page<KanjiDetailResponse> cards(Principal p, @PathVariable long chapterId, @RequestParam(required = false) String search,
        @RequestParam(required = false) Kanji.Status status, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size) {
        return service.cards(p, chapterId, search, status, page, size);
    }

    @GetMapping("/cards/{id}")
    public KanjiDetailResponse card(Principal p, @PathVariable long chapterId, @PathVariable long id) {
        return service.card(p, chapterId, id);
    }

    @PostMapping(value = "/cards", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public KanjiDetailResponse createCard(Principal p, @PathVariable long chapterId, @Valid @RequestPart("request") KanjiCreateRequest request,
        @RequestPart(value = "image", required = false) MultipartFile image) {
        return service.createCard(p, chapterId, request, image);
    }

    @PutMapping(value = "/cards/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public KanjiDetailResponse updateCard(Principal p, @PathVariable long chapterId, @PathVariable long id,
        @Valid @RequestPart("request") KanjiUpdateRequest request, @RequestPart(value = "image", required = false) MultipartFile image) {
        return service.updateCard(p, chapterId, id, request, image);
    }

    @DeleteMapping("/cards/{id}")
    public ResponseEntity<Map<String, String>> deleteCard(Principal p, @PathVariable long chapterId, @PathVariable long id) {
        return service.deleteCard(p, chapterId, id) ? ResponseEntity.noContent().build() : ResponseEntity.ok(Map.of("result", "ARCHIVED"));
    }

    @GetMapping("/exercises")
    public Page<KanjiExerciseResponse> exercises(Principal p, @PathVariable long chapterId, @RequestParam(required = false) Question.QuestionStatus status,
        @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size,
        @RequestParam(required = false) Long documentLessonId, @RequestParam(defaultValue = "false") boolean unassigned) {
        return service.exercises(p, chapterId, status, page, size, documentLessonId, unassigned);
    }

    @GetMapping("/exercises/{id}")
    public KanjiExerciseResponse exercise(Principal p, @PathVariable long chapterId, @PathVariable long id,
        @RequestParam(required = false) Long documentLessonId) {
        return service.exercise(p, chapterId, id, documentLessonId);
    }

    @PostMapping("/exercises")
    @ResponseStatus(HttpStatus.CREATED)
    public KanjiExerciseResponse createExercise(Principal p, @PathVariable long chapterId, @Valid @RequestBody KanjiExerciseRequest request,
        @RequestParam(required = false) Long documentLessonId) {
        return service.saveExercise(p, chapterId, null, request, documentLessonId);
    }

    @PutMapping("/exercises/{id}")
    public KanjiExerciseResponse updateExercise(Principal p, @PathVariable long chapterId, @PathVariable long id, @Valid @RequestBody KanjiExerciseRequest request,
        @RequestParam(required = false) Long documentLessonId) {
        return service.saveExercise(p, chapterId, id, request, documentLessonId);
    }

    @DeleteMapping("/exercises/{id}")
    public Map<String, String> deleteExercise(Principal p, @PathVariable long chapterId, @PathVariable long id,
        @RequestParam(required = false) Long documentLessonId) {
        return Map.of("result", service.deleteExercise(p, chapterId, id, documentLessonId));
    }

    @ExceptionHandler({
        org.springframework.validation.BindException.class,
        org.springframework.web.multipart.support.MissingServletRequestPartException.class,
        org.springframework.http.converter.HttpMessageNotReadableException.class,
        org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class
    })
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, String> invalidRequest(Exception error) {
        return Map.of("message", "Dữ liệu hoặc tham số không hợp lệ. Vui lòng kiểm tra lại.");
    }

    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public Map<String, String> conflictingData(Exception error) {
        return Map.of("message", "Dữ liệu đã thay đổi hoặc đang được sử dụng. Vui lòng tải lại.");
    }
}
