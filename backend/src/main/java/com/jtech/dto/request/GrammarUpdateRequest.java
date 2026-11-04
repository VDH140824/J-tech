package com.jtech.dto.request;

import com.jtech.entity.Grammar;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record GrammarUpdateRequest(
        @NotBlank(message = "Cấu trúc ngữ pháp không được để trống") @Size(max = 100, message = "Cấu trúc ngữ pháp không được vượt quá 100 ký tự") String structureName,
        @NotBlank(message = "Ý nghĩa tiếng Việt không được để trống") @Size(max = 100, message = "Ý nghĩa tiếng Việt không được vượt quá 100 ký tự") String meaningVi,
        @NotBlank(message = "Giải thích cách dùng không được để trống") @Size(max = 100, message = "Giải thích cách dùng không được vượt quá 100 ký tự") String usageExplanation,
        @NotBlank(message = "Ví dụ tiếng Nhật không được để trống") @Size(max = 100, message = "Ví dụ tiếng Nhật không được vượt quá 100 ký tự") String exampleJp,
        @NotBlank(message = "Dịch ví dụ không được để trống") @Size(max = 100, message = "Dịch ví dụ không được vượt quá 100 ký tự") String exampleVi,
        @Size(max = 500) String videoUrl,
        @Size(max = 255) String videoPublicId,
        @Min(0) Integer videoDurationSec,
        @NotNull @Min(value = 1, message = "Thứ tự hiển thị phải từ 1 trở lên") Integer displayOrder,
        @NotNull Grammar.Status status
) {
    public GrammarUpdateRequest {
        structureName = structureName == null ? null : structureName.trim();
        meaningVi = meaningVi == null ? null : meaningVi.trim();
        usageExplanation = usageExplanation == null ? null : usageExplanation.trim();
        exampleJp = exampleJp == null ? null : exampleJp.trim();
        exampleVi = exampleVi == null ? null : exampleVi.trim();
    }
}
