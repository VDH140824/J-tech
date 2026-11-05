package com.jtech.repository;

import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class StreakMilestoneRepository {
    public record Milestone(long id, int targetDays, long coinAmount, boolean enabled) {}
    private final JdbcTemplate db;
    public StreakMilestoneRepository(JdbcTemplate db) { this.db = db; }
    public List<Milestone> findConfiguredMilestones() {
        return db.query("SELECT id,target_days,coin_amount,enabled FROM streak_milestone WHERE enabled=TRUE ORDER BY target_days",
            (rs, row) -> new Milestone(rs.getLong(1), rs.getInt(2), rs.getLong(3), rs.getBoolean(4)));
    }
    public List<Milestone> findConfiguredMilestonesForAward() {
        return db.query("SELECT id,target_days,coin_amount,enabled FROM streak_milestone WHERE enabled=TRUE ORDER BY target_days FOR SHARE",
            (rs, row) -> new Milestone(rs.getLong(1), rs.getInt(2), rs.getLong(3), rs.getBoolean(4)));
    }
}
