package com.jtech.service.impl;

import com.jtech.dto.request.AdminUserStatusRequest;
import com.jtech.dto.response.UserResponse;
import com.jtech.entity.User;
import com.jtech.entity.UserStatus;
import com.jtech.mapper.UserMapper;
import com.jtech.repository.UserRepository;
import com.jtech.service.AdminUserService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminUserServiceImpl implements AdminUserService {

    private final UserRepository userRepository;

    public AdminUserServiceImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<UserResponse> getUsers(String search, Long roleId, String statusStr, Pageable pageable) {
        UserStatus status = null;
        if (statusStr != null && !statusStr.isBlank()) {
            try {
                status = UserStatus.valueOf(statusStr.toUpperCase());
            } catch (IllegalArgumentException ignored) {
                status = null;
            }
        }
        return userRepository.findAdminUsers(search, roleId, status, pageable).map(UserMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<UserResponse> getPendingUsers(Pageable pageable) {
        return userRepository.findAdminUsers(null, null, UserStatus.PENDING, pageable)
                .map(UserMapper::toResponse);
    }

    @Override
    @Transactional
    public UserResponse approveUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng với ID: " + userId));
        user.setStatus(UserStatus.ACTIVE);
        return UserMapper.toResponse(userRepository.save(user));
    }

    @Override
    @Transactional
    public UserResponse rejectUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng với ID: " + userId));
        user.setStatus(UserStatus.BANNED);
        return UserMapper.toResponse(userRepository.save(user));
    }


    @Override
    @Transactional
    public UserResponse updateUserStatus(Long userId, AdminUserStatusRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng với ID: " + userId));

        try {
            user.setStatus(UserStatus.valueOf(request.getStatus().toUpperCase()));
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Trạng thái không hợp lệ: " + request.getStatus());
        }

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
