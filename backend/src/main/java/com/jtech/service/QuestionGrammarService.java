package com.jtech.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jtech.dto.request.QuestionGrammarCreateRequest;
import com.jtech.dto.request.QuestionGrammarUpdateRequest;
import com.jtech.dto.response.QuestionGrammarResponse;
import com.jtech.entity.Lesson;
import com.jtech.entity.Question;
import com.jtech.repository.LessonRepository;
import com.jtech.repository.QuestionGrammarRepository;
import com.jtech.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;

@Service
public class QuestionGrammarService {
    private final QuestionGrammarRepository questionRepository;
    private final UserRepository userRepository;
    private final LessonRepository lessonRepository;
    private final ObjectMapper objectMapper;

    public QuestionGrammarService(QuestionGrammarRepository questionRepository,
                                  UserRepository userRepository,
                                  LessonRepository lessonRepository,
                                  ObjectMapper objectMapper) {
        this.questionRepository = questionRepository;
        this.userRepository = userRepository;
        this.lessonRepository = lessonRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<QuestionGrammarResponse> getAllGrammarQuestions() {
        return questionRepository.findBySkillAndStatusOrderByDisplayOrderAscIdAsc(
                Question.Skill.GRAMMAR, Question.QuestionStatus.ACTIVE)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public QuestionGrammarResponse createQuestionGrammar(QuestionGrammarCreateRequest request, String userEmail) {
        Lesson lesson = lessonRepository.findById(request.lessonId())
                .orElseThrow(() -> new IllegalArgumentException("Lesson not found"));
        if (lesson.getSkillType() != Lesson.SkillType.GRAMMAR) {
            throw new IllegalArgumentException("Lesson is not a grammar lesson");
        }

        validateAnswerData(request.answerData());
        Long userId = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AccessDeniedException("User not found"))
                .getUserId();

        Question question = new Question();
        question.setSkill(Question.Skill.GRAMMAR);
        question.setQuestionType(request.questionType());
        question.setLessonId(lesson.getId());
        question.setContent(request.content().trim());
        question.setExplanation(request.explanation() == null ? null : request.explanation().trim());
        question.setAnswerData(request.answerData().trim());
        question.setDifficulty(request.difficulty());
        question.setIsExerciseQuestion(request.isExerciseQuestion());
        question.setDisplayOrder(request.displayOrder());
        question.setStatus(Question.QuestionStatus.ACTIVE);
        question.setCreatedBy(userId);
        question.setCreatedAt(LocalDateTime.now());

        return toResponse(questionRepository.save(question));
    }

    @Transactional
    public QuestionGrammarResponse updateQuestionGrammar(Long id, QuestionGrammarUpdateRequest request, String userEmail) {
        Question question = questionRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Question not found"));
        if (question.getSkill() != Question.Skill.GRAMMAR) {
            throw new IllegalArgumentException("Question is not a grammar question");
        }

        validateAnswerData(request.answerData());
        Long userId = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AccessDeniedException("User not found"))
                .getUserId();

        question.setQuestionType(request.questionType());
        question.setContent(request.content().trim());
        question.setExplanation(request.explanation() == null ? null : request.explanation().trim());
        question.setAnswerData(request.answerData().trim());
        question.setDifficulty(request.difficulty());
        question.setDisplayOrder(request.displayOrder());
        question.setUpdatedBy(userId);
        question.setUpdatedAt(LocalDateTime.now());

        return toResponse(questionRepository.save(question));
    }

    private void validateAnswerData(String answerData) {
        try {
            objectMapper.readTree(answerData);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Answer data must be valid JSON", exception);
        }
    }

    private QuestionGrammarResponse toResponse(Question question) {
        return new QuestionGrammarResponse(
                question.getId(), question.getSkill(), question.getQuestionType(),
                question.getLessonId(), question.getContent(), question.getMediaUrl(),
                question.getExplanation(), question.getAnswerData(), question.getDifficulty(),
                question.getIsExerciseQuestion(), question.getDisplayOrder(), question.getStatus(),
                question.getCreatedBy(), question.getUpdatedBy(), question.getCreatedAt(),
                question.getUpdatedAt());
    }
}
