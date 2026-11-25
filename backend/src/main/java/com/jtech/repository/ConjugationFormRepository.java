package com.jtech.repository;

import com.jtech.entity.ConjugationForm;
import com.jtech.entity.Course;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ConjugationFormRepository extends JpaRepository<ConjugationForm, Long> {

    
    @Query("SELECT f FROM ConjugationForm f WHERE " +
           "(:keyword IS NULL OR LOWER(f.nameVi) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(f.nameJp) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(f.code) LIKE LOWER(CONCAT('%', :keyword, '%'))) AND " +
           "(:status IS NULL OR f.status = :status)")
    Page<ConjugationForm> search(@Param("keyword") String keyword,
                                 @Param("status") Course.Status status,
                                 Pageable pageable);

    boolean existsByCode(String code);

    boolean existsByCodeAndIdNot(String code, Long id);

    boolean existsByNameViIgnoreCase(String nameVi);

    boolean existsByNameViIgnoreCaseAndIdNot(String nameVi, Long id);

    
    @Query(value = "SELECT COUNT(*) FROM practice_attempt WHERE conjugation_form_id = :conjugationFormId",
           nativeQuery = true)
    long countPracticeAttempts(@Param("conjugationFormId") Long conjugationFormId);

    java.util.List<ConjugationForm> findByStatusOrderByDisplayOrderAscIdAsc(Course.Status status);
}
