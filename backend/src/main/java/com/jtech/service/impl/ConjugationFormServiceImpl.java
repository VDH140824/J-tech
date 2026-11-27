package com.jtech.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jtech.dto.request.ConjugationFormRequest;
import com.jtech.dto.request.ConjugationQuestionRequest;
import com.jtech.dto.response.ConjugationFormResponse;
import com.jtech.dto.response.DeleteResultResponse;
import com.jtech.dto.response.PracticeQuestionResponse;
import com.jtech.entity.ConjugationForm;
import com.jtech.entity.Course;
import com.jtech.entity.Question;
import com.jtech.entity.User;
import com.jtech.repository.ConjugationFormRepository;
import com.jtech.repository.QuestionConjugationRepository;
import com.jtech.repository.UserRepository;
import com.jtech.service.ConjugationAnswerData;
import com.jtech.service.ConjugationFormService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * UC-47 Quản lý các thể chia động từ.
 * Số trong comment là số message của sequence diagram tương ứng (SD-29.1 → SD-29.5).
 */
@Service
public class ConjugationFormServiceImpl implements ConjugationFormService {

    private static final String DUPLICATE_MESSAGE = "Thể chia này đã tồn tại trong hệ thống. Vui lòng kiểm tra lại!";
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final String DUPLICATE_QUESTION_MESSAGE = "Động từ này đã có câu hỏi trong thể chia.";
    private static final String NOT_ENOUGH_PRACTICE_MESSAGE = "Số câu hỏi luyện tập không đủ cho một lượt làm bài.";

    /** Thứ tự và nhãn các nhóm trong material_content, khớp với frontend/utils/conjugationMaterial.ts. */
    private static final List<String> THEORY_GROUPS = List.of("Nhóm I", "Nhóm II", "Nhóm III");
    private static final Pattern THEORY_SECTION = Pattern.compile("【(Nhóm I{1,3})】\\n?([\\s\\S]*?)(?=\\n*【|$)");

    private final ConjugationFormRepository conjugationFormRepository;
    private final UserRepository userRepository;
    private final QuestionConjugationRepository questionRepository;

    public ConjugationFormServiceImpl(ConjugationFormRepository conjugationFormRepository,
                                      UserRepository userRepository,
                                      QuestionConjugationRepository questionRepository) {
        this.conjugationFormRepository = conjugationFormRepository;
        this.userRepository = userRepository;
        this.questionRepository = questionRepository;
    }

    /** SD-29.2 View Conjugation Forms. */
    @Override
    @Transactional(readOnly = true)
    public Page<ConjugationFormResponse> getAll(String keyword, Course.Status status, Pageable pageable) {
        // 1.1.1.1: search -> SELECT ... + SELECT COUNT(*) cùng điều kiện lọc
        Page<ConjugationForm> page = conjugationFormRepository.search(trimToNull(keyword), status, pageable);

        // loop [for each form in page]
        return page.map(form -> {
            // 1.1.1.2: số câu hỏi ACTIVE đã gắn
            long linkedQuestionCount = questionRepository.countByConjugationFormIdAndStatus(
                    form.getId(), Question.QuestionStatus.ACTIVE);
            // 1.1.1.3: số câu dùng cho luyện tập
            long practiceQuestionCount = questionRepository.countPracticeQuestions(
                    form.getId(), Question.QuestionStatus.ACTIVE);
            // 1.1.1.4 findMissingTheoryGroups + 1.1.1.5 mapToResponse
            return mapToResponse(form, linkedQuestionCount, practiceQuestionCount);
        });
    }

    /** SD-29.1 Create Conjugation Form. */
    @Override
    @Transactional
    public ConjugationFormResponse create(ConjugationFormRequest request, String moderatorEmail) {
        String code = request.code().trim();
        String nameVi = request.nameVi().trim();

        // 4.3.1.1: checkDuplicate(code, nameVi) -> break [isCodeExisted OR isNameExisted] 409 (luồng 3b)
        checkDuplicate(code, nameVi, null);

        // 4.3.1.2: findByEmail(moderatorEmail)
        User moderator = findModerator(moderatorEmail);

        // 4.3.1.3: tạo form mới, luôn ở trạng thái DRAFT (kích hoạt ở SD-29.3)
        ConjugationForm form = ConjugationForm.builder()
                .code(code)
                .nameVi(nameVi)
                .nameJp(request.nameJp().trim())
                .description(trimToNull(request.description()))
                .materialContent(request.materialContent().trim())
                .questionsPerPractice(request.questionsPerPractice())
                .displayOrder(request.displayOrder() != null ? request.displayOrder() : 0)
                .status(Course.Status.DRAFT)
                .createdBy(moderator)
                .build();

        // 4.3.1.4: save(form) -> INSERT INTO conjugation_form ...
        ConjugationForm saved = conjugationFormRepository.save(form);

        // 4.3.1.5: mapToResponse(savedForm, 0, 0) - thể chia mới chưa có câu hỏi nào
        return mapToResponse(saved, 0L, 0L);
    }

