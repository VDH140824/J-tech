package com.jtech.exception;

import com.jtech.dto.response.GrammarQuestionImportResponse.RowError;
import java.util.List;

public class GrammarQuestionImportException extends RuntimeException {
    private final List<RowError> errors;

    public GrammarQuestionImportException(List<RowError> errors) {
        super("Dữ liệu Excel không hợp lệ. Chưa lưu câu hỏi nào.");
        this.errors = List.copyOf(errors);
    }

    public List<RowError> getErrors() {
        return errors;
    }
}
