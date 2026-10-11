package com.jtech.dto.response;

import java.util.List;

public class AdminDashboardStatsResponse {

    private long totalUsers;
    private long activeUsers;
    private long pendingUsers;
    private long rejectedUsers;
    private long lockedUsers;

    private List<MonthlyStat> userGrowthStats;

    public static class MonthlyStat {
        private String label;
        private long value;

        public MonthlyStat(String label, long value) {
            this.label = label;
            this.value = value;
        }

        public String getLabel() { return label; }
        public long getValue() { return value; }
    }

    public AdminDashboardStatsResponse() {}

    public long getTotalUsers() { return totalUsers; }
    public void setTotalUsers(long totalUsers) { this.totalUsers = totalUsers; }

    public long getActiveUsers() { return activeUsers; }
    public void setActiveUsers(long activeUsers) { this.activeUsers = activeUsers; }

    public long getPendingUsers() { return pendingUsers; }
    public void setPendingUsers(long pendingUsers) { this.pendingUsers = pendingUsers; }

    public long getRejectedUsers() { return rejectedUsers; }
    public void setRejectedUsers(long rejectedUsers) { this.rejectedUsers = rejectedUsers; }

    public long getLockedUsers() { return lockedUsers; }
    public void setLockedUsers(long lockedUsers) { this.lockedUsers = lockedUsers; }

    public List<MonthlyStat> getUserGrowthStats() { return userGrowthStats; }
    public void setUserGrowthStats(List<MonthlyStat> userGrowthStats) { this.userGrowthStats = userGrowthStats; }
}
