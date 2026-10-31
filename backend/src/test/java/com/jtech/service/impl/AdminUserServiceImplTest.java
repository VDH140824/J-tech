package com.jtech.service.impl;

import com.jtech.dto.request.AdminUserStatusRequest;
import com.jtech.dto.request.ChangeUserRoleRequest;
import com.jtech.dto.request.PreCreateUserRequest;
import com.jtech.dto.response.UserResponse;
import com.jtech.entity.Role;
import com.jtech.entity.User;
import com.jtech.entity.UserStatus;
import com.jtech.repository.RoleRepository;
import com.jtech.repository.UserRepository;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminUserServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @InjectMocks
    private AdminUserServiceImpl service;

    private User user;

    @BeforeEach
    void setUp() {
        Role role = new Role();
        role.setRoleId(2L);
        role.setRoleName("STUDENT");

        user = new User();
        user.setUserId(1L);
        user.setEmail("student@example.com");
        user.setRole(role);
        user.setStatus(UserStatus.ACTIVE);
    }

    @Test
    void getUsers_success() {
        // Arrange: Chuẩn bị dữ liệu giả
        Pageable pageable = PageRequest.of(0, 10);

        when(userRepository.findAdminUsers(
                "student", 2L, UserStatus.ACTIVE, pageable))
                .thenReturn(new PageImpl<>(List.of(user)));

        // Act: Gọi method cần test
        Page<UserResponse> result =
                service.getUsers("student", 2L, "active", pageable);

        // Assert: Kiểm tra kết quả
        assertEquals(1, result.getTotalElements());
        assertEquals("student@example.com",
                result.getContent().get(0).getEmail());

        verify(userRepository).findAdminUsers(
                "student", 2L, UserStatus.ACTIVE, pageable);
    }
    @Test
