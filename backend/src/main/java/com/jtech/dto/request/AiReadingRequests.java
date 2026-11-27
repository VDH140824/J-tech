package com.jtech.dto.request;

import java.util.Map;

/** Yêu cầu của trang "Đọc hiểu AI". */
public final class AiReadingRequests {
    private AiReadingRequests() {}

    /** Ưu tiên lessonId (bài READING), sau đó chapterId, cuối cùng courseId. */
    public record Create(Long lessonId, Long courseId, Long chapterId) {}

    /** answers: chỉ số câu ("0", "1", ...) → chữ cái A–D. */
    public record Submit(Map<String, String> answers) {}
}
