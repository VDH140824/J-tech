package com.jtech.repository;

import com.jtech.entity.User;
import com.jtech.entity.UserStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    @EntityGraph(attributePaths = {"role"})
    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByPhone(String phone);

    @Query("SELECT u FROM User u WHERE u.userId <> :currentUserId AND (LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%')) OR u.phone = :query)")
    java.util.List<User> searchChatUsers(@Param("query") String query, @Param("currentUserId") Long currentUserId, Pageable pageable);

    long countByStatus(UserStatus status);

    @EntityGraph(attributePaths = {"role"})
    @Query("SELECT u FROM User u WHERE " +
           "(:search IS NULL OR :search = '' OR LOWER(u.displayName) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))) AND " +
           "(:roleId IS NULL OR u.role.roleId = :roleId) AND " +
           "(:status IS NULL OR u.status = :status)")
    Page<User> findAdminUsers(@Param("search") String search,
                              @Param("roleId") Long roleId,
                              @Param("status") UserStatus status,
                              Pageable pageable);
}
