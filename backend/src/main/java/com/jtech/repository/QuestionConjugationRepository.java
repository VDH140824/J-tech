package com.jtech.repository;

import com.jtech.entity.Question;
import jakarta.persistence.QueryHint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.repository.query.Param;

/** Các truy vấn trên bảng question phục vụ chức năng quản lý thể chia (conjugation form). */
public interface QuestionConjugationRepository extends JpaRepository<Question, Long> {

    /**
     * Số câu hỏi ACTIVE đã gắn với thể chia (BR-111).
     * sd View Conjugation Forms: message 1.1.1.2. sd Update Conjugation Form: message 3.3.1.5.
     *
     * Flush mode COMMIT: trong luồng Update, form đã được gán dữ liệu mới (3.3.1.4) trước câu COUNT này.
     * Với flush mode mặc định (AUTO), Hibernate có thể chạy lệnh UPDATE conjugation_form ngay trước câu COUNT,
     * tức là trước khi BR-111 được kiểm tra (3.3.1.6). COMMIT để việc ghi chỉ diễn ra khi transaction commit.
     */
    @QueryHints(@QueryHint(name = "org.hibernate.flushMode", value = "COMMIT"))
    long countByConjugationFormIdAndStatus(Long conjugationFormId, Question.QuestionStatus status);

    /**
     * sd Delete / Archive Conjugation Form, message 3.1.1.6.1:
     * DELETE FROM question WHERE conjugation_form_id = ?
     * Chỉ gọi khi thể chia chưa có dữ liệu học tập (nhánh [else] của BR-88).
     */
    @Modifying
    @Query("DELETE FROM Question q WHERE q.conjugationFormId = :conjugationFormId")
    void deleteByConjugationFormId(@Param("conjugationFormId") Long conjugationFormId);
}
