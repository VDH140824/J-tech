package com.jtech.service.impl;

import com.jtech.dto.request.AdminCreateUserRequest;
import com.jtech.dto.request.AdminUpdateUserRequest;
import com.jtech.dto.request.AdminUserStatusRequest;
import com.jtech.dto.response.UserResponse;
import com.jtech.entity.Role;
import com.jtech.entity.User;
import com.jtech.entity.UserProfile;
import com.jtech.entity.UserStatus;
import com.jtech.mapper.UserMapper;
import com.jtech.repository.RoleRepository;
import com.jtech.repository.UserProfileRepository;
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
    private final UserProfileRepository userProfileRepository;

    public AdminUserServiceImpl(UserRepository userRepository,
                                RoleRepository roleRepository,
                                UserProfileRepository userProfileRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.userProfileRepository = userProfileRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<UserResponse> getUsers(String search, Long roleId, String statusStr, Pageable pageable) {
        UserStatus status = null;
        if (statusStr != null && !statusStr.isBlank()) {
            try {
                status = UserStatus.valueOf(statusStr.toUpperCase());
            } catch (IllegalArgumentException ignored) {}
        }
        Page<User> users = userRepository.findAdminUsers(search, roleId, status, pageable);
        return users.map(UserMapper::toResponse);
    }

    @Override
    @Transactional
    public UserResponse createUser(AdminCreateUserRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Tên đăng nhập đã tồn tại!");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email đã tồn tại!");
        }

        Role role = roleRepository.findById(request.getRoleId())
                .orElseThrow(() -> new IllegalArgumentException("Role không tồn tại: " + request.getRoleId()));

        UserStatus status = UserStatus.ACTIVE;
        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            try {
                status = UserStatus.valueOf(request.getStatus().toUpperCase());
            } catch (IllegalArgumentException ignored) {}
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setRole(role);
        user.setStatus(status);
        user.setEmailVerified(true);

        User savedUser = userRepository.save(user);

        UserProfile profile = new UserProfile();
        profile.setUser(savedUser);
        profile.setFullName(savedUser.getUsername());
        userProfileRepository.save(profile);

        return UserMapper.toResponse(savedUser);
    }

    @Override
    @Transactional
    public UserResponse updateUser(Long userId, AdminUpdateUserRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng với ID: " + userId));

        if (!user.getUsername().equalsIgnoreCase(request.getUsername()) && userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Tên đăng nhập đã tồn tại!");
        }

        if (!user.getEmail().equalsIgnoreCase(request.getEmail()) && userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email đã tồn tại!");
        }

        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());

        if (request.getRoleId() != null) {
            Role role = roleRepository.findById(request.getRoleId())
                    .orElseThrow(() -> new IllegalArgumentException("Role không tồn tại: " + request.getRoleId()));
            user.setRole(role);
        }

        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            try {
                user.setStatus(UserStatus.valueOf(request.getStatus().toUpperCase()));
            } catch (IllegalArgumentException ignored) {}
        }

        User savedUser = userRepository.save(user);
        return UserMapper.toResponse(savedUser);
    }

    @Override
    @Transactional
    public UserResponse updateUserStatus(Long userId, AdminUserStatusRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng với ID: " + userId));

        try {
            UserStatus status = UserStatus.valueOf(request.getStatus().toUpperCase());
            user.setStatus(status);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Trạng thái không hợp lệ: " + request.getStatus());
        }

        User savedUser = userRepository.save(user);
        return UserMapper.toResponse(savedUser);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<UserResponse> getPendingUsers(Pageable pageable) {
        return userRepository.findByStatus(UserStatus.PENDING, pageable).map(UserMapper::toResponse);
    }

    @Override
    @Transactional
    public UserResponse approveUser(Long userId) {
        return updatePendingUserStatus(userId, UserStatus.ACTIVE, "approve");
    }

    @Override
    @Transactional
    public UserResponse rejectUser(Long userId) {
        return updatePendingUserStatus(userId, UserStatus.INACTIVE, "reject");
    }

    private UserResponse updatePendingUserStatus(Long userId, UserStatus targetStatus, String action) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng với ID: " + userId));
        if (user.getStatus() != UserStatus.PENDING) {
            throw new IllegalArgumentException("Chỉ có thể " + action + " tài khoản đang chờ phê duyệt");
        }
        user.setStatus(targetStatus);
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
}
