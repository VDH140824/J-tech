package com.jtech.repository;

import com.jtech.entity.Question;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface QuestionGrammarRepository extends JpaRepository<Question, Long> {
    List<Question> findBySkillAndStatusOrderByDisplayOrderAscIdAsc(
            Question.Skill skill, Question.QuestionStatus status);
}
