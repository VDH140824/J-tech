package com.jtech.dto.response;

import java.util.List;

public record GrammarQuestionImportResponse(Long grammarId, int importedCount, String message) {
    public record RowError(int row, String column, String message) {}

    public record Failure(String message, List<RowError> errors) {
        public Failure {
            errors = List.copyOf(errors);
        }
    }
}
