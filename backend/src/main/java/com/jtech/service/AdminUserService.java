package com.jtech.service;

import com.jtech.dto.request.AdminUserStatusRequest;
import com.jtech.dto.request.ChangeUserRoleRequest;
import com.jtech.dto.request.PreCreateUserRequest;
import com.jtech.dto.response.UserResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface AdminUserService {
    Page<UserResponse> getUsers(String search, Long roleId, String status, Pageable pageable);
    Page<UserResponse> getPendingUsers(Pageable pageable);
    UserResponse approveUser(Long userId);
    UserResponse rejectUser(Long userId);
    UserResponse updateUserStatus(Long userId, AdminUserStatusRequest request);
    UserResponse changeUserRole(Long userId, ChangeUserRoleRequest request, String currentUserEmail);
    void deleteUser(Long userId);
    UserResponse preCreateUser(PreCreateUserRequest request);
}