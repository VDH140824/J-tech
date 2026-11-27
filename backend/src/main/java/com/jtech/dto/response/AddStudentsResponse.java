package com.jtech.dto.response;

import java.util.List;

public record AddStudentsResponse(int addedCount, int skippedCount, List<SkippedEmail> skippedEmails) {
}
