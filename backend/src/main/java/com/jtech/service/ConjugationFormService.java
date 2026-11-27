package com.jtech.service;

import com.jtech.dto.request.ConjugationFormRequest;
import com.jtech.dto.request.ConjugationQuestionRequest;
import com.jtech.dto.response.ConjugationFormResponse;
import com.jtech.dto.response.DeleteResultResponse;
import com.jtech.dto.response.PracticeQuestionResponse;
import com.jtech.entity.Question;
import com.jtech.entity.Course;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface ConjugationFormService {

    
    Page<ConjugationFormResponse> getAll(String keyword, Course.Status status, Pageable pageable);

    
    ConjugationFormResponse create(ConjugationFormRequest request, String moderatorEmail);

   
    ConjugationFormResponse update(Long id, ConjugationFormRequest request, String moderatorEmail);

    
    DeleteResultResponse delete(Long id, String moderatorEmail);

    List<PracticeQuestionResponse> getPracticeQuestions(Long id, Question.Difficulty difficulty, Integer verbGroup);

    ConjugationFormResponse updatePracticeQuestions(Long id, List<Long> questionIds, String moderatorEmail);
    void deleteQuestion(Long id, Long questionId, String moderatorEmail);

    PracticeQuestionResponse createQuestion(Long id, ConjugationQuestionRequest request, String moderatorEmail);

    PracticeQuestionResponse updateQuestion(Long id, Long questionId, ConjugationQuestionRequest request, String moderatorEmail);

}