void getUsers_allStatus() {
    // Arrange: Admin chọn All Status (không lọc trạng thái)
    Pageable pageable = PageRequest.of(0, 10);

    when(userRepository.findAdminUsers(
            null, null, null, pageable))
            .thenReturn(new PageImpl<>(List.of(user)));

    // Act: Gọi hàm getUsers với statusStr = null
    Page<UserResponse> result =
            service.getUsers(null, null, null, pageable);

    // Assert: Kiểm tra kết quả
    assertEquals(1, result.getTotalElements());

    assertEquals(user.getEmail(),
            result.getContent().get(0).getEmail());

    verify(userRepository).findAdminUsers(
            null, null, null, pageable);
}
@Test
void getUsers_empty() {
    // Arrange
    Pageable pageable = PageRequest.of(0, 10);

    when(userRepository.findAdminUsers(
            "nonexistent", null, UserStatus.ACTIVE, pageable))
            .thenReturn(Page.empty(pageable));

    // Act
    Page<UserResponse> result =
            service.getUsers("nonexistent", null, "ACTIVE", pageable);

    // Assert
    assertEquals(0, result.getTotalElements());
    assertTrue(result.getContent().isEmpty());
}

    @Test
    void getPendingUsers_success() {
        // Arrange
        user.setStatus(UserStatus.PENDING);
        Pageable pageable = PageRequest.of(0, 10);
        when(userRepository.findAdminUsers(null, null, UserStatus.PENDING, pageable))
                .thenReturn(new PageImpl<>(List.of(user)));

        // Act
        Page<UserResponse> result = service.getPendingUsers(pageable);

        // Assert
        assertEquals(1, result.getTotalElements());
        assertEquals("PENDING", result.getContent().get(0).getStatus());
        assertEquals(user.getEmail(), result.getContent().get(0).getEmail());
        verify(userRepository).findAdminUsers(null, null, UserStatus.PENDING, pageable);
    }

    @Test
    void getPendingUsers_empty() {
        // Arrange
        Pageable pageable = PageRequest.of(0, 10);
        when(userRepository.findAdminUsers(null, null, UserStatus.PENDING, pageable))
                .thenReturn(Page.empty(pageable));

        // Act
        Page<UserResponse> result = service.getPendingUsers(pageable);

        // Assert
        assertEquals(0, result.getTotalElements());
        assertTrue(result.isEmpty());
        verify(userRepository).findAdminUsers(null, null, UserStatus.PENDING, pageable);
    }

    @Test
    void approveUser_success() {
        // Arrange
        user.setStatus(UserStatus.PENDING);
        user.setStatusReason("Awaiting review");
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);
        java.time.LocalDateTime before = java.time.LocalDateTime.now();

        // Act
        UserResponse result = service.approveUser(1L);

        // Assert
        assertEquals("ACTIVE", result.getStatus());
        assertNull(result.getStatusReason());
        assertNotNull(result.getReviewedAt());
        assertFalse(result.getReviewedAt().isBefore(before));
        verify(userRepository).save(user);
    }

    @Test
    void approveUser_notFound() {
        // Arrange
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        // Act
        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> service.approveUser(99L));

        // Assert
        assertEquals("Không tìm thấy người dùng với ID: 99", error.getMessage());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void rejectUser_success() {
        // Arrange
        user.setStatus(UserStatus.PENDING);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);
        java.time.LocalDateTime before = java.time.LocalDateTime.now();

        // Act
        UserResponse result = service.rejectUser(1L);

        // Assert
        assertEquals("REJECTED", result.getStatus());
        assertNotNull(result.getReviewedAt());
        assertFalse(result.getReviewedAt().isBefore(before));
        verify(userRepository).save(user);
    }

    @Test
    void rejectUser_notFound() {
        // Arrange
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        // Act
        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> service.rejectUser(99L));

        // Assert
        assertEquals("Không tìm thấy người dùng với ID: 99", error.getMessage());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void updateUserStatus_success() {
        // Arrange
        AdminUserStatusRequest request = new AdminUserStatusRequest("LOCKED");
        request.setStatusReason("  Vi phạm quy định  ");
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);
        java.time.LocalDateTime before = java.time.LocalDateTime.now();

        // Act
        UserResponse result = service.updateUserStatus(1L, request);

        // Assert
        assertEquals("LOCKED", result.getStatus());
        assertEquals("Vi phạm quy định", result.getStatusReason());
        assertNotNull(result.getReviewedAt());
        assertFalse(result.getReviewedAt().isBefore(before));
        verify(userRepository).save(user);
    }

    @Test
    void updateUserStatus_active() {
        // Arrange
        user.setStatus(UserStatus.LOCKED);
        user.setStatusReason("Old reason");
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);
        AdminUserStatusRequest request = new AdminUserStatusRequest("ACTIVE");

        // Act
        UserResponse result = service.updateUserStatus(1L, request);

        // Assert
        assertEquals("ACTIVE", result.getStatus());
        assertNull(result.getStatusReason());
        verify(userRepository).save(user);
    }

    @Test
    void changeUserRole_success() {
        // Arrange
        Role moderator = role("MODERATOR");
        ChangeUserRoleRequest request = roleRequest("MODERATOR");
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(roleRepository.findByRoleName("MODERATOR")).thenReturn(Optional.of(moderator));
        when(userRepository.save(user)).thenReturn(user);

        // Act
        UserResponse result = service.changeUserRole(1L, request, "admin@example.com");

        // Assert
        assertEquals("MODERATOR", result.getRole());
        verify(roleRepository).findByRoleName("MODERATOR");
        verify(userRepository).save(user);
    }

    @Test
    void changeUserRole_admin() {
        // Arrange
        Role admin = role("ADMIN");
        ChangeUserRoleRequest request = roleRequest("ADMIN");
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(roleRepository.findByRoleName("ADMIN")).thenReturn(Optional.of(admin));
        when(userRepository.save(user)).thenReturn(user);

        // Act
        UserResponse result = service.changeUserRole(1L, request, "other-admin@example.com");

        // Assert
        assertEquals("ADMIN", result.getRole());
        verify(roleRepository).findByRoleName("ADMIN");
        verify(userRepository).save(user);
    }

    @Test
    void changeUserRole_selfChange() {
        // Arrange
        ChangeUserRoleRequest request = roleRequest("ADMIN");
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        // Act
        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> service.changeUserRole(1L, request, "STUDENT@EXAMPLE.COM"));

        // Assert
        assertEquals("Admin không thể tự thay đổi role của chính mình.", error.getMessage());
        verifyNoInteractions(roleRepository);
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void deleteUser_success() {
        // Arrange
        when(userRepository.existsById(1L)).thenReturn(true);

        // Act
        service.deleteUser(1L);

        // Assert
        verify(userRepository).existsById(1L);
        verify(userRepository).deleteById(1L);
    }

    @Test
    void deleteUser_notFound() {
        // Arrange
        when(userRepository.existsById(99L)).thenReturn(false);

        // Act
        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> service.deleteUser(99L));

        // Assert
        assertEquals("Không tìm thấy người dùng với ID: 99", error.getMessage());
        verify(userRepository, never()).deleteById(anyLong());
    }

    @Test
    void preCreateUser_success() {
        // Arrange
        PreCreateUserRequest request = preCreateRequest("new@example.com", "STUDENT");
        Role student = user.getRole();
        when(userRepository.findByEmail("new@example.com")).thenReturn(Optional.empty());
        when(roleRepository.findByRoleName("STUDENT")).thenReturn(Optional.of(student));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        UserResponse result = service.preCreateUser(request);

        // Assert
        assertEquals("ACTIVE", result.getStatus());
        assertEquals("STUDENT", result.getRole());
        assertEquals(0, result.getCoinBalance());
        assertEquals("new", result.getFullName());
        verify(userRepository).save(any(User.class));
    }

    @Test
    void preCreateUser_admin() {
        // Arrange
        PreCreateUserRequest request = preCreateRequest("admin@example.com", "ADMIN");
        Role admin = role("ADMIN");
        when(userRepository.findByEmail("admin@example.com")).thenReturn(Optional.empty());
        when(roleRepository.findByRoleName("ADMIN")).thenReturn(Optional.of(admin));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        UserResponse result = service.preCreateUser(request);

        // Assert
        assertEquals("ADMIN", result.getRole());
        assertEquals("ACTIVE", result.getStatus());
        verify(userRepository).save(any(User.class));
    }

    @Test
    void preCreateUser_normalizeEmail() {
        // Arrange
        PreCreateUserRequest request = preCreateRequest("  NEW@EXAMPLE.COM  ", "STUDENT");
        when(userRepository.findByEmail("new@example.com")).thenReturn(Optional.empty());
        when(roleRepository.findByRoleName("STUDENT")).thenReturn(Optional.of(user.getRole()));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        UserResponse result = service.preCreateUser(request);

        // Assert
        assertEquals("new@example.com", result.getEmail());
        verify(userRepository).findByEmail("new@example.com");
        ArgumentCaptor<User> savedUser = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(savedUser.capture());
        assertEquals("new@example.com", savedUser.getValue().getEmail());
    }

    @Test
    void preCreateUser_duplicateEmail() {
        // Arrange
        PreCreateUserRequest request = preCreateRequest("student@example.com", "STUDENT");
        when(userRepository.findByEmail("student@example.com")).thenReturn(Optional.of(user));

        // Act
        IllegalStateException error = assertThrows(IllegalStateException.class,
                () -> service.preCreateUser(request));

        // Assert
        assertEquals("Email đã tồn tại trong hệ thống: student@example.com", error.getMessage());
        verifyNoInteractions(roleRepository);
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void preCreateUser_longName() {
        // Arrange
        String localPart = "a".repeat(51);
        String email = localPart + "@example.com";
        PreCreateUserRequest request = preCreateRequest(email, "STUDENT");
        when(userRepository.findByEmail(email)).thenReturn(Optional.empty());
        when(roleRepository.findByRoleName("STUDENT")).thenReturn(Optional.of(user.getRole()));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        UserResponse result = service.preCreateUser(request);

        // Assert
        assertEquals(50, result.getFullName().length());
        assertEquals("a".repeat(50), result.getFullName());
        verify(userRepository).save(any(User.class));
    }

    @Test
    void preCreateUser_missingAtSign() {
        // Arrange
        PreCreateUserRequest request = preCreateRequest("usergmail.com", "STUDENT");

        // Act
        assertThrows(IllegalArgumentException.class, () -> service.preCreateUser(request));

        // Assert
        verifyNoInteractions(userRepository, roleRepository);
    }

    @Test
    void preCreateUser_missingLocalPart() {
        // Arrange
        PreCreateUserRequest request = preCreateRequest("@gmail.com", "STUDENT");

        // Act
        assertThrows(IllegalArgumentException.class, () -> service.preCreateUser(request));

        // Assert
        verifyNoInteractions(userRepository, roleRepository);
    }

    @Test
    void preCreateUser_missingDomain() {
        // Arrange
        PreCreateUserRequest noDomain = preCreateRequest("user@", "STUDENT");
        PreCreateUserRequest noDomainSuffix = preCreateRequest("user@gmail", "STUDENT");

        // Act
        assertThrows(IllegalArgumentException.class, () -> service.preCreateUser(noDomain));
        assertThrows(IllegalArgumentException.class, () -> service.preCreateUser(noDomainSuffix));

        // Assert
        verifyNoInteractions(userRepository, roleRepository);
    }

    @Test
    void preCreateUser_multipleAtSigns() {
        // Arrange
        PreCreateUserRequest request = preCreateRequest("user@@gmail.com", "STUDENT");

        // Act
        assertThrows(IllegalArgumentException.class, () -> service.preCreateUser(request));

        // Assert
        verifyNoInteractions(userRepository, roleRepository);
    }

    @Test
    void preCreateUser_emailWithSpaces() {
        // Arrange
        PreCreateUserRequest request = preCreateRequest("user name@gmail.com", "STUDENT");

        // Act
        assertThrows(IllegalArgumentException.class, () -> service.preCreateUser(request));

        // Assert
        verifyNoInteractions(userRepository, roleRepository);
    }

    @Test
    void preCreateUser_invalidDomain() {
        // Arrange
        PreCreateUserRequest request = preCreateRequest("user@gmail..com", "STUDENT");

        // Act
        assertThrows(IllegalArgumentException.class, () -> service.preCreateUser(request));

        // Assert
        verifyNoInteractions(userRepository, roleRepository);
    }

    private Role role(String roleName) {
        Role role = new Role();
        role.setRoleName(roleName);
        return role;
    }

    private ChangeUserRoleRequest roleRequest(String roleName) {
        ChangeUserRoleRequest request = new ChangeUserRoleRequest();
        request.setRole(roleName);
        return request;
    }

    private PreCreateUserRequest preCreateRequest(String email, String roleName) {
        PreCreateUserRequest request = new PreCreateUserRequest();
        request.setEmail(email);
        request.setRole(roleName);
        return request;
    }
}
