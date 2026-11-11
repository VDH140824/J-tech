package com.jtech.dto.request;

import java.time.LocalDateTime;

public record PostRequest(String postType, String title, String content, LocalDateTime dueAt) {}
