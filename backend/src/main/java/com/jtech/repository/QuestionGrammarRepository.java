package com.jtech.repository;

import com.jtech.entity.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface QuestionGrammarRepository extends JpaRepository<Question, Long> {
    @Query("SELECT COALESCE(MAX(q.displayOrder), 0) FROM Question q WHERE q.grammarId = :grammarId AND q.skill = :skill")
    int findMaxDisplayOrderByGrammarId(@Param("grammarId") Long grammarId, @Param("skill") Question.Skill skill);

    List<Question> findByGrammarIdAndSkillAndStatusOrderByDisplayOrderAscIdAsc(
            Long grammarId, Question.Skill skill, Question.QuestionStatus status);
}
