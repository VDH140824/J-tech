package com.jtech.service.impl;

import com.jtech.dto.request.ConjugationFormRequest;
import com.jtech.dto.response.ConjugationFormResponse;
import com.jtech.dto.response.DeleteResultResponse;
import com.jtech.entity.ConjugationForm;
import com.jtech.entity.Course;
import com.jtech.entity.Question;
import com.jtech.entity.User;
import com.jtech.repository.ConjugationFormRepository;
import com.jtech.repository.QuestionConjugationRepository;
import com.jtech.repository.UserRepository;
import com.jtech.service.ConjugationFormService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Các số trong comment là số message trong sequence diagram "sd Create Conjugation Form".
 */
@Service
public class ConjugationFormServiceImpl implements ConjugationFormService {

    private static final int MIN_QUESTIONS_TO_PUBLISH = 5;

    private static final String MSG30 = "Dữ liệu này đã tồn tại trong bài học/hệ thống. Vui lòng kiểm tra lại!";
    private static final String MSG32 = "Không thể xuất bản: số câu hỏi mỗi lượt phải từ 5 trở lên và không vượt quá số câu hỏi đã soạn.";

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

    /** Các số trong method này theo sequence diagram "sd View Conjugation Forms". */
    @Override
    @Transactional(readOnly = true)
    public Page<ConjugationFormResponse> getAll(String keyword, Course.Status status, Pageable pageable) {
        // 1.1.1.1: SELECT ... + SELECT COUNT(*) với cùng điều kiện lọc
        Page<ConjugationForm> page = conjugationFormRepository.search(trimToNull(keyword), status, pageable);

        // loop [for each form in page]: 1.1.1.2 đếm câu hỏi ACTIVE đã gắn, 1.1.1.3 mapToResponse
        return page.map(form -> {
            long linkedQuestionCount = questionRepository.countByConjugationFormIdAndStatus(
                    form.getId(), Question.QuestionStatus.ACTIVE);
            return mapToResponse(form, linkedQuestionCount);
        });
    }

    @Override
    @Transactional
    public ConjugationFormResponse create(ConjugationFormRequest request, String moderatorEmail) {
        String code = request.code().trim();

        // 3.3.1.1: kiểm tra trùng mã -> nhánh [isExisted = true] trả 409 Conflict (MSG30)
        checkDuplicateCode(code, null);

        // 3.3.1.2: lấy Moderator để gán createdBy
        User moderator = userRepository.findByEmail(moderatorEmail)
                .orElseThrow(() -> new AuthenticationCredentialsNotFoundException("Không tìm thấy tài khoản đăng nhập."));

        // 3.3.1.3: «create», luôn ở trạng thái DRAFT. BR-104 kiểm tra khi publish, không kiểm tra ở đây.
        ConjugationForm form = ConjugationForm.builder()
                .code(code)
                .nameVi(request.nameVi().trim())
                .nameJp(request.nameJp().trim())
                .description(trimToNull(request.description()))
                .materialContent(request.materialContent().trim())
                .questionsPerPractice(request.questionsPerPractice())
                .displayOrder(request.displayOrder() != null ? request.displayOrder() : 0)
                .status(Course.Status.DRAFT)
                .createdBy(moderator)
                .build();

        // 3.3.1.4: INSERT INTO conjugation_form ...
        ConjugationForm saved = conjugationFormRepository.save(form);

        // Thể chia vừa tạo chưa có câu hỏi nào được gắn vào.
        return mapToResponse(saved, 0L);
    }

    /** Các số trong method này theo sequence diagram "sd Update Conjugation Form" (SD-29.3). */
    @Override
    @Transactional
    public ConjugationFormResponse update(Long id, ConjugationFormRequest request, String moderatorEmail) {
        // 3.3.1.1: findById -> SELECT * FROM conjugation_form WHERE id = ?
        // break [form không tồn tại] -> 404 Not Found, Browser 3.4: showError(message)
        ConjugationForm form = conjugationFormRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy thể chia có id = " + id + "."));

        String code = request.code().trim();

        // 3.3.1.2: checkDuplicateCode(code, id) -> 3.3.1.2.1 existsByCodeAndIdNot
        // break [isExisted = true] -> 409 Conflict (MSG30), Browser 3.5: showError("MSG30")
        checkDuplicateCode(code, id);

        // 3.3.1.3: findByEmail(moderatorEmail) -> SELECT * FROM user_account WHERE email = ?
        User moderator = userRepository.findByEmail(moderatorEmail)
                .orElseThrow(() -> new AuthenticationCredentialsNotFoundException("Không tìm thấy tài khoản đăng nhập."));

        // 3.3.1.4: gán dữ liệu mới từ request vào form (kể cả status, displayOrder), updatedBy = moderator
        applyChanges(form, request, code, moderator);

        // 3.3.1.5: countByConjugationFormIdAndStatus(id, ACTIVE)
        // Câu COUNT này dùng flush mode COMMIT (xem QuestionRepository) nên form vừa gán ở 3.3.1.4
        // KHÔNG bị auto-flush thành lệnh UPDATE trước khi kiểm tra BR-111.
        long linkedQuestionCount = questionRepository.countByConjugationFormIdAndStatus(id, Question.QuestionStatus.ACTIVE);

        // 3.3.1.6: validatePublishQuota(form, linkedQuestionCount)
        // break [status = PUBLISHED AND (questionsPerPractice < 5 OR > linkedQuestionCount)]
        //   -> 400 Bad Request (MSG32), Browser 3.6: showError("MSG32").
        // Ném lỗi ở đây thì transaction rollback, các giá trị vừa gán không được ghi xuống DB.
        validatePublishQuota(form, linkedQuestionCount);

        // 3.3.1.7: save(form) -> UPDATE conjugation_form SET ... WHERE id = ?
        ConjugationForm savedForm = conjugationFormRepository.save(form);

        // 3.3.1.8: mapToResponse(savedForm, linkedQuestionCount) -> 200 OK, Browser 3.7: showMessage("MSG31")
        return mapToResponse(savedForm, linkedQuestionCount);
    }