    /** SD-29.3 Update Conjugation Form. */
    @Override
    @Transactional
    public ConjugationFormResponse update(Long id, ConjugationFormRequest request, String moderatorEmail) {
        // 3.3.1.1: findById -> break [form không tồn tại] 404 (luồng 4e)
        ConjugationForm form = findForm(id);

        String code = request.code().trim();
        String nameVi = request.nameVi().trim();

        // 3.3.1.2: checkDuplicate(code, nameVi, id) -> break 409 (luồng 4b)
        checkDuplicate(code, nameVi, id);

        // 3.3.1.3: findByEmail(moderatorEmail)
        User moderator = findModerator(moderatorEmail);

        // 3.3.1.4: applyChanges - gán dữ liệu mới (kể cả status, displayOrder), updatedBy = moderator
        applyChanges(form, request, code, nameVi, moderator);

        // 3.3.1.5 + 3.3.1.6: đếm câu đã gắn và câu luyện tập. Hai câu COUNT dùng flush mode COMMIT
        // nên dữ liệu vừa gán ở 3.3.1.4 chưa bị ghi xuống DB trước khi kiểm tra.
        long linkedQuestionCount = questionRepository.countByConjugationFormIdAndStatus(id, Question.QuestionStatus.ACTIVE);
        long practiceQuestionCount = questionRepository.countPracticeQuestions(id, Question.QuestionStatus.ACTIVE);

        // 3.3.1.7: validateActivation -> break 400 (luồng 4d, BR102, BR111).
        // Ném lỗi thì transaction rollback, dữ liệu vừa gán không được lưu.
        validateActivation(form, practiceQuestionCount);

        // 3.3.1.8: save(form) -> UPDATE conjugation_form SET ... WHERE id = ?
        ConjugationForm savedForm = conjugationFormRepository.save(form);

        // 3.3.1.9: mapToResponse
        return mapToResponse(savedForm, linkedQuestionCount, practiceQuestionCount);
    }

    /** SD-29.4 Delete / Archive Conjugation Form. Lỗi ở bất kỳ bước nào đều rollback toàn bộ. */
    @Override
    @Transactional
    public DeleteResultResponse delete(Long id, String moderatorEmail) {
        // 3.1.1.1: findById -> break [form không tồn tại] 404
        ConjugationForm form = findForm(id);

        // 3.1.1.2: hasLearningData(id)
        if (hasLearningData(id)) {
            // alt [hasLearningData = true] (luồng 6a, BR86): không xóa cứng, chuyển sang ARCHIVED
            // 3.1.1.3: findByEmail
            User moderator = findModerator(moderatorEmail);
            // 3.1.1.4: status = ARCHIVED, updatedBy = moderator
            form.setStatus(Course.Status.ARCHIVED);
            form.setUpdatedBy(moderator);
            // 3.1.1.5: save(form)
            conjugationFormRepository.save(form);
            return new DeleteResultResponse(id, true);
        }

        // [else] (luồng 6b)
        // 3.1.1.6: unlinkConjugationForm - gỡ liên kết câu hỏi, không xóa khỏi ngân hàng câu hỏi (UC-43)
        questionRepository.unlinkConjugationForm(id);
        // 3.1.1.7: delete(form) -> DELETE FROM conjugation_form WHERE id = ?
        conjugationFormRepository.delete(form);
        return new DeleteResultResponse(id, false);
    }

    /**
     * SD-29.5 Configure Practice Questions: danh sách câu ACTIVE của thể chia, lọc tùy chọn theo độ khó và
     * nhóm động từ (verbGroup null / 0 = tất cả). Nhóm động từ đọc từ answer_data nên lọc sau khi đọc.
     */
    @Override
    @Transactional(readOnly = true)
    public List<PracticeQuestionResponse> getPracticeQuestions(Long id, Question.Difficulty difficulty, Integer verbGroup) {
        findForm(id);
        int group = verbGroup == null ? 0 : verbGroup;
        return questionRepository.findForPractice(id, difficulty).stream()
                .map(this::toQuestionResponse)
                .filter(r -> group == 0 || r.verbGroup() == group)
                .toList();
    }

