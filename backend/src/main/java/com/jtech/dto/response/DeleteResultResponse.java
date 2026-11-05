package com.jtech.dto.response;

/**
 * Kết quả của sd Delete / Archive Conjugation Form.
 *
 * @param archived true: thể chia đã có dữ liệu học tập nên chỉ chuyển sang ARCHIVED (BR-88);
 *                 false: đã xóa hẳn khỏi database
 */
public record DeleteResultResponse(Long id, boolean archived) {}
