package com.jtech.service;

import com.jtech.dto.response.ClassResponse;
import com.jtech.dto.request.ClassRequest;
import com.jtech.entity.Classroom;
import com.jtech.entity.ClassroomStatus;
import com.jtech.entity.User;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityNotFoundException;
import java.time.LocalDateTime;
import org.springframework.dao.DataIntegrityViolationException;
import com.jtech.entity.UserStatus;
import com.jtech.repository.ClassRepository;
import com.jtech.repository.ClassMemberRepository;
import com.jtech.repository.UserRepository;
import com.jtech.dto.response.StudentResponse;
import com.jtech.dto.response.AddStudentsResponse;
import com.jtech.dto.response.SkippedEmail;
import com.jtech.entity.ClassroomMember;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class ClassService {
    private final EntityManager entityManager;
    private final ClassRepository classRepository;
    private final ClassMemberRepository classMemberRepository;
    private final UserRepository userRepository;

    public ClassService(ClassRepository classRepository, ClassMemberRepository classMemberRepository,
            UserRepository userRepository, EntityManager entityManager) {
        this.classRepository = classRepository;
        this.classMemberRepository = classMemberRepository;
        this.userRepository = userRepository;
        this.entityManager = entityManager;
    }

    @Transactional
    public AddStudentsResponse addStudents(Long classId, List<String> emails) {
        if (classId == null || classId <= 0) {
            throw new IllegalArgumentException("Mã lớp không hợp lệ.");
        }
        var moderator = getCurrentModerator();
        var classroom = classRepository.findByIdForUpdate(classId)
                .orElseThrow(() -> new EntityNotFoundException("Lớp học không tồn tại."));
        if (!moderator.getUserId().equals(classroom.getModeratorId())) {
            throw new AccessDeniedException("Bạn không có quyền thêm học viên vào lớp này.");
        }
        if (emails == null || emails.isEmpty()) {
            throw new IllegalArgumentException("Vui lòng nhập ít nhất một email.");
        }

        var uniqueEmails = new LinkedHashSet<String>();
        var skipped = new ArrayList<SkippedEmail>();
        for (String rawEmail : emails) {
            String email = rawEmail == null ? "" : rawEmail.trim().toLowerCase(Locale.ROOT);
            if (email.isEmpty()) {
                skipped.add(new SkippedEmail(email, "ACCOUNT_NOT_FOUND"));
            } else if (!uniqueEmails.add(email)) {
                skipped.add(new SkippedEmail(email, "DUPLICATE_EMAIL"));
            }
        }
        if (uniqueEmails.isEmpty()) {
            return new AddStudentsResponse(0, skipped.size(), List.copyOf(skipped));
        }

        Map<String, User> usersByEmail = new HashMap<>();
        for (User user : userRepository.findByNormalizedEmails(new ArrayList<>(uniqueEmails))) {
            usersByEmail.put(user.getEmail().toLowerCase(Locale.ROOT), user);
        }
        Set<Long> eligibleIds = new LinkedHashSet<>();
        for (String email : uniqueEmails) {
            User user = usersByEmail.get(email);
            if (user != null && user.getStatus() == UserStatus.ACTIVE && user.getRole() != null
                    && "STUDENT".equals(user.getRole().getRoleName())) {
                eligibleIds.add(user.getUserId());
            }
        }
        Set<Long> existingIds = eligibleIds.isEmpty() ? Set.of()
                : classMemberRepository.findExistingStudentIds(classId, eligibleIds);

        var membersToAdd = new ArrayList<ClassroomMember>();
        for (String email : uniqueEmails) {
            User user = usersByEmail.get(email);
            if (user == null) {
                skipped.add(new SkippedEmail(email, "ACCOUNT_NOT_FOUND"));
            } else if (user.getStatus() != UserStatus.ACTIVE || user.getRole() == null
                    || !"STUDENT".equals(user.getRole().getRoleName())) {
                skipped.add(new SkippedEmail(email, "INVALID_STUDENT_ACCOUNT"));
            } else if (existingIds.contains(user.getUserId())) {
                skipped.add(new SkippedEmail(email, "ALREADY_IN_CLASSROOM"));
            } else {
                membersToAdd.add(new ClassroomMember(classroom, user));
            }
        }
        if (!membersToAdd.isEmpty()) {
            classMemberRepository.saveAllAndFlush(membersToAdd);
        }
        return new AddStudentsResponse(membersToAdd.size(), skipped.size(), List.copyOf(skipped));
    }

    @Transactional
    public void removeStudent(Long classId, Long studentId) {
        if (classId == null || classId <= 0 || studentId == null || studentId <= 0) {
            throw new IllegalArgumentException("Thông tin lớp hoặc học viên không hợp lệ.");
        }
        var moderator = getCurrentModerator();
        var classroom = classRepository.findById(classId)
                .orElseThrow(() -> new EntityNotFoundException("Lớp học không tồn tại."));
        if (!moderator.getUserId().equals(classroom.getModeratorId())) {
            throw new AccessDeniedException("Bạn không có quyền gỡ học viên khỏi lớp này.");
        }
        var member = classMemberRepository.findByClassroom_IdAndStudent_UserId(classId, studentId)
                .orElseThrow(() -> new EntityNotFoundException("Học viên không tồn tại trong lớp."));
        classMemberRepository.delete(member);
        classMemberRepository.flush();
    }

    @Transactional(readOnly = true)
    public Page<StudentResponse> getClassStudents(Long classId, String search, String status,
            int page, int size) {
        if (classId == null || classId <= 0 || page < 0 || size < 1 || size > 100) {
            throw new IllegalArgumentException("Tham số danh sách học viên không hợp lệ.");
        }
        var moderator = getCurrentModerator();
        var classroom = classRepository.findById(classId)
                .orElseThrow(() -> new EntityNotFoundException("Lớp học không tồn tại."));
        if (!moderator.getUserId().equals(classroom.getModeratorId())) {
            throw new AccessDeniedException("Bạn không có quyền xem học viên của lớp này.");
        }
        UserStatus studentStatus = null;
        if (status != null && !status.isBlank()) {
            try {
                studentStatus = UserStatus.valueOf(status.trim().toUpperCase(java.util.Locale.ROOT));
            } catch (IllegalArgumentException exception) {
                throw new IllegalArgumentException("Trạng thái học viên không hợp lệ.");
            }
        }
        String normalizedSearch = search == null ? "" : search.trim();
        return classMemberRepository.findStudentsByClassId(classId, normalizedSearch,
                studentStatus, PageRequest.of(page, size));
    }

    @Transactional(readOnly = true)
    public List<ClassResponse> getClassesByCurrentModerator() {
        var user = getCurrentModerator();
        return classRepository.findByModeratorId(user.getUserId()).stream()
                .map(ClassResponse::fromQueryRow)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ClassResponse> getClassesByCurrentStudent() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated())
            throw new AuthenticationCredentialsNotFoundException("Vui lòng đăng nhập.");
        var user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new AuthenticationCredentialsNotFoundException("Tài khoản không tồn tại."));
        if (user.getStatus() != UserStatus.ACTIVE || user.getRole() == null
                || !"STUDENT".equals(user.getRole().getRoleName()))
            throw new AccessDeniedException("Bạn không có quyền xem danh sách lớp.");
        return classMemberRepository.findStudentClasses(user.getUserId()).stream()
                .map(ClassResponse::fromQueryRow).toList();
    }

    @Transactional
    public ClassResponse createClass(ClassRequest request) {
        ClassRequest data = validateClassData(request);
        var moderator = getCurrentModerator();
        if (classRepository.existsByCode(data.code())) throw new IllegalStateException("Mã lớp đã tồn tại.");
        Classroom classroom = new Classroom();
        classroom.setCode(data.code());
        classroom.setDescription(data.description());
        classroom.setModeratorId(moderator.getUserId());
        classroom.setStatus(ClassroomStatus.valueOf(data.status()));
        saveClassroom(classroom);
        entityManager.refresh(classroom);
        return ClassResponse.fromClassroom(classroom);
    }

    @Transactional
    public ClassResponse updateClass(Long id, ClassRequest request) {
        var moderator = getCurrentModerator();
        Classroom classroom = classRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Lớp học không tồn tại."));
        if (!moderator.getUserId().equals(classroom.getModeratorId())) {
            throw new AccessDeniedException("Bạn không có quyền chỉnh sửa lớp học này.");
        }
        ClassRequest data = validateClassData(request);
        if (classRepository.existsByCodeAndIdNot(data.code(), id)) {
            throw new IllegalStateException("Mã lớp đã tồn tại.");
        }
        classroom.setCode(data.code());
        classroom.setDescription(data.description());
        classroom.setStatus(ClassroomStatus.valueOf(data.status()));
        classroom.setUpdatedAt(LocalDateTime.now());
        saveClassroom(classroom);
        return ClassResponse.fromClassroom(classroom, classRepository.countStudents(id));
    }

    @Transactional
    public void deleteClass(Long id) {
        var moderator = getCurrentModerator();
        Classroom classroom = classRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Lớp học không tồn tại."));
        if (!moderator.getUserId().equals(classroom.getModeratorId())) {
            throw new AccessDeniedException("Bạn không có quyền xóa lớp học này.");
        }
        if (classRepository.countStudents(id) > 0) {
            throw new IllegalStateException("Không thể xóa lớp đang có học sinh.");
        }
        if (classRepository.countPosts(id) > 0) {
            throw new IllegalStateException("Không thể xóa lớp đang có bài đăng.");
        }
        try {
            classRepository.delete(classroom);
            classRepository.flush();
        } catch (DataIntegrityViolationException exception) {
            for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
                if (cause.getMessage() != null && cause.getMessage().toLowerCase(java.util.Locale.ROOT).contains("foreign key")) {
                    throw new IllegalStateException("Không thể xóa lớp vì lớp đã có dữ liệu liên quan.", exception);
                }
            }
            throw exception;
        }
    }

    private ClassRequest validateClassData(ClassRequest request) {
        String code = request == null || request.code() == null ? "" : request.code().trim();
        String description = request == null || request.description() == null ? null : request.description().trim();
        String statusValue = request == null || request.status() == null ? "" : request.status().trim();
        if (code.isEmpty()) throw new IllegalArgumentException("Vui lòng nhập mã lớp.");
        if (code.length() > 30) throw new IllegalArgumentException("Mã lớp không được vượt quá 30 ký tự.");
        if (!code.matches("[A-Za-z0-9_-]+")) {
            throw new IllegalArgumentException("Mã lớp chỉ được chứa chữ cái không dấu, số, dấu _ và dấu -.");
        }
        if (description != null && description.codePointCount(0, description.length()) > 100) {
            throw new IllegalArgumentException("Mô tả không được vượt quá 100 ký tự.");
        }
        if (description != null && description.isEmpty()) description = null;
        ClassroomStatus status;
        try {
            status = ClassroomStatus.valueOf(statusValue);
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Trạng thái lớp học không hợp lệ.");
        }
        return new ClassRequest(code, description, status.name());
    }

    private void saveClassroom(Classroom classroom) {
        try {
            classRepository.saveAndFlush(classroom);
        } catch (DataIntegrityViolationException exception) {
            // Only translate the classroom-code constraint; other storage errors remain errors.
            for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
                if (cause.getMessage() != null && cause.getMessage().contains("uq_classroom_code")) {
                    throw new IllegalStateException("Mã lớp đã tồn tại.", exception);
                }
            }
            throw exception;
        }
    }

    private User getCurrentModerator() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            throw new AuthenticationCredentialsNotFoundException("Vui lòng đăng nhập.");
        }
        var user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new AuthenticationCredentialsNotFoundException("Tài khoản không tồn tại."));
        if (user.getStatus() != UserStatus.ACTIVE || user.getRole() == null
                || !"MODERATOR".equals(user.getRole().getRoleName())) {
            throw new AccessDeniedException("Bạn không có quyền xem danh sách lớp.");
        }
        return user;
    }
}
