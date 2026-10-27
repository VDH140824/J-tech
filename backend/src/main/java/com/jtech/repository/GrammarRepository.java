package com.jtech.repository;

import com.jtech.entity.Grammar;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface GrammarRepository extends JpaRepository<Grammar, Long> {
    List<Grammar> findByLessonIdOrderByDisplayOrderAscIdAsc(Long lessonId);
    List<Grammar> findByLessonIdAndStatusOrderByDisplayOrderAscIdAsc(Long lessonId, Grammar.Status status);

    @Modifying
    @Query(value = "DELETE FROM learning_item_progress WHERE grammar_id = :grammarId", nativeQuery = true)
    int deleteLearningProgressByGrammarId(@Param("grammarId") Long grammarId);

    @Modifying
    @Query(value = "UPDATE study_session SET grammar_id = NULL WHERE grammar_id = :grammarId", nativeQuery = true)
    int detachStudySessionsByGrammarId(@Param("grammarId") Long grammarId);
}
