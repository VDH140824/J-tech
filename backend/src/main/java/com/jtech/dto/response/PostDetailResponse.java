package com.jtech.dto.response;

import java.util.List;

public record PostDetailResponse(PostResponse post, List<CommentResponse> comments, boolean readOnly) {}
