package com.jtech.repository;

import com.jtech.entity.Question;
import org.springframework.data.jpa.repository.JpaRepository;

/** UC-39 Manage Question Bank: thêm / sửa / xóa câu hỏi qua entity Question có sẵn. */
public interface QuestionBankRepository extends JpaRepository<Question, Long> {
}
