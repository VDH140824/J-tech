package com.jtech.dto.request;

import java.util.Map;

/** answers: questionId → lựa chọn A/B/C/D. */
public record ListeningSubmitRequest(Map<String, String> answers) {}
