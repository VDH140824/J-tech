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
import com.jtech.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class ClassService {
    private final EntityManager entityManager;
    private final ClassRepository classRepository;
    private final UserRepository userRepository;

    public ClassService(ClassRepository classRepository, UserRepository userRepository, EntityManager entityManager) {
        this.classRepository = classRepository;
        this.userRepository = userRepository;
        this.entityManager = entityManager;
    }

    @Transactional(readOnly = true)
    public List<ClassResponse> getClassesByCurrentModerator() {
        var user = getCurrentModerator();
        return classRepository.findByModeratorId(user.getUserId()).stream()
                .map(ClassResponse::fromQueryRow)
                .toList();
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