    /**
     * Các số trong method này theo sequence diagram "sd Delete / Archive Conjugation Form" (SD-29.4).
     * Chạy trong một transaction: lỗi ở bất kỳ bước nào đều rollback toàn bộ.
     */
    @Override
    @Transactional
    public DeleteResultResponse delete(Long id, String moderatorEmail) {
        // 3.1.1.1: findById -> SELECT * FROM conjugation_form WHERE id = ?
        // break [form không tồn tại] -> 404 Not Found (message), Browser 3.2: showError(message)
        ConjugationForm form = conjugationFormRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy thể chia có id = " + id + "."));

        // 3.1.1.2: hasLearningData(id) -> 3.1.1.2.1 countPracticeAttempts
        if (hasLearningData(id)) {
            // alt [hasLearningData = true] (BR-88: không xóa cứng, chuyển sang ARCHIVED)

            // 3.1.1.3: findByEmail(moderatorEmail) -> SELECT * FROM user_account WHERE email = ?
            User moderator = userRepository.findByEmail(moderatorEmail)
                    .orElseThrow(() -> new AuthenticationCredentialsNotFoundException("Không tìm thấy tài khoản đăng nhập."));

            // 3.1.1.4: status = ARCHIVED, updatedBy = moderator
            form.setStatus(Course.Status.ARCHIVED);
            form.setUpdatedBy(moderator);

            // 3.1.1.5: save(form) -> UPDATE conjugation_form SET status = 'ARCHIVED', updated_by = ?, updated_at = ? WHERE id = ?
            conjugationFormRepository.save(form);
            return new DeleteResultResponse(id, true);
        }

        // [else] chưa có dữ liệu học tập -> xóa hẳn.
        // 3.1.1.6: deleteByConjugationFormId(id) -> DELETE FROM question WHERE conjugation_form_id = ?
        // Xóa câu hỏi trước vì question.conjugation_form_id là khóa ngoại tới conjugation_form.
        questionRepository.deleteByConjugationFormId(id);

        // 3.1.1.7: delete(form) -> DELETE FROM conjugation_form WHERE id = ?
        conjugationFormRepository.delete(form);
        return new DeleteResultResponse(id, false);
    }

    /** 3.1.1.2 - BR-88: thể chia đã phát sinh dữ liệu học tập khi có practice_attempt tham chiếu tới nó. */
    private boolean hasLearningData(Long id) {
        return conjugationFormRepository.countPracticeAttempts(id) > 0;
    }

    /** 3.3.1.4 trong sd Update Conjugation Form. status / displayOrder null thì giữ giá trị cũ. */
    private void applyChanges(ConjugationForm form, ConjugationFormRequest request, String code, User moderator) {
        form.setCode(code);
        form.setNameVi(request.nameVi().trim());
        form.setNameJp(request.nameJp().trim());
        form.setDescription(trimToNull(request.description()));
        form.setMaterialContent(request.materialContent().trim());
        form.setQuestionsPerPractice(request.questionsPerPractice());
        if (request.displayOrder() != null) form.setDisplayOrder(request.displayOrder());
        if (request.status() != null) form.setStatus(request.status());
        form.setUpdatedBy(moderator);
    }

    /**
     * 3.3.1.6 - BR-111: thể chia ở trạng thái PUBLISHED (sau khi sửa) phải có từ 5 câu mỗi lượt trở lên
     * và không vượt quá số câu hỏi ACTIVE đã soạn.
     */
    private void validatePublishQuota(ConjugationForm form, long linkedQuestionCount) {
        if (form.getStatus() != Course.Status.PUBLISHED) return;
        int questionsPerPractice = form.getQuestionsPerPractice();
        if (questionsPerPractice < MIN_QUESTIONS_TO_PUBLISH || questionsPerPractice > linkedQuestionCount) {
            throw new IllegalArgumentException(MSG32);
        }
    }

    /** @param excludeId null khi tạo mới; id bản ghi đang sửa khi cập nhật */
    private void checkDuplicateCode(String code, Long excludeId) {
        boolean isExisted = (excludeId == null)
                ? conjugationFormRepository.existsByCode(code)
                : conjugationFormRepository.existsByCodeAndIdNot(code, excludeId);
        if (isExisted) {
            // 409 Conflict (MSG30); GlobalExceptionHandler đã xử lý ResponseStatusException
            throw new ResponseStatusException(HttpStatus.CONFLICT, MSG30);
        }
    }

    private ConjugationFormResponse mapToResponse(ConjugationForm form, long linkedQuestionCount) {
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