    // ===================== Câu hỏi thể chia (UC-47 bước 5: thêm / sửa / xóa thủ công) =====================

    @Override
    @Transactional
    public PracticeQuestionResponse createQuestion(Long id, ConjugationQuestionRequest request, String moderatorEmail) {
        ConjugationForm form = findForm(id);
        QuestionInput input = normalizeInput(request);
        String content = ConjugationAnswerData.buildContent(form, input.verb(), input.reading());
        if (questionRepository.existsByConjugationFormIdAndContentAndStatus(id, content, Question.QuestionStatus.ACTIVE)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, DUPLICATE_QUESTION_MESSAGE);
        }
        User moderator = findModerator(moderatorEmail);

        Question q = new Question();
        q.setSkill(Question.Skill.CONJUGATION);
        q.setQuestionType(Question.QuestionType.FILL_IN); // học viên tự chọn nhập đáp án hoặc trắc nghiệm
        q.setConjugationFormId(id);
        q.setDisplayOrder(questionRepository.findMaxDisplayOrder(id) + 1);
        q.setStatus(Question.QuestionStatus.ACTIVE);
        q.setCreatedBy(moderator.getUserId());
        q.setCreatedAt(LocalDateTime.now());
        applyQuestion(q, content, input, request);
        return toQuestionResponse(questionRepository.save(q));
    }

    @Override
    @Transactional
    public PracticeQuestionResponse updateQuestion(Long id, Long questionId, ConjugationQuestionRequest request,
                                                   String moderatorEmail) {
        ConjugationForm form = findForm(id);
        Question q = findQuestion(id, questionId);
        QuestionInput input = normalizeInput(request);
        String content = ConjugationAnswerData.buildContent(form, input.verb(), input.reading());
        if (questionRepository.existsByConjugationFormIdAndContentAndStatusAndIdNot(
                id, content, Question.QuestionStatus.ACTIVE, questionId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, DUPLICATE_QUESTION_MESSAGE);
        }
        // Luồng 5a, BR111: bỏ câu khỏi luyện tập không được làm thể chia đang hoạt động thiếu câu
        boolean leavesPractice = Boolean.TRUE.equals(q.getIsExerciseQuestion()) && !input.isExerciseQuestion();
        if (leavesPractice) checkPracticeStillEnough(form);

        q.setUpdatedBy(findModerator(moderatorEmail).getUserId());
        q.setUpdatedAt(LocalDateTime.now());
        applyQuestion(q, content, input, request);
        return toQuestionResponse(questionRepository.save(q));
    }

    /** Xóa mềm (BR86): chuyển ARCHIVED và bỏ khỏi luyện tập; lịch sử làm bài của học viên vẫn giữ nguyên. */
    @Override
    @Transactional
    public void deleteQuestion(Long id, Long questionId, String moderatorEmail) {
        ConjugationForm form = findForm(id);
        Question q = findQuestion(id, questionId);
        if (Boolean.TRUE.equals(q.getIsExerciseQuestion())) checkPracticeStillEnough(form);
        q.setStatus(Question.QuestionStatus.ARCHIVED);
        q.setIsExerciseQuestion(false);
        q.setUpdatedBy(findModerator(moderatorEmail).getUserId());
        q.setUpdatedAt(LocalDateTime.now());
        questionRepository.save(q);
    }

    /** Dữ liệu câu hỏi đã chuẩn hóa từ request. */
    private record QuestionInput(String verb, String reading, String meaningVi, String correctAnswer,
                                 List<String> acceptedAnswers, List<String> options, boolean isExerciseQuestion) {}

    /**
     * Trim, bỏ ô trống và trùng lặp. Cách viết khác trùng đáp án đúng thì bỏ qua;
     * phương án nhiễu trùng đáp án đúng hoặc cách viết khác → lỗi (học viên sẽ có hai phương án đúng).
     */
    private QuestionInput normalizeInput(ConjugationQuestionRequest request) {
        String correct = request.correctAnswer().trim();
        String correctKey = ConjugationAnswerData.normalize(correct);
        Set<String> answerKeys = new HashSet<>(List.of(correctKey));
        List<String> accepted = new ArrayList<>();
        for (String value : request.acceptedAnswers() == null ? List.<String>of() : request.acceptedAnswers()) {
            String v = value == null ? "" : value.trim();
            if (!v.isEmpty() && answerKeys.add(ConjugationAnswerData.normalize(v))) accepted.add(v);
        }
        List<String> options = new ArrayList<>();
        Set<String> optionKeys = new HashSet<>();
        for (String value : request.options() == null ? List.<String>of() : request.options()) {
            String v = value == null ? "" : value.trim();
            if (v.isEmpty()) continue;
            String key = ConjugationAnswerData.normalize(v);
            if (answerKeys.contains(key)) {
                throw new IllegalArgumentException("Phương án nhiễu \"" + v + "\" trùng với đáp án đúng.");
            }
            if (optionKeys.add(key)) options.add(v);
        }
        return new QuestionInput(request.verb().trim(), trimToNull(request.reading()), trimToNull(request.meaningVi()),
                correct, accepted, options, request.isExerciseQuestion() == null || request.isExerciseQuestion());
    }

    private void applyQuestion(Question q, String content, QuestionInput input, ConjugationQuestionRequest request) {
        q.setContent(content);
        q.setDifficulty(request.difficulty());
        q.setExplanation(trimToNull(request.explanation()));
        q.setIsExerciseQuestion(input.isExerciseQuestion());
        q.setAnswerData(ConjugationAnswerData.write(JSON, input.verb(), input.reading(), input.meaningVi(),
                request.verbGroup(), input.correctAnswer(), input.acceptedAnswers(), input.options()));
    }

    /** Câu hỏi phải thuộc đúng thể chia và chưa bị xóa (4e). */
    private Question findQuestion(Long formId, Long questionId) {
        return questionRepository.findById(questionId)
                .filter(q -> formId.equals(q.getConjugationFormId()) && q.getStatus() == Question.QuestionStatus.ACTIVE)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy câu hỏi."));
    }

    /** Thể chia đang hoạt động: sau khi bớt 1 câu luyện tập vẫn phải đủ số câu mỗi lượt (luồng 5a, BR111). */
    private void checkPracticeStillEnough(ConjugationForm form) {
        if (form.getStatus() != Course.Status.PUBLISHED) return;
        long remaining = questionRepository.countPracticeQuestions(form.getId(), Question.QuestionStatus.ACTIVE) - 1;
        if (remaining < form.getQuestionsPerPractice()) throw new IllegalArgumentException(NOT_ENOUGH_PRACTICE_MESSAGE);
    }

    /** Đọc answer_data; câu thiếu dữ liệu vẫn hiển thị để Moderator sửa lại. */
    private PracticeQuestionResponse toQuestionResponse(Question q) {
        ConjugationAnswerData.Data d = ConjugationAnswerData.read(q, JSON);
        boolean selected = Boolean.TRUE.equals(q.getIsExerciseQuestion());
        if (d == null) {
            return new PracticeQuestionResponse(q.getId(), q.getContent(), q.getDifficulty(), selected,
                    "", "", "", 0, "", List.of(), List.of(), q.getExplanation());
        }
        return new PracticeQuestionResponse(q.getId(), q.getContent(), q.getDifficulty(), selected,
                d.verb(), d.reading(), d.meaningVi(), d.verbGroup(), d.correctAnswer(),
                d.acceptedAnswers(), d.options(), q.getExplanation());
    }

    /** SD-29.5 Configure Practice Questions: lưu danh sách câu dùng cho luyện tập. */
    @Override
    @Transactional
    public ConjugationFormResponse updatePracticeQuestions(Long id, List<Long> questionIds, String moderatorEmail) {
        ConjugationForm form = findForm(id);
        Set<Long> selectedIds = questionIds == null ? Set.of() : new HashSet<>(questionIds);

        // BR103: chỉ được chọn câu ACTIVE thuộc đúng thể chia
        Set<Long> validIds = new HashSet<>();
        for (Question q : questionRepository.findForPractice(id, null)) validIds.add(q.getId());
        if (!validIds.containsAll(selectedIds)) {
            throw new IllegalArgumentException("Có câu hỏi không thuộc thể chia này hoặc không còn hoạt động.");
        }

        // Luồng 5a, BR111: thể chia đang hoạt động không được còn ít câu hơn số câu mỗi lượt
        if (form.getStatus() == Course.Status.PUBLISHED && selectedIds.size() < form.getQuestionsPerPractice()) {
            throw new IllegalArgumentException(NOT_ENOUGH_PRACTICE_MESSAGE);
        }

        questionRepository.clearExerciseFlags(id);
        if (!selectedIds.isEmpty()) questionRepository.markExerciseQuestions(id, selectedIds);

        form.setUpdatedBy(findModerator(moderatorEmail));
        ConjugationForm savedForm = conjugationFormRepository.save(form);

        long linkedQuestionCount = questionRepository.countByConjugationFormIdAndStatus(id, Question.QuestionStatus.ACTIVE);
        return mapToResponse(savedForm, linkedQuestionCount, selectedIds.size());
    }

    // ===================== private =====================

    private ConjugationForm findForm(Long id) {
        return conjugationFormRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy thể chia."));
    }

    private User findModerator(String moderatorEmail) {
        return userRepository.findByEmail(moderatorEmail)
                .orElseThrow(() -> new AuthenticationCredentialsNotFoundException("Không tìm thấy tài khoản đăng nhập."));
    }

    /** BR86: thể chia đã phát sinh dữ liệu học tập khi có practice_attempt tham chiếu tới nó. */
    private boolean hasLearningData(Long id) {
        return conjugationFormRepository.countPracticeAttempts(id) > 0;
    }

    /** Luồng 3b/4b: trùng mã hoặc tên (không phân biệt hoa thường). excludeId = null khi tạo mới. */
    private void checkDuplicate(String code, String nameVi, Long excludeId) {
        boolean isCodeExisted = (excludeId == null)
                ? conjugationFormRepository.existsByCode(code)
                : conjugationFormRepository.existsByCodeAndIdNot(code, excludeId);
        boolean isNameExisted = (excludeId == null)
                ? conjugationFormRepository.existsByNameViIgnoreCase(nameVi)
                : conjugationFormRepository.existsByNameViIgnoreCaseAndIdNot(nameVi, excludeId);
        if (isCodeExisted || isNameExisted) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, DUPLICATE_MESSAGE);
        }
    }

    /** status / displayOrder null thì giữ giá trị cũ. */
    private void applyChanges(ConjugationForm form, ConjugationFormRequest request, String code, String nameVi, User moderator) {
        form.setCode(code);
        form.setNameVi(nameVi);
        form.setNameJp(request.nameJp().trim());
        form.setDescription(trimToNull(request.description()));
        form.setMaterialContent(request.materialContent().trim());
        form.setQuestionsPerPractice(request.questionsPerPractice());
        if (request.displayOrder() != null) form.setDisplayOrder(request.displayOrder());
        if (request.status() != null) form.setStatus(request.status());
        form.setUpdatedBy(moderator);
    }

    /**
     * Luồng 4d: chỉ kích hoạt (PUBLISHED) khi đủ lý thuyết Nhóm I, II, III (BR102)
     * và số câu luyện tập >= số câu mỗi lượt (BR111). Thông báo nêu rõ điều kiện còn thiếu.
     */
    private void validateActivation(ConjugationForm form, long practiceQuestionCount) {
        if (form.getStatus() != Course.Status.PUBLISHED) return;
        List<String> problems = new ArrayList<>();
        List<String> missingGroups = findMissingTheoryGroups(form.getMaterialContent());
        if (!missingGroups.isEmpty()) {
            problems.add("Vui lòng hoàn thiện lý thuyết cho " + String.join(", ", missingGroups) + ".");
        }
        if (practiceQuestionCount < form.getQuestionsPerPractice()) {
            problems.add("Cần ít nhất " + form.getQuestionsPerPractice() + " câu hỏi luyện tập, hiện có "
                    + practiceQuestionCount + " câu.");
        }
        if (!problems.isEmpty()) {
            throw new IllegalArgumentException("Chưa thể kích hoạt thể chia. " + String.join(" ", problems));
        }
    }

    /** Đọc các phần 【Nhóm I】【Nhóm II】【Nhóm III】 trong material_content; nhóm thiếu hoặc rỗng được trả về. */
    private List<String> findMissingTheoryGroups(String materialContent) {
        Map<String, Boolean> filled = new HashMap<>();
        if (materialContent != null) {
            Matcher m = THEORY_SECTION.matcher(materialContent.replace("\r\n", "\n"));
            while (m.find()) {
                if (!m.group(2).trim().isEmpty()) filled.put(m.group(1), true);
            }
        }
        List<String> missing = new ArrayList<>();
        for (String group : THEORY_GROUPS) if (!filled.containsKey(group)) missing.add(group);
        return missing;
    }

    private ConjugationFormResponse mapToResponse(ConjugationForm form, long linkedQuestionCount, long practiceQuestionCount) {
        return new ConjugationFormResponse(
                form.getId(),
                form.getCode(),
                form.getNameVi(),
                form.getNameJp(),
                form.getDescription(),
                form.getMaterialContent(),
                form.getQuestionsPerPractice(),
                form.getDisplayOrder(),
                form.getStatus(),
                linkedQuestionCount,
                practiceQuestionCount,
                findMissingTheoryGroups(form.getMaterialContent()),
                form.getCreatedAt(),
                form.getUpdatedAt()
        );
    }

    private static String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}