package com.jtech.dto.request;
 
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;
 

public record TestManagementRequest(
        @NotNull(message = "Vui lòng chọn loại bài kiểm tra.")
        TestType testType,
 
        String skill,
 
        Long lessonId,
 
        Long chapterId,
 
        @NotBlank(message = "Vui lòng nhập tên bài kiểm tra.")
        @Size(max = 200, message = "Tên bài kiểm tra tối đa 200 ký tự.")
        String title,
 
        @Size(max = 1000, message = "Mô tả tối đa 1000 ký tự.")
        String description,
 
        @NotNull(message = "Vui lòng nhập thời gian làm bài.")
        @Min(value = 5, message = "Thời gian làm bài tối thiểu 5 phút.")
        @Max(value = 30, message = "Thời gian làm bài tối đa 30 phút.")
        Integer durationMinutes,
 
        @NotNull(message = "Vui lòng nhập điểm đạt.")
        @DecimalMin(value = "0", message = "Điểm đạt từ 0 đến 100.")
        @DecimalMax(value = "100", message = "Điểm đạt từ 0 đến 100.")
        BigDecimal passingScore,
 
        List<Long> questionIds) {
 
    public enum TestType {
        MINI_TEST,
        CHAPTER_TEST
    }
}
 