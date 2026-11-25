package com.jtech.controller;

import com.jtech.dto.response.VocabularyTestResponse;
import com.jtech.repository.LessonSectionProgressRepository;
import com.jtech.service.StudentKanjiExerciseService;
import java.security.Principal;
import java.util.List;
import java.util.Map;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.HandlerMapping;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

/**
 * Tiến độ học Từ vựng / Kanji mà KHÔNG sửa code của các phần đó: sau khi API nộp bài tập của nhóm
 * trả kết quả thành công, ghi phần học của bài vào lesson_section_progress.
 * Giống Ngữ pháp: nộp bài tập là bài được tính hoàn thành (không xét điểm); điểm cao nhất chỉ để lưu lại.
 * <ul>
 *   <li>Từ vựng: POST /vocabulary-exercises/{id}/submit</li>
 *   <li>Kanji: POST /student/lessons/{lessonId}/kanji-exercises/submit</li>
 * </ul>
 * Chỉ áp dụng cho hai controller này; nội dung phản hồi giữ nguyên. Lỗi khi ghi tiến độ không làm hỏng
 * kết quả bài tập trả về cho người học.
 */
@RestControllerAdvice(assignableTypes = {StudentVocabularyExerciseController.class, StudentKanjiExerciseController.class})
public class ExerciseProgressAdvice implements ResponseBodyAdvice<Object> {

    private final LessonSectionProgressRepository progress;
    private final JdbcTemplate jdbc;

    public ExerciseProgressAdvice(LessonSectionProgressRepository progress, JdbcTemplate jdbc) {
        this.progress = progress;
        this.jdbc = jdbc;
    }

    @Override
    public boolean supports(MethodParameter returnType, Class<? extends HttpMessageConverter<?>> converterType) {
        return returnType.getMethod() != null && "submit".equals(returnType.getMethod().getName());
    }

    @Override
    public Object beforeBodyWrite(Object body, MethodParameter returnType, MediaType contentType,
                                  Class<? extends HttpMessageConverter<?>> converterType,
                                  ServerHttpRequest request, ServerHttpResponse response) {
        try {
            Principal principal = request.getPrincipal();
            Map<String, String> path = pathVariables(request);
            if (principal == null || path == null) return body;

            if (body instanceof VocabularyTestResponse.Result result && path.containsKey("id")) {
                List<Long> lessons = jdbc.queryForList(
                        "SELECT lesson_id FROM test WHERE id = ? AND lesson_id IS NOT NULL", Long.class,
                        Long.parseLong(path.get("id")));
                if (!lessons.isEmpty())
                    progress.markExerciseCompleted(principal.getName(), lessons.get(0), "VOCABULARY", result.score());
            } else if (body instanceof StudentKanjiExerciseService.Result result && path.containsKey("lessonId")) {
                progress.markExerciseCompleted(principal.getName(), Long.parseLong(path.get("lessonId")), "KANJI",
                        LessonSectionProgressRepository.score(result.correctCount(), result.total()));
            }
        } catch (RuntimeException ignored) {
            // Không chặn kết quả bài tập nếu ghi tiến độ lỗi.
        }
        return body;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, String> pathVariables(ServerHttpRequest request) {
        if (!(request instanceof ServletServerHttpRequest servlet)) return null;
        Object vars = servlet.getServletRequest().getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE);
        return vars instanceof Map<?, ?> map ? (Map<String, String>) map : null;
    }
}
