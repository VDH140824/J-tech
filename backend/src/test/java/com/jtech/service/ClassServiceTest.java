package com.jtech.service;

import com.jtech.entity.Role;
import com.jtech.dto.request.ClassRequest;
import com.jtech.entity.Classroom;
import com.jtech.entity.ClassroomStatus;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.dao.DataIntegrityViolationException;
import com.jtech.entity.User;
import com.jtech.entity.UserStatus;
import com.jtech.repository.ClassRepository;
import com.jtech.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.List;
import java.util.Optional;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ClassServiceTest {
    @Mock EntityManager entityManager;
    @Mock ClassRepository classRepository;
    @Mock UserRepository userRepository;
    @InjectMocks ClassService service;
    private User moderator;

    private Classroom prepareUpdate() {
        Classroom classroom = new Classroom();
        classroom.setId(10L);
        classroom.setCode("OLD_CODE");
        classroom.setModeratorId(12L);
        classroom.setStatus(ClassroomStatus.ACTIVE);
        classroom.setCreatedAt(LocalDateTime.of(2026, 1, 1, 9, 0));
        when(userRepository.findByEmail("mod@example.com")).thenReturn(Optional.of(moderator));
        when(classRepository.findById(10L)).thenReturn(Optional.of(classroom));
        return classroom;
    }

    //deleteClass_success
    @Test
    void UTCID01() {
        var classroom = prepareUpdate();

        service.deleteClass(10L);

        verify(classRepository).countStudents(10L);
        verify(classRepository).countPosts(10L);
        verify(classRepository).delete(classroom);
        verify(classRepository).flush();
    }

    //deleteClass_hasMembers
    @Test
    void UTCID02() {
        prepareUpdate();
        when(classRepository.countStudents(10L)).thenReturn(1L);

        var error = assertThrows(IllegalStateException.class, () -> service.deleteClass(10L));

        assertEquals("Không thể xóa lớp đang có học sinh.", error.getMessage());
        verify(classRepository, never()).countPosts(any());
        verify(classRepository, never()).delete(any());
    }

    //deleteClass_hasPosts
    @Test
    void UTCID03() {
        prepareUpdate();
        when(classRepository.countPosts(10L)).thenReturn(1L);

        var error = assertThrows(IllegalStateException.class, () -> service.deleteClass(10L));

        assertEquals("Không thể xóa lớp đang có bài đăng.", error.getMessage());
        verify(classRepository, never()).delete(any());
    }

    //deleteClass_deleteFailed
    @Test
    void UTCID04() {
        var classroom = prepareUpdate();
        doThrow(new DataIntegrityViolationException("Storage error"))
                .when(classRepository).flush();

        assertThrows(DataIntegrityViolationException.class, () -> service.deleteClass(10L));
        verify(classRepository).delete(classroom);
    }

    //updateClass_success
    @Test
    void UTCID05() {
        var classroom = prepareUpdate();
        when(classRepository.countStudents(10L)).thenReturn(32L);
        var result = service.updateClass(10L, new ClassRequest(" NEW_CODE ", " Mô tả ", "CLOSED"));
        assertEquals("NEW_CODE", result.code());
        assertEquals("Mô tả", result.description());
        assertEquals(ClassroomStatus.CLOSED, result.status());
        assertEquals(32, result.studentCount());
        assertEquals(12L, result.moderatorId());
        assertEquals(LocalDateTime.of(2026, 1, 1, 9, 0), result.createdAt());
        assertNotNull(classroom.getUpdatedAt());
        verify(classRepository).saveAndFlush(classroom);
    }

    //updateClass_sameCode
    @Test
    void UTCID06() {
        var classroom = prepareUpdate();
        service.updateClass(10L, new ClassRequest("OLD_CODE", null, "ACTIVE"));
        verify(classRepository).existsByCodeAndIdNot("OLD_CODE", 10L);
        verify(classRepository).saveAndFlush(classroom);
    }

    //updateClass_duplicateCode
    @Test
    void UTCID07() {
        var classroom = prepareUpdate();
        when(classRepository.existsByCodeAndIdNot("OTHER", 10L)).thenReturn(true);
        assertThrows(IllegalStateException.class,
                () -> service.updateClass(10L, new ClassRequest("OTHER", null, "ACTIVE")));
        assertEquals("OLD_CODE", classroom.getCode());
        verify(classRepository, never()).saveAndFlush(any());
    }

    //updateClass_invalidCode
    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "JP N5", "JP@N5", "A234567890123456789012345678901"})
    void UTCID08(String code) {
        prepareUpdate();
        assertThrows(IllegalArgumentException.class,
                () -> service.updateClass(10L, new ClassRequest(code, null, "ACTIVE")));
        verify(classRepository, never()).saveAndFlush(any());
    }

    //updateClass_descriptionTooLong
    @Test
    void UTCID09() {
        prepareUpdate();
        assertThrows(IllegalArgumentException.class,
                () -> service.updateClass(10L, new ClassRequest("OLD_CODE", "a".repeat(101), "ACTIVE")));
        verify(classRepository, never()).saveAndFlush(any());
    }

    //updateClass_descriptionMaxLength
    @Test
    void UTCID10() {
        var classroom = prepareUpdate();
        var description = "a".repeat(100);

        var result = service.updateClass(10L, new ClassRequest("OLD_CODE", description, "ACTIVE"));

        assertEquals(description, result.description());
        verify(classRepository).saveAndFlush(classroom);
    }

    //updateClass_emptyDescription
    @Test
    void UTCID11() {
        prepareUpdate();
        assertNull(service.updateClass(10L, new ClassRequest("OLD_CODE", "   ", "ACTIVE")).description());
    }

    //updateClass_invalidStatus
    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"INVALID", "active"})
    void UTCID12(String status) {
        prepareUpdate();
        assertThrows(IllegalArgumentException.class,
                () -> service.updateClass(10L, new ClassRequest("OLD_CODE", null, status)));
        verify(classRepository, never()).saveAndFlush(any());
    }

    //updateClass_saveFailed
    @Test
    void UTCID13() {
        prepareUpdate();
        when(classRepository.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("Storage error"));
        assertThrows(DataIntegrityViolationException.class,
                () -> service.updateClass(10L, new ClassRequest("OLD_CODE", null, "ACTIVE")));
        verify(classRepository, never()).countStudents(any());
    }

    //createClass_success
    @Test
    void UTCID14() {
        when(userRepository.findByEmail("mod@example.com")).thenReturn(Optional.of(moderator));
        var result = service.createClass(new ClassRequest(" JP_N5-01 ", " Mô tả ", "ARCHIVED"));
        var saved = org.mockito.ArgumentCaptor.forClass(Classroom.class);
        verify(classRepository).saveAndFlush(saved.capture());
        assertEquals("JP_N5-01", saved.getValue().getCode());
        assertEquals(12L, saved.getValue().getModeratorId());
        assertEquals(ClassroomStatus.ARCHIVED, result.status());
        assertEquals("Mô tả", result.description());
        assertEquals(0, result.studentCount());
        verify(entityManager).refresh(saved.getValue());
    }

    //createClass_invalidCode
    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   ", "JP N5", "JP/N5", "JP@N5", "Lớp", "ABCDEFGHIJKLMNOPQRSTUVWXYZ12345"})
    void UTCID15(String code) {
        assertThrows(IllegalArgumentException.class, () -> service.createClass(new ClassRequest(code, null, "ACTIVE")));
        verifyNoInteractions(classRepository);
    }

    //createClass_descriptionTooLong
    @Test
    void UTCID16() {
        assertThrows(IllegalArgumentException.class,
                () -> service.createClass(new ClassRequest("JP_N5", "a".repeat(101), "ACTIVE")));
        verifyNoInteractions(classRepository);
    }

    //createClass_maxLength
    @Test
    void UTCID17() {
        when(userRepository.findByEmail("mod@example.com")).thenReturn(Optional.of(moderator));
        var result = service.createClass(new ClassRequest("A".repeat(30), "a".repeat(100), "ACTIVE"));
        assertEquals(30, result.code().length());
        assertEquals(100, result.description().length());
    }

    //createClass_emptyDescription
    @Test
    void UTCID18() {
        when(userRepository.findByEmail("mod@example.com")).thenReturn(Optional.of(moderator));
        assertNull(service.createClass(new ClassRequest("JP_N5", "   ", "ACTIVE")).description());
    }

    //createClass_duplicateCode
    @Test
    void UTCID19() {
        when(userRepository.findByEmail("mod@example.com")).thenReturn(Optional.of(moderator));
        when(classRepository.existsByCode("JP_N5")).thenReturn(true);
        assertThrows(IllegalStateException.class, () -> service.createClass(new ClassRequest("JP_N5", null, "ACTIVE")));
        verify(classRepository, never()).saveAndFlush(any());
    }

    //createClass_duplicateOnSave
    @Test
    void UTCID20() {
        when(userRepository.findByEmail("mod@example.com")).thenReturn(Optional.of(moderator));
        when(classRepository.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("Duplicate key uq_classroom_code"));
        assertThrows(IllegalStateException.class, () -> service.createClass(new ClassRequest("JP_N5", null, "ACTIVE")));
        verifyNoInteractions(entityManager);
    }

    //createClass_saveFailed
    @Test
    void UTCID21() {
        when(userRepository.findByEmail("mod@example.com")).thenReturn(Optional.of(moderator));
        when(classRepository.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("Storage error"));
        assertThrows(DataIntegrityViolationException.class, () -> service.createClass(new ClassRequest("JP_N5", null, "ACTIVE")));
        verifyNoInteractions(entityManager);
    }

    //createClass_invalidStatus
    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"INVALID", "active", " "})
    void UTCID22(String status) {
        assertThrows(IllegalArgumentException.class,
                () -> service.createClass(new ClassRequest("JP_N5", null, status)));
        verifyNoInteractions(classRepository);
    }

    @BeforeEach
    void setUp() {
        Role role = new Role();
        role.setRoleName("MODERATOR");
        moderator = new User();
        moderator.setUserId(12L);
        moderator.setRole(role);
        moderator.setStatus(UserStatus.ACTIVE);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("mod@example.com", null, List.of()));
    }

    @AfterEach
    void clearContext() { SecurityContextHolder.clearContext(); }

    //getClassesByCurrentModerator_success
    @Test
    void UTCID23() {
        when(userRepository.findByEmail("mod@example.com")).thenReturn(Optional.of(moderator));
        var createdAt = Timestamp.valueOf(LocalDateTime.of(2026, 11, 2, 9, 0));
        Object[] emptyClass = {1L, "EMPTY", 12L, null, "ACTIVE", createdAt, 0L};
        Object[] populatedClass = {2L, "FULL", 12L, null, "CLOSED", createdAt, 32L};
        when(classRepository.findByModeratorId(12L)).thenReturn(List.of(emptyClass, populatedClass));

        var result = service.getClassesByCurrentModerator();

        assertEquals(2, result.size());
        assertEquals("EMPTY", result.get(0).code());
        assertEquals(0L, result.get(0).studentCount());
        assertEquals(32L, result.get(1).studentCount());
        assertEquals("CLOSED", result.get(1).status().name());
        verify(classRepository).findByModeratorId(12L);
        verifyNoMoreInteractions(classRepository);
    }

    //getClassesByCurrentModerator_empty
    @Test
    void UTCID24() {
        when(userRepository.findByEmail("mod@example.com")).thenReturn(Optional.of(moderator));
        when(classRepository.findByModeratorId(12L)).thenReturn(List.of());
        assertTrue(service.getClassesByCurrentModerator().isEmpty());
    }

    //getClassesByCurrentModerator_inactiveUser
    @Test
    void UTCID25() {
        moderator.setStatus(UserStatus.LOCKED);
        when(userRepository.findByEmail("mod@example.com")).thenReturn(Optional.of(moderator));
        assertThrows(AccessDeniedException.class, service::getClassesByCurrentModerator);
        verifyNoInteractions(classRepository);
    }

    //getClassesByCurrentModerator_notModerator
    @Test
    void UTCID26() {
        moderator.getRole().setRoleName("STUDENT");
        when(userRepository.findByEmail("mod@example.com")).thenReturn(Optional.of(moderator));
        assertThrows(AccessDeniedException.class, service::getClassesByCurrentModerator);
        verifyNoInteractions(classRepository);
    }
}
