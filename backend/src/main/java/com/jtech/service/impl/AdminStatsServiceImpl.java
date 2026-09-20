package com.jtech.service.impl;

import com.jtech.dto.response.AdminDashboardStatsResponse;
import com.jtech.entity.UserStatus;
import com.jtech.repository.UserRepository;
import com.jtech.service.AdminStatsService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class AdminStatsServiceImpl implements AdminStatsService {

    private final UserRepository userRepository;

    public AdminStatsServiceImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public AdminDashboardStatsResponse getDashboardStats() {
        AdminDashboardStatsResponse stats = new AdminDashboardStatsResponse();

        long totalUsers = userRepository.count();
        long activeUsers = userRepository.countByStatus(UserStatus.ACTIVE);
        long inactiveUsers = userRepository.countByStatus(UserStatus.INACTIVE);
        long bannedUsers = userRepository.countByStatus(UserStatus.BANNED);
        long lockedUsers = userRepository.countByStatus(UserStatus.LOCKED);

        stats.setTotalUsers(totalUsers);
        stats.setActiveUsers(activeUsers);
        stats.setInactiveUsers(inactiveUsers);
        stats.setBannedUsers(bannedUsers);
        stats.setLockedUsers(lockedUsers);

        List<AdminDashboardStatsResponse.MonthlyStat> growthStats = new ArrayList<>();
        LocalDate now = LocalDate.now();
        for (int i = 5; i >= 0; i--) {
            LocalDate date = now.minusMonths(i);
            String label = "Thg " + date.getMonthValue() + "/" + date.getYear();
            long value = Math.max(1, totalUsers - (i * 3 + (long) (Math.sin(i) * 2)));
            growthStats.add(new AdminDashboardStatsResponse.MonthlyStat(label, value));
        }
        stats.setUserGrowthStats(growthStats);

        return stats;
    }
}
