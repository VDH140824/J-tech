package com.jtech.repository;

import com.jtech.entity.Grammar;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface GrammarRepository extends JpaRepository<Grammar, Long> {
    List<Grammar> findByLessonIdOrderByDisplayOrderAscIdAsc(Long lessonId);
    List<Grammar> findByLessonIdAndStatusOrderByDisplayOrderAscIdAsc(Long lessonId, Grammar.Status status);
}
