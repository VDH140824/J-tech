package com.jtech.service.impl;

import com.jtech.dto.request.AdminUserStatusRequest;
import com.jtech.dto.request.ChangeUserRoleRequest;
import com.jtech.dto.request.PreCreateUserRequest;
import com.jtech.dto.request.RejectUserRequest;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
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

    // UTCID01: Lọc người dùng theo email, vai trò và trạng thái ACTIVE.
    @Test
void UTCID01() {
    // Arrange: Chuẩn bị dữ liệu giả
    Pageable pageable = PageRequest.of(0, 10);

    user.setEmail("student@gmail.com");
    user.setStatus(UserStatus.ACTIVE);

    when(userRepository.findAdminUsers(
            "student@gmail.com", 2L, UserStatus.ACTIVE, pageable))
            .thenReturn(new PageImpl<>(List.of(user)));

    // Act: Gọi hàm Service
    Page<UserResponse> result = service.getUsers(
            "student@gmail.com", 2L, "ACTIVE", pageable);

    // Assert: Kiểm tra kết quả
    assertEquals(1, result.getTotalElements());
    assertEquals("student@gmail.com",
            result.getContent().get(0).getEmail());

    verify(userRepository).findAdminUsers(
            "student@gmail.com", 2L, UserStatus.ACTIVE, pageable);
}
    // UTCID02: Lấy danh sách người dùng khi không lọc theo trạng thái.
    @Test
