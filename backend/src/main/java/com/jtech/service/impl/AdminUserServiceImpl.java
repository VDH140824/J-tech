package com.jtech.service.impl;

import com.jtech.dto.request.AdminUserStatusRequest;
import com.jtech.dto.request.ChangeUserRoleRequest;
import com.jtech.dto.request.PreCreateUserRequest;
import com.jtech.dto.request.RejectUserRequest;
import com.jtech.dto.response.UserResponse;
import com.jtech.entity.Role;
import com.jtech.entity.User;
import com.jtech.entity.UserStatus;
import com.jtech.mapper.UserMapper;
import com.jtech.repository.RoleRepository;
import com.jtech.repository.UserRepository;
import com.jtech.service.AdminUserService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminUserServiceImpl implements AdminUserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    public AdminUserServiceImpl(UserRepository userRepository, RoleRepository roleRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<UserResponse> getUsers(
        String search,
        Long roleId,
        String statusStr,
        Pageable pageable
    ) {
        UserStatus status = null;
        if (statusStr != null && !statusStr.isBlank()) {
            try {
                status = UserStatus.valueOf(statusStr.toUpperCase());
            } catch (IllegalArgumentException ignored) {
                status = null;
            }
        }
        return userRepository
            .findAdminUsers(search, roleId, status, pageable)
            .map(UserMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<UserResponse> getPendingUsers(Pageable pageable) {
        return userRepository
            .findAdminUsers(null, null, UserStatus.PENDING, pageable)
            .map(UserMapper::toResponse);
    }

    @Override
    @Transactional
    public UserResponse approveUser(Long userId) {
        User user = userRepository
            .findById(userId)
            .orElseThrow(() ->
                new IllegalArgumentException("Không tìm thấy người dùng với ID: " + userId)
            );
        user.setStatus(UserStatus.ACTIVE);
        user.setStatusReason(null);
        user.setReviewedAt(java.time.LocalDateTime.now());
        return UserMapper.toResponse(userRepository.save(user));
    }

    @Override
    @Transactional
    public UserResponse rejectUser(Long userId, RejectUserRequest request) {
        User user = userRepository
            .findById(userId)
            .orElseThrow(() ->
                new IllegalArgumentException("Không tìm thấy người dùng với ID: " + userId)
            );
        String reason = requireStatusReason(request == null ? null : request.getStatusReason());
        user.setStatus(UserStatus.REJECTED);
        user.setStatusReason(reason);
        user.setReviewedAt(java.time.LocalDateTime.now());
        return UserMapper.toResponse(userRepository.save(user));
    }

    @Override
    @Transactional
    public UserResponse updateUserStatus(Long userId, AdminUserStatusRequest request) {
        User user = userRepository
            .findById(userId)
            .orElseThrow(() ->
                new IllegalArgumentException("Không tìm thấy người dùng với ID: " + userId)
            );

        UserStatus nextStatus;
        try {
            nextStatus = UserStatus.valueOf(request.getStatus().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Trạng thái không hợp lệ: " + request.getStatus());
        }
        String reason =
            nextStatus == UserStatus.LOCKED || nextStatus == UserStatus.REJECTED
                ? requireStatusReason(request.getStatusReason())
                : null;
        user.setStatus(nextStatus);
        user.setStatusReason(reason);
        user.setReviewedAt(java.time.LocalDateTime.now());

        return UserMapper.toResponse(userRepository.save(user));
    }

    private String requireStatusReason(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Lý do thay đổi trạng thái không được để trống");
        }
        String reason = value.trim();
        if (reason.length() > 100) {
            throw new IllegalArgumentException("Lý do không được vượt quá 100 ký tự");
        }
        return reason;
    }

    @Override
    @Transactional
    public UserResponse changeUserRole(
        Long userId,
        ChangeUserRoleRequest request,
        String currentUserEmail
    ) {
        User user = userRepository
            .findById(userId)
            .orElseThrow(() ->
                new IllegalArgumentException("Không tìm thấy người dùng với ID: " + userId)
            );
        if (currentUserEmail != null && currentUserEmail.equalsIgnoreCase(user.getEmail())) {
            throw new IllegalArgumentException("Admin không thể tự thay đổi role của chính mình.");
        }

        String roleName = request.getRole() == null ? "" : request.getRole().trim().toUpperCase();
        if (
            !roleName.equals("ADMIN") &&
            !roleName.equals("STUDENT") &&
            !roleName.equals("MODERATOR")
        ) {
            throw new IllegalArgumentException(
                "Role không hợp lệ. Chỉ chấp nhận ADMIN, STUDENT hoặc MODERATOR."
            );
        }
        Role role = roleRepository
            .findByRoleName(roleName)
            .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy role: " + roleName));
        user.setRole(role);
        return UserMapper.toResponse(userRepository.save(user));
    }

    @Override
    @Transactional
    public void deleteUser(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new IllegalArgumentException("Không tìm thấy người dùng với ID: " + userId);
        }
        userRepository.deleteById(userId);
    }

    @Override
    @Transactional
    public UserResponse preCreateUser(PreCreateUserRequest request) {
        String rawEmail = request.getEmail();
        if (rawEmail == null || rawEmail.isBlank()) {
            throw new IllegalArgumentException("Email không được để trống");
        }
        String email = rawEmail.trim().toLowerCase();
        if (email.length() > 255) {
            throw new IllegalArgumentException("Email không được vượt quá 255 ký tự");
        }
        if (!email.matches("^[^@\\s]+@[^@\\s.]+(?:\\.[^@\\s.]+)+$")) {
            throw new IllegalArgumentException(
                "Email không đúng định dạng: cần có tên và tên miền hợp lệ, không chứa khoảng trắng hoặc dấu chấm liên tiếp"
            );
        }

        if (userRepository.findByEmail(email).isPresent()) {
            throw new IllegalStateException("Email đã tồn tại trong hệ thống: " + email);
        }

        String roleName = request.getRole() == null ? "" : request.getRole().trim().toUpperCase();
        if (
            !roleName.equals("ADMIN") &&
            !roleName.equals("STUDENT") &&
            !roleName.equals("MODERATOR")
        ) {
            throw new IllegalArgumentException(
                "Role không hợp lệ. Chỉ chấp nhận ADMIN, STUDENT hoặc MODERATOR."
            );
        }

        Role role = roleRepository
            .findByRoleName(roleName)
            .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy role: " + roleName));

        String fullName = email.contains("@") ? email.substring(0, email.indexOf('@')) : email;

        User user = new User();
        user.setEmail(email);
        user.setRole(role);
        user.setStatus(UserStatus.ACTIVE);
        user.setFullName(fullName.length() > 50 ? fullName.substring(0, 50) : fullName);
        user.setCoinBalance(0);

        return UserMapper.toResponse(userRepository.save(user));
    }
}
