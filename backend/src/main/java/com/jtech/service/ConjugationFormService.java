package com.jtech.service;

import com.jtech.dto.request.ConjugationFormRequest;
import com.jtech.dto.response.ConjugationFormResponse;
import com.jtech.dto.response.DeleteResultResponse;
import com.jtech.entity.Course;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ConjugationFormService {

    /**
     * Danh sách thể chia cho Moderator, thấy mọi trạng thái (sd View Conjugation Forms).
     *
     * @param keyword tìm theo mã / tên tiếng Việt / tên tiếng Nhật; null hoặc rỗng thì không lọc
     * @param status  null thì không lọc theo trạng thái
     */
    Page<ConjugationFormResponse> getAll(String keyword, Course.Status status, Pageable pageable);

    /**
     * Tạo thể chia mới ở trạng thái DRAFT (UC-47, luồng 3.1).
     *
     * @param moderatorEmail email người đang đăng nhập; JwtAuthenticationFilter đặt email làm username
     */
    ConjugationFormResponse create(ConjugationFormRequest request, String moderatorEmail);

    /**
     * Sửa thể chia (sd Update Conjugation Form).
     *
     * @throws org.springframework.web.server.ResponseStatusException 404 khi không tìm thấy id; 409 (MSG30) khi mã trùng với bản ghi khác
     * @throws IllegalArgumentException vi phạm BR-111 khi trạng thái sau khi sửa là PUBLISHED -> 400 (MSG32)
     */
    ConjugationFormResponse update(Long id, ConjugationFormRequest request, String moderatorEmail);

    /**
     * Xóa hoặc lưu trữ thể chia (sd Delete / Archive Conjugation Form, SD-29.4).
     * Đã có dữ liệu học tập (practice_attempt) thì chuyển sang ARCHIVED (BR-88), chưa có thì xóa hẳn
     * cùng các câu hỏi đã gắn.
     *
     * @throws org.springframework.web.server.ResponseStatusException 404 khi không tìm thấy id
     */
    DeleteResultResponse delete(Long id, String moderatorEmail);
}