void UTCID02() {
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
// UTCID03: Trả về trang rỗng khi không tìm thấy người dùng phù hợp.
@Test
void UTCID03() {
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

    // UTCID04: Chỉ lấy người dùng đang chờ duyệt.
    @Test
    void UTCID04() {
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

    // UTCID05: Trả về trang rỗng khi không có người dùng chờ duyệt.
    @Test
    void UTCID05() {
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

    // UTCID06: Duyệt người dùng và xóa lý do trạng thái cũ.
    @Test
    void UTCID06() {
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

    // UTCID07: Báo lỗi khi duyệt người dùng không tồn tại.
    @Test
    void UTCID07() {
        // Arrange
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        // Act
        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> service.approveUser(99L));

        // Assert
        assertEquals("Không tìm thấy người dùng với ID: 99", error.getMessage());
        verify(userRepository, never()).save(any(User.class));
    }

    // UTCID08: Từ chối người dùng với lý do và thời điểm xét duyệt.
    @Test
    void UTCID08() {
        // Arrange
        user.setStatus(UserStatus.PENDING);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);
        java.time.LocalDateTime before = java.time.LocalDateTime.now();

        // Act
        RejectUserRequest request = new RejectUserRequest();
        request.setStatusReason("Tài khoản không phải của sinh viên FPT");
        UserResponse result = service.rejectUser(1L, request);

        // Assert
        assertEquals("REJECTED", result.getStatus());
        assertEquals("Tài khoản không phải của sinh viên FPT", result.getStatusReason());
        assertNotNull(result.getReviewedAt());
        assertFalse(result.getReviewedAt().isBefore(before));
        verify(userRepository).save(user);
    }

    // UTCID09: Báo lỗi khi từ chối người dùng không tồn tại.
    @Test
    void UTCID09() {
        // Arrange
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        // Act
        RejectUserRequest request = new RejectUserRequest();
        request.setStatusReason("Tài khoản không phải của sinh viên FPT");
        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> service.rejectUser(99L, request));

        // Assert
        assertEquals("Không tìm thấy người dùng với ID: 99", error.getMessage());
        verify(userRepository, never()).save(any(User.class));
    }

    // UTCID10: Không cho từ chối khi lý do chỉ chứa khoảng trắng.
    @Test
    void UTCID10() {
        user.setStatus(UserStatus.PENDING);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        RejectUserRequest request = new RejectUserRequest();
        request.setStatusReason("  ");

        assertThrows(IllegalArgumentException.class, () -> service.rejectUser(1L, request));
        assertEquals(UserStatus.PENDING, user.getStatus());
        verify(userRepository, never()).save(any(User.class));
    }

    // UTCID11: Chấp nhận lý do từ chối dài đúng 100 ký tự.
    @Test
    void UTCID11() {
        user.setStatus(UserStatus.PENDING);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);
        String reason = "a".repeat(100);
        RejectUserRequest request = new RejectUserRequest();
        request.setStatusReason(reason);

        UserResponse result = service.rejectUser(1L, request);

        assertEquals("REJECTED", result.getStatus());
        assertEquals(reason, result.getStatusReason());
        verify(userRepository).save(user);
    }

    // UTCID12: Từ chối lý do dài hơn 100 ký tự và không lưu thay đổi.
    @Test
    void UTCID12() {
        user.setStatus(UserStatus.PENDING);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        RejectUserRequest request = new RejectUserRequest();
        request.setStatusReason("a".repeat(101));

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> service.rejectUser(1L, request));

        assertEquals("Lý do không được vượt quá 100 ký tự", error.getMessage());
        assertEquals(UserStatus.PENDING, user.getStatus());
        verify(userRepository, never()).save(any(User.class));
    }

    // UTCID13: Khóa người dùng, cắt khoảng trắng ở lý do và ghi thời điểm xét duyệt.
    @Test
    void UTCID13() {
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

    // UTCID14: Mở lại tài khoản và xóa lý do khóa cũ.
    @Test
    void UTCID14() {
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

    // UTCID15: Không cho khóa người dùng khi thiếu lý do.
    @Test
    void UTCID15() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        AdminUserStatusRequest request = new AdminUserStatusRequest("LOCKED");

        assertThrows(IllegalArgumentException.class, () -> service.updateUserStatus(1L, request));
        assertEquals(UserStatus.ACTIVE, user.getStatus());
        verify(userRepository, never()).save(any(User.class));
    }

    // UTCID16: Chấp nhận lý do khóa dài đúng 100 ký tự.
    @Test
    void UTCID16() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);
        String reason = "a".repeat(100);
        AdminUserStatusRequest request = new AdminUserStatusRequest("LOCKED");
        request.setStatusReason(reason);

        UserResponse result = service.updateUserStatus(1L, request);

        assertEquals("LOCKED", result.getStatus());
        assertEquals(reason, result.getStatusReason());
        verify(userRepository).save(user);
    }

    // UTCID17: Từ chối lý do khóa dài hơn 100 ký tự.
    @Test
    void UTCID17() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        AdminUserStatusRequest request = new AdminUserStatusRequest("LOCKED");
        request.setStatusReason("a".repeat(101));

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> service.updateUserStatus(1L, request));

        assertEquals("Lý do không được vượt quá 100 ký tự", error.getMessage());
        assertEquals(UserStatus.ACTIVE, user.getStatus());
        verify(userRepository, never()).save(any(User.class));
    }

    // UTCID18: Chấp nhận lý do đổi sang REJECTED dài đúng 100 ký tự.
    @Test
    void UTCID18() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);
        String reason = "a".repeat(100);
        AdminUserStatusRequest request = new AdminUserStatusRequest("REJECTED");
        request.setStatusReason(reason);

        UserResponse result = service.updateUserStatus(1L, request);

        assertEquals("REJECTED", result.getStatus());
        assertEquals(reason, result.getStatusReason());
        verify(userRepository).save(user);
    }

    // UTCID19: Từ chối lý do đổi sang REJECTED dài hơn 100 ký tự.
    @Test
    void UTCID19() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        AdminUserStatusRequest request = new AdminUserStatusRequest("REJECTED");
        request.setStatusReason("a".repeat(101));

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> service.updateUserStatus(1L, request));

        assertEquals("Lý do không được vượt quá 100 ký tự", error.getMessage());
        assertEquals(UserStatus.ACTIVE, user.getStatus());
        verify(userRepository, never()).save(any(User.class));
    }

    // UTCID20: Đổi vai trò người dùng sang MODERATOR.
    @Test
    void UTCID20() {
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

    // UTCID21: Đổi vai trò người dùng sang ADMIN.
    @Test
    void UTCID21() {
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

    // UTCID22: Ngăn admin tự đổi vai trò của chính mình.
    @Test
    void UTCID22() {
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

    // UTCID23: Xóa người dùng khi ID tồn tại.
    @Test
    void UTCID23() {
        // Arrange
        when(userRepository.existsById(1L)).thenReturn(true);

        // Act
        service.deleteUser(1L);

        // Assert
        verify(userRepository).existsById(1L);
        verify(userRepository).deleteById(1L);
    }

    // UTCID24: Báo lỗi và không xóa khi ID người dùng không tồn tại.
    @Test
    void UTCID24() {
        // Arrange
        when(userRepository.existsById(99L)).thenReturn(false);

        // Act
        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> service.deleteUser(99L));

        // Assert
        assertEquals("Không tìm thấy người dùng với ID: 99", error.getMessage());
        verify(userRepository, never()).deleteById(anyLong());
    }

    // UTCID25: Tạo trước tài khoản MODERATOR với trạng thái ACTIVE và số xu bằng 0.
    @Test
    void UTCID25() {
        // Arrange
        PreCreateUserRequest request = preCreateRequest("moderator@example.com", "MODERATOR");
        Role moderator = role("MODERATOR");
        when(userRepository.findByEmail("moderator@example.com")).thenReturn(Optional.empty());
        when(roleRepository.findByRoleName("MODERATOR")).thenReturn(Optional.of(moderator));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        UserResponse result = service.preCreateUser(request);

        // Assert
        assertEquals("ACTIVE", result.getStatus());
        assertEquals("MODERATOR", result.getRole());
        assertEquals("moderator@example.com", result.getEmail());
        assertEquals(0, result.getCoinBalance());
        assertEquals("moderator", result.getFullName());
        verify(userRepository).save(any(User.class));
    }


    // UTCID26: Chuẩn hóa email bằng cách bỏ khoảng trắng ngoài và chuyển thành chữ thường.
    @Test
    void UTCID26() {
        // Arrange
        PreCreateUserRequest request = preCreateRequest("  NEW@EXAMPLE.COM  ", "MODERATOR");
        when(userRepository.findByEmail("new@example.com")).thenReturn(Optional.empty());
        when(roleRepository.findByRoleName("MODERATOR")).thenReturn(Optional.of(role("MODERATOR")));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        UserResponse result = service.preCreateUser(request);

        // Assert
        assertEquals("new@example.com", result.getEmail());
        assertEquals("MODERATOR", result.getRole());
        assertEquals("ACTIVE", result.getStatus());
        verify(userRepository).findByEmail("new@example.com");
        ArgumentCaptor<User> savedUser = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(savedUser.capture());
        assertEquals("new@example.com", savedUser.getValue().getEmail());
    }

    // UTCID27: Từ chối tạo tài khoản khi email đã tồn tại.
    @Test
    void UTCID27() {
        // Arrange
        PreCreateUserRequest request = preCreateRequest("moderator@example.com", "MODERATOR");
        user.setEmail("moderator@example.com");
        when(userRepository.findByEmail("moderator@example.com")).thenReturn(Optional.of(user));

        // Act
        IllegalStateException error = assertThrows(IllegalStateException.class,
                () -> service.preCreateUser(request));

        // Assert
        assertEquals("Email đã tồn tại trong hệ thống: moderator@example.com", error.getMessage());
        verifyNoInteractions(roleRepository);
        verify(userRepository, never()).save(any(User.class));
    }

    // UTCID28: Cắt tên tạo từ email xuống tối đa 50 ký tự.
    @Test
    void UTCID28() {
        // Arrange
        String localPart = "a".repeat(51);
        String email = localPart + "@example.com";
        PreCreateUserRequest request = preCreateRequest(email, "MODERATOR");
        when(userRepository.findByEmail(email)).thenReturn(Optional.empty());
        when(roleRepository.findByRoleName("MODERATOR")).thenReturn(Optional.of(role("MODERATOR")));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        UserResponse result = service.preCreateUser(request);

        // Assert
        assertEquals(50, result.getFullName().length());
        assertEquals("a".repeat(50), result.getFullName());
        assertEquals("MODERATOR", result.getRole());
        assertEquals("ACTIVE", result.getStatus());
        verify(userRepository).save(any(User.class));
    }

    // UTCID29: Chấp nhận email dài đúng 255 ký tự.
    @Test
    void UTCID29() {
        String suffix = "@example.com";
        String email = "a".repeat(255 - suffix.length()) + suffix;
        PreCreateUserRequest request = preCreateRequest(email, "MODERATOR");
        Role moderator = role("MODERATOR");
        when(userRepository.findByEmail(email)).thenReturn(Optional.empty());
        when(roleRepository.findByRoleName("MODERATOR")).thenReturn(Optional.of(moderator));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserResponse result = service.preCreateUser(request);

        assertEquals(255, email.length());
        assertEquals(email, result.getEmail());
        assertEquals("MODERATOR", result.getRole());
        assertEquals("ACTIVE", result.getStatus());
        verify(userRepository).save(any(User.class));
    }

    // UTCID30: Từ chối email dài hơn 255 ký tự.
    @Test
    void UTCID30() {
        String suffix = "@example.com";
        String email = "a".repeat(256 - suffix.length()) + suffix;
        PreCreateUserRequest request = preCreateRequest(email, "MODERATOR");

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> service.preCreateUser(request));

        assertEquals(256, email.length());
        assertEquals("Email không được vượt quá 255 ký tự", error.getMessage());
        verifyNoInteractions(userRepository, roleRepository);
    }

    // UTCID31: Từ chối email thiếu ký tự @.
    @Test
    void UTCID31() {
        // Arrange
        PreCreateUserRequest request = preCreateRequest("usergmail.com", "MODERATOR");

        // Act
        assertThrows(IllegalArgumentException.class, () -> service.preCreateUser(request));

        // Assert
        verifyNoInteractions(userRepository, roleRepository);
    }

    // UTCID32: Từ chối email thiếu phần tên trước @.
    @Test
    void UTCID32() {
        // Arrange
        PreCreateUserRequest request = preCreateRequest("@gmail.com", "MODERATOR");

        // Act
        assertThrows(IllegalArgumentException.class, () -> service.preCreateUser(request));

        // Assert
        verifyNoInteractions(userRepository, roleRepository);
    }

    // UTCID33: Từ chối email thiếu tên miền hoặc phần mở rộng tên miền.
    @Test
    void UTCID33() {
        // Arrange
        PreCreateUserRequest noDomain = preCreateRequest("user@", "MODERATOR");
        PreCreateUserRequest noDomainSuffix = preCreateRequest("user@gmail", "MODERATOR");

        // Act
        assertThrows(IllegalArgumentException.class, () -> service.preCreateUser(noDomain));
        assertThrows(IllegalArgumentException.class, () -> service.preCreateUser(noDomainSuffix));

        // Assert
        verifyNoInteractions(userRepository, roleRepository);
    }

    // UTCID34: Từ chối email chứa nhiều ký tự @.
    @Test
    void UTCID34() {
        // Arrange
        PreCreateUserRequest request = preCreateRequest("user@@gmail.com", "MODERATOR");

        // Act
        assertThrows(IllegalArgumentException.class, () -> service.preCreateUser(request));

        // Assert
        verifyNoInteractions(userRepository, roleRepository);
    }

    // UTCID35: Từ chối email chứa khoảng trắng bên trong.
    @Test
    void UTCID35() {
        // Arrange
        PreCreateUserRequest request = preCreateRequest("user name@gmail.com", "MODERATOR");

        // Act
        assertThrows(IllegalArgumentException.class, () -> service.preCreateUser(request));

        // Assert
        verifyNoInteractions(userRepository, roleRepository);
    }

    // UTCID36: Từ chối email có tên miền chứa hai dấu chấm liên tiếp.
    @Test
    void UTCID36() {
        // Arrange
        PreCreateUserRequest request = preCreateRequest("user@gmail..com", "MODERATOR");

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
