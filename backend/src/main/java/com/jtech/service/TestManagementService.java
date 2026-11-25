package com.jtech.service;
 
import com.jtech.dto.request.TestManagementRequest;
import com.jtech.dto.response.TestManagementResponse;
import com.jtech.entity.User;
import com.jtech.repository.TestManagementQueryRepository;
import com.jtech.repository.TestManagementQueryRepository.TestRow;
import com.jtech.repository.UserRepository;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
 

@Service
public class TestManagementService {
 
    static final List<String> SKILLS = List.of("VOCABULARY", "KANJI", "GRAMMAR");
    static final Map<String, String> SKILL_LABEL = Map.of("VOCABULARY", "Từ vựng", "KANJI", "Kanji", "GRAMMAR", "Ngữ pháp");
 
    static final String NOT_FOUND = "Không tìm thấy bài kiểm tra.";
    static final String LOCKED = "Bài kiểm tra đã có học viên làm nên không thể thay đổi câu hỏi, thời gian và điểm đạt.";
    static final String ARCHIVED = "Bài kiểm tra đã lưu trữ, không thể thay đổi.";
    static final String ARCHIVE_REASON = "Bài kiểm tra đã có học viên làm.";
    static final String INVALID_QUESTION =
            "Câu hỏi \"%s\" không phải câu kiểm tra đang dùng của bài học / chương này trong ngân hàng.";
    static final String ARCHIVED_QUESTION = "Câu hỏi \"%s\" đã lưu trữ trong ngân hàng, không thể chọn vào đề.";
    static final int MINI_MIN_QUESTIONS = 5;
    static final int MINI_MAX_QUESTIONS = 15;
    static final int CHAPTER_MIN_QUESTIONS = 15;
    static final int CHAPTER_MAX_QUESTIONS = 40;
    static final int MIN_DURATION_MINUTES = 5;
    static final int MAX_DURATION_MINUTES = 30;
    static final int MINI_MIN_MINUTES = MIN_DURATION_MINUTES, MINI_MAX_MINUTES = MAX_DURATION_MINUTES;
    static final int CHAPTER_MIN_MINUTES = MIN_DURATION_MINUTES, CHAPTER_MAX_MINUTES = MAX_DURATION_MINUTES;
    static final String TOO_FEW = "%s cần ít nhất %d câu hỏi để xuất bản (hiện có %d câu).";
    static final String TOO_MANY = "%s tối đa %d câu hỏi (đang chọn %d câu).";
    static final String BAD_DURATION = "Thời gian làm bài của %s từ %d đến %d phút.";
    static final String MISSING_PARTS = "Test chương cần ít nhất 1 câu hỏi cho mỗi phần. Còn thiếu: %s.";
    static final String HAS_ARCHIVED = "Bài kiểm tra có câu hỏi đã lưu trữ. Vui lòng bỏ câu đó trước khi xuất bản.";
    static final String LESSON_NOT_PUBLISHED = "Bài học \"%s\" chưa xuất bản.";
    static final String DUPLICATE_PUBLISHED_MINI = "Bài học này đã có mini test đang xuất bản.";
    static final String DUPLICATE_PUBLISHED_CHAPTER = "Chương này đã có test chương đang xuất bản.";
    static final String DUPLICATE_PUBLISHED_KANJI_MINI = "Chương này đã có mini test Kanji đang xuất bản.";
 
    private final TestManagementQueryRepository queries;
    private final UserRepository users;
 
    public TestManagementService(TestManagementQueryRepository queries, UserRepository users) {
        this.queries = queries;
        this.users = users;
    }
 
    @Transactional(readOnly = true)
    public TestManagementResponse.Page search(TestManagementQueryRepository.Filter filter, int page, int size) {
        return queries.search(filter, Math.max(page, 0), Math.min(Math.max(size, 1), 100));
    }
 
