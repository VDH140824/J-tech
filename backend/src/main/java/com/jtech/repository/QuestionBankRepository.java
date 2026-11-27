package com.jtech.repository;

import com.jtech.entity.Question;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuestionBankRepository extends JpaRepository<Question, Long> {
}
