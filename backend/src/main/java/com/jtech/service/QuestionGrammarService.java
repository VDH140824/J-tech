package com.jtech.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.jtech.dto.request.QuestionGrammarCreateRequest;
import com.jtech.dto.request.QuestionGrammarUpdateRequest;
import com.jtech.dto.response.QuestionGrammarResponse;
import com.jtech.entity.Lesson;
import com.jtech.entity.Question;
import com.jtech.repository.LessonRepository;
import com.jtech.repository.GrammarRepository;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
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
    private final GrammarRepository grammarRepository;
    private final ObjectMapper objectMapper;

    public QuestionGrammarService(QuestionGrammarRepository questionRepository,
                                  UserRepository userRepository,
                                  LessonRepository lessonRepository,
                                  GrammarRepository grammarRepository,
                                  ObjectMapper objectMapper) {
        this.questionRepository = questionRepository;
        this.userRepository = userRepository;
        this.lessonRepository = lessonRepository;
        this.grammarRepository = grammarRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<QuestionGrammarResponse> getAllGrammarQuestions(Long grammarId) {
        if (!grammarRepository.existsById(grammarId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Grammar not found");
        }
        return questionRepository.findByGrammarIdAndSkillAndStatusOrderByDisplayOrderAscIdAsc(
                grammarId, Question.Skill.GRAMMAR, Question.QuestionStatus.ACTIVE)
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

        var grammar = grammarRepository.findById(request.grammarId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Grammar not found"));
        if (!grammar.getLesson().getId().equals(lesson.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Grammar does not belong to this lesson");
        }

        validateFields(request.content(), request.explanation(), request.displayOrder());
        String answerData = validateAnswerData(request.answerData(), request.questionType());
        Long userId = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AccessDeniedException("User not found"))
                .getUserId();

        Question question = new Question();
        question.setSkill(Question.Skill.GRAMMAR);
        question.setQuestionType(request.questionType());
        question.setLessonId(lesson.getId());
        question.setGrammarId(grammar.getId());
        question.setContent(request.content().trim());
        question.setExplanation(request.explanation().trim());
        question.setAnswerData(answerData);
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

        validateFields(request.content(), request.explanation(), request.displayOrder());
        String answerData = validateAnswerData(request.answerData(), request.questionType());
        Long userId = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AccessDeniedException("User not found"))
                .getUserId();

        question.setQuestionType(request.questionType());
        question.setContent(request.content().trim());
        question.setExplanation(request.explanation().trim());
        question.setAnswerData(answerData);
        question.setDifficulty(request.difficulty());
        question.setDisplayOrder(request.displayOrder());
        question.setUpdatedBy(userId);
        question.setUpdatedAt(LocalDateTime.now());

        return toResponse(questionRepository.save(question));
    }

    @Transactional
    public void deleteQuestionGrammar(Long id) {
        Question question = questionRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Question not found"));
        if (question.getSkill() != Question.Skill.GRAMMAR) {
            throw new NoSuchElementException("Grammar question not found");
        }

        questionRepository.delete(question);
        questionRepository.flush();
    }

    private void validateFields(String content, String explanation, Integer displayOrder) {
        validateText(content, "Nội dung câu hỏi");
        validateText(explanation, "Giải thích");
        if (displayOrder == null || displayOrder < 1 || displayOrder > 65535) {
            throw new IllegalArgumentException("Thứ tự hiển thị phải là số nguyên từ 1 đến 65535");
        }
    }

    private void validateText(String value, String label) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(label + " không được để trống");
        }
        if (value.trim().length() > 100) {
            throw new IllegalArgumentException(label + " không được vượt quá 100 ký tự");
        }
    }

    private String validateAnswerData(String answerData, Question.QuestionType questionType) {
        if (answerData == null || answerData.isBlank()) {
            throw new IllegalArgumentException("Đáp án không được để trống");
        }
        try {
            JsonNode root = objectMapper.readTree(answerData);
            // Other question types keep their existing JSON format.
            if (questionType != Question.QuestionType.MCQ) {
                return answerData.trim();
            }
            if (root == null || !root.isObject() || !root.path("options").isObject()) {
                throw new IllegalArgumentException("Đáp án MCQ phải có đủ bốn lựa chọn A–D");
            }
            ObjectNode options = (ObjectNode) root.get("options");
            boolean normalized = false;
            for (String key : List.of("A", "B", "C", "D")) {
                JsonNode option = options.get(key);
                if (option == null || !option.isTextual()) {
                    throw new IllegalArgumentException("Đáp án " + key + " phải là văn bản và không được để trống");
                }
                String value = option.textValue();
                validateText(value, "Đáp án " + key);
                String trimmed = value.trim();
                normalized |= !value.equals(trimmed);
                options.put(key, trimmed);
            }
            JsonNode correctAnswer = root.get("correctAnswer");
            if (correctAnswer == null || !correctAnswer.isTextual()
                    || !List.of("A", "B", "C", "D").contains(correctAnswer.textValue())) {
                throw new IllegalArgumentException("Vui lòng chọn đáp án đúng A, B, C hoặc D");
            }
            return normalized ? objectMapper.writeValueAsString(root) : answerData.trim();
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Answer data must be valid JSON", exception);
        }
    }

    private QuestionGrammarResponse toResponse(Question question) {
        return new QuestionGrammarResponse(
                question.getId(), question.getSkill(), question.getQuestionType(),
                question.getLessonId(), question.getGrammarId(), question.getContent(), question.getMediaUrl(),
                question.getExplanation(), question.getAnswerData(), question.getDifficulty(),
                question.getIsExerciseQuestion(), question.getDisplayOrder(), question.getStatus(),
                question.getCreatedBy(), question.getUpdatedBy(), question.getCreatedAt(),
                question.getUpdatedAt());
    }
}
