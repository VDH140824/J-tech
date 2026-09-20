package com.jtech.service;

import com.jtech.dto.request.AdminCreateUserRequest;
import com.jtech.dto.request.AdminUpdateUserRequest;
import com.jtech.dto.request.AdminUserStatusRequest;
import com.jtech.dto.response.UserResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface AdminUserService {
    Page<UserResponse> getUsers(String search, Long roleId, String status, Pageable pageable);
    UserResponse createUser(AdminCreateUserRequest request);
    UserResponse updateUser(Long userId, AdminUpdateUserRequest request);
    UserResponse updateUserStatus(Long userId, AdminUserStatusRequest request);
    Page<UserResponse> getPendingUsers(Pageable pageable);
    UserResponse approveUser(Long userId);
    UserResponse rejectUser(Long userId);
    void deleteUser(Long userId);
}
