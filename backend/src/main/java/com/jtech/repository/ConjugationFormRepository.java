package com.jtech.repository;

import com.jtech.entity.ConjugationForm;
import com.jtech.entity.Course;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ConjugationFormRepository extends JpaRepository<ConjugationForm, Long> {

    /**
     * Message 1.1.1.1 trong sd View Conjugation Forms. keyword / status null thì bỏ qua điều kiện đó.
     * Thứ tự sắp xếp lấy từ Pageable (display_order); Spring Data tự sinh câu COUNT với cùng điều kiện lọc.
     */
    @Query("SELECT f FROM ConjugationForm f WHERE " +
           "(:keyword IS NULL OR LOWER(f.nameVi) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(f.nameJp) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(f.code) LIKE LOWER(CONCAT('%', :keyword, '%'))) AND " +
           "(:status IS NULL OR f.status = :status)")
    Page<ConjugationForm> search(@Param("keyword") String keyword,
                                 @Param("status") Course.Status status,
                                 Pageable pageable);

    /** Message 3.3.1.1.1 trong sequence diagram: kiểm tra mã đã tồn tại khi tạo mới. */
    boolean existsByCode(String code);

    /** Dùng cho luồng Update: bỏ qua chính bản ghi đang sửa. */
    boolean existsByCodeAndIdNot(String code, Long id);

    /**
     * sd Delete / Archive Conjugation Form, message 3.1.1.2.1:
     * SELECT COUNT(*) FROM practice_attempt WHERE conjugation_form_id = ?
     * Lớn hơn 0 = thể chia đã phát sinh dữ liệu học tập, không được xóa cứng (BR-88).
     * Dùng native query vì dự án đang truy cập practice_attempt bằng SQL (LearningProgressRepository),
     * chưa có entity cho bảng này.
     */
    @Query(value = "SELECT COUNT(*) FROM practice_attempt WHERE conjugation_form_id = :conjugationFormId",
           nativeQuery = true)
    long countPracticeAttempts(@Param("conjugationFormId") Long conjugationFormId);
}