    @Transactional(readOnly = true)
    public TestManagementResponse.Detail detail(long id) {
        TestRow test = find(id);
        TestManagementResponse.Summary summary = queries.findSummary(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, NOT_FOUND));
        return new TestManagementResponse.Detail(summary, test.description(), queries.questionsOf(id),
                summary.attemptCount() > 0);
    }
 
    @Transactional(readOnly = true)
    public List<TestManagementResponse.QuestionItem> candidates(Long testId, TestManagementRequest.TestType testType,
            String testSkill,
            Long lessonId, Long chapterId, String skill, String questionType, String difficulty, String keyword) {
        TestRow scope = testId != null ? find(testId) : resolveScope(testType, testSkill, lessonId, chapterId);
        return queries.candidates(new TestManagementQueryRepository.CandidateFilter(
                scope.lessonId(), scope.lessonId() == null ? scope.chapterId() : null, allowedSkills(scope),
                trimToNull(skill), trimToNull(questionType), trimToNull(difficulty), keyword));
    }
 
    @Transactional
    public TestManagementResponse.Detail create(TestManagementRequest request, String moderatorEmail) {
        User moderator = findModerator(moderatorEmail);
        validateInfo(request);
        TestRow scope = resolveScope(request.testType(), request.skill(), request.lessonId(), request.chapterId());
        List<Long> ids = distinct(request.questionIds());
        validateLimits(scope, request.durationMinutes(), ids.size());
        List<TestManagementResponse.QuestionItem> questions = validateQuestions(scope, ids, Set.of());
        long id = queries.insert(new TestRow(null, scope.testType(), scope.skill(), scope.lessonId(), scope.chapterId(),
                request.title().trim(), trimToNull(request.description()), request.durationMinutes(),
                request.passingScore(), "DRAFT"), moderator.getUserId());
        queries.replaceQuestions(id, questions);
        return detail(id);
    }
 
    @Transactional
    public TestManagementResponse.Detail update(long id, TestManagementRequest request, String moderatorEmail) {
        TestRow test = find(id);
        if ("ARCHIVED".equals(test.status())) throw conflict(ARCHIVED);
        User moderator = findModerator(moderatorEmail);
        validateInfo(request);
 
        List<Long> current = queries.questionsOf(id).stream().map(TestManagementResponse.QuestionItem::id).toList();
        List<Long> requested = request.questionIds() == null ? current : distinct(request.questionIds());
        boolean locked = queries.countAttempts(id) > 0;
        boolean gradingChanged = !requested.equals(current)
                || request.durationMinutes() != test.durationMinutes()
                || request.passingScore().compareTo(test.passingScore()) != 0;
        if (locked && gradingChanged) throw conflict(LOCKED);
 
        if (!locked) validateLimits(test, request.durationMinutes(), requested.size());
        List<TestManagementResponse.QuestionItem> questions = validateQuestions(test, requested, Set.copyOf(current));
        if (!locked && "PUBLISHED".equals(test.status())) checkPublishable(test, questions);
 
        queries.updateInfo(id, request.title().trim(), trimToNull(request.description()), request.durationMinutes(),
                request.passingScore(), moderator.getUserId());
        if (!locked) queries.replaceQuestions(id, questions);
        return detail(id);
    }
 
    @Transactional
    public TestManagementResponse.Detail publish(long id, String moderatorEmail) {
        TestRow test = find(id);
        if ("ARCHIVED".equals(test.status())) throw conflict(ARCHIVED);
        User moderator = findModerator(moderatorEmail);
        if ("PUBLISHED".equals(test.status())) return detail(id);
        checkPublishable(test, queries.questionsOf(id));
        if (queries.otherPublished(test)) {
            throw conflict(!"MINI_TEST".equals(test.testType()) ? DUPLICATE_PUBLISHED_CHAPTER
                    : test.lessonId() != null ? DUPLICATE_PUBLISHED_MINI : DUPLICATE_PUBLISHED_KANJI_MINI);
        }
        queries.updateStatus(id, "PUBLISHED", moderator.getUserId());
        return detail(id);
    }
 
    @Transactional
    public TestManagementResponse.Detail unpublish(long id, String moderatorEmail) {
        TestRow test = find(id);
        if (!"PUBLISHED".equals(test.status())) throw conflict("Bài kiểm tra chưa xuất bản.");
        User moderator = findModerator(moderatorEmail);
        if (queries.countAttempts(id) > 0) throw conflict(LOCKED);
        queries.updateStatus(id, "DRAFT", moderator.getUserId());
        return detail(id);
    }
 
    @Transactional
    public TestManagementResponse.DeleteResult delete(long id, String moderatorEmail) {
        TestRow test = find(id);
        User moderator = findModerator(moderatorEmail);
        if (queries.countAttempts(id) > 0) {
            if (!"ARCHIVED".equals(test.status())) queries.updateStatus(id, "ARCHIVED", moderator.getUserId());
            return new TestManagementResponse.DeleteResult(id, true, ARCHIVE_REASON);
        }
        queries.delete(id);
        return new TestManagementResponse.DeleteResult(id, false, null);
    }
 
   
    TestRow resolveScope(TestManagementRequest.TestType testType, String skill, Long lessonId, Long chapterId) {
        if (testType == null) throw badRequest("Vui lòng chọn loại bài kiểm tra.");
        if (testType == TestManagementRequest.TestType.MINI_TEST) {
            String miniSkill = trimToNull(skill);
            if (miniSkill == null || !SKILLS.contains(miniSkill)) {
                throw badRequest("Vui lòng chọn kỹ năng của mini test: Từ vựng, Kanji hoặc Ngữ pháp.");
            }
            if ("KANJI".equals(miniSkill)) {
                requireChapter(chapterId);
                return new TestRow(null, "MINI_TEST", "KANJI", null, chapterId, null, null, 0, null, "DRAFT");
            }
            if (lessonId == null) throw badRequest("Vui lòng chọn bài học.");
            TestManagementQueryRepository.LessonInfo lesson = queries.lesson(lessonId)
                    .orElseThrow(() -> badRequest("Không tìm thấy bài học."));
            if (!miniSkill.equals(lesson.skillType())) {
                throw badRequest("Bài học đã chọn không phải bài " + SKILL_LABEL.get(miniSkill) + ".");
            }
            return new TestRow(null, "MINI_TEST", miniSkill, lessonId, null, null, null, 0, null, "DRAFT");
        }
        requireChapter(chapterId);
        return new TestRow(null, "CHAPTER_TEST", "ALL", null, chapterId, null, null, 0, null, "DRAFT");
    }
 
    private void requireChapter(Long chapterId) {
        if (chapterId == null) throw badRequest("Vui lòng chọn chương.");
        if (!queries.chapterExists(chapterId)) throw badRequest("Không tìm thấy chương.");
    }
 
    static List<String> allowedSkills(TestRow test) {
        return "ALL".equals(test.skill()) ? SKILLS : List.of(test.skill());
    }
 
    List<TestManagementResponse.QuestionItem> validateQuestions(TestRow test, List<Long> ids, Set<Long> alreadyInTest) {
        if (ids.isEmpty()) return List.of();
        Map<Long, TestManagementResponse.QuestionItem> found = queries.findQuestions(ids).stream()
                .collect(Collectors.toMap(TestManagementResponse.QuestionItem::id, Function.identity(), (a, b) -> a));
        List<String> skills = allowedSkills(test);
        List<TestManagementResponse.QuestionItem> result = new ArrayList<>();
        for (Long id : ids) {
            TestManagementResponse.QuestionItem q = found.get(id);
            if (q == null) throw badRequest("Không tìm thấy câu hỏi #" + id + " trong ngân hàng.");
            boolean inScope = test.lessonId() != null
                    ? Objects.equals(q.lessonId(), test.lessonId())
                    : Objects.equals(q.chapterId(), test.chapterId());
            if (!skills.contains(q.skill()) || q.exerciseQuestion() || !inScope) {
                throw badRequest(INVALID_QUESTION.formatted(shorten(q.content())));
            }
            if (!"ACTIVE".equals(q.status()) && !alreadyInTest.contains(id)) {
                throw badRequest(ARCHIVED_QUESTION.formatted(shorten(q.content())));
            }
            result.add(q);
        }
        return result;
    }
 
    static void checkPublishable(TestRow test, List<TestManagementResponse.QuestionItem> questions) {
        if ("ALL".equals(test.skill())) {
            Set<String> present = questions.stream().map(TestManagementResponse.QuestionItem::skill)
                    .collect(Collectors.toSet());
            List<String> missing = SKILLS.stream().filter(s -> !present.contains(s)).map(SKILL_LABEL::get).toList();
            if (!missing.isEmpty()) throw badRequest(MISSING_PARTS.formatted(String.join(", ", missing)));
        }
        int min = isMini(test) ? MINI_MIN_QUESTIONS : CHAPTER_MIN_QUESTIONS;
        if (questions.size() < min) throw badRequest(TOO_FEW.formatted(typeLabel(test), min, questions.size()));
        if (questions.stream().anyMatch(q -> !"ACTIVE".equals(q.status()))) throw badRequest(HAS_ARCHIVED);
        questions.stream().filter(q -> !"PUBLISHED".equals(q.lessonStatus())).findFirst().ifPresent(q -> {
            throw badRequest(LESSON_NOT_PUBLISHED.formatted(q.lessonTitle()));
        });
    }
 
    static void validateInfo(TestManagementRequest request) {
        if (request.title() == null || request.title().isBlank()) throw badRequest("Vui lòng nhập tên bài kiểm tra.");
        if (request.title().trim().length() > 200) throw badRequest("Tên bài kiểm tra tối đa 200 ký tự.");
        if (request.description() != null && request.description().length() > 1000) {
            throw badRequest("Mô tả tối đa 1000 ký tự.");
        }
        if (request.durationMinutes() == null) throw badRequest("Vui lòng nhập thời gian làm bài.");
        BigDecimal score = request.passingScore();
        if (score == null || score.compareTo(BigDecimal.ZERO) < 0 || score.compareTo(BigDecimal.valueOf(100)) > 0) {
            throw badRequest("Điểm đạt từ 0 đến 100.");
        }
    }
 
    static void validateLimits(TestRow test, int durationMinutes, int questionCount) {
        boolean mini = isMini(test);
        int minMinutes = mini ? MINI_MIN_MINUTES : CHAPTER_MIN_MINUTES;
        int maxMinutes = mini ? MINI_MAX_MINUTES : CHAPTER_MAX_MINUTES;
        if (durationMinutes < minMinutes || durationMinutes > maxMinutes) {
            throw badRequest(BAD_DURATION.formatted(typeLabel(test).toLowerCase(), minMinutes, maxMinutes));
        }
        int max = mini ? MINI_MAX_QUESTIONS : CHAPTER_MAX_QUESTIONS;
        if (questionCount > max) throw badRequest(TOO_MANY.formatted(typeLabel(test), max, questionCount));
    }
 
    static boolean isMini(TestRow test) {
        return "MINI_TEST".equals(test.testType());
    }
 
    static String typeLabel(TestRow test) {
        return isMini(test) ? "Mini test" : "Test chương";
    }
 
    private TestRow find(long id) {
        return queries.findTest(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, NOT_FOUND));
    }
 
    private User findModerator(String email) {
        return users.findByEmail(email)
                .orElseThrow(() -> new AuthenticationCredentialsNotFoundException("Không tìm thấy tài khoản đăng nhập."));
    }
 
    static List<Long> distinct(List<Long> ids) {
        if (ids == null) return List.of();
        Set<Long> set = new LinkedHashSet<>();
        ids.stream().filter(Objects::nonNull).forEach(set::add);
        return List.copyOf(set);
    }
 
    private static String shorten(String text) {
        if (text == null) return "";
        return text.length() > 60 ? text.substring(0, 57) + "..." : text;
    }
 
    private static String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
 
    private static ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
 
    private static ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }
}
 