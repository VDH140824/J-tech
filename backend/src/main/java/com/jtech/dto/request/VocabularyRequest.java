package com.jtech.dto.request;
import com.jtech.entity.Course;
import jakarta.validation.constraints.*;
import java.net.URI;
public record VocabularyRequest(
    @NotBlank(message = "Vui lòng nhập đầy đủ thông tin bắt buộc") @Size(max = 100) String word,
    @NotBlank(message = "Vui lòng nhập đầy đủ thông tin bắt buộc") @Size(max = 100) String reading,
    @NotBlank(message = "Vui lòng nhập đầy đủ thông tin bắt buộc") @Size(max = 255) String meaningVi,
    @Size(max = 50) String wordType,
    @Size(max = 500) String exampleJp,
    @Size(max = 500) String exampleVi,
    @NotBlank(message = "Vui lòng nhập đường dẫn audio phát âm") @Size(max = 500) String audioUrl,
    @Size(max = 255) String audioPublicId,
    @NotNull @Min(0) Integer displayOrder,
    @NotNull Course.Status status
) {
    @AssertTrue(message = "Đường dẫn audio phải là URL HTTP hoặc HTTPS hợp lệ.")
    public boolean isAudioUrlValid() {
        // Request validation runs before the controller, as part of @Valid.
        if (audioUrl == null || audioUrl.isBlank()) return true;
        try {
            URI uri = URI.create(audioUrl.trim());
            return ("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme()))
                    && uri.getHost() != null;
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }
}
