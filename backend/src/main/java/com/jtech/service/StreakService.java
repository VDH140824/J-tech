package com.jtech.service;

import com.jtech.repository.UserStreakRepository;
import com.jtech.repository.StreakMilestoneRepository;
import com.jtech.repository.StreakMilestoneRepository.Milestone;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StreakService {
    public static final ZoneId LEARNING_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    public record State(int currentStreak, int longestStreak, LocalDate streakStart) {}
    public record Summary(int currentStreak, int longestStreak, Milestone nextMilestone,
                          List<String> learningDays, String today, String streakStart, List<Milestone> milestones) {}
    private final UserStreakRepository days;
    private final StreakMilestoneRepository milestones;

    public StreakService(UserStreakRepository days, StreakMilestoneRepository milestones) {
        this.days = days;
        this.milestones = milestones;
    }

    // UC-27: reads never write a day, modify the wallet, or award a milestone.
    @Transactional(readOnly = true)
    public Summary getStreakSummary(long studentId) {
        LocalDate today = LocalDate.now(LEARNING_ZONE);
        var history = days.findLearningDays(studentId).stream().filter(day -> !day.isAfter(today)).toList();
        State state = calculate(history, today);
        var configured = milestones.findConfiguredMilestones();
        Milestone next = configured.stream()
            .filter(m -> m.targetDays() > state.currentStreak()).findFirst().orElse(null);
        return new Summary(state.currentStreak(), Math.max(state.longestStreak(), days.findLongest(studentId)), next,
            history.stream().map(LocalDate::toString).toList(), today.toString(),
            Objects.toString(state.streakStart(), null), configured);
    }

    public static State calculate(List<LocalDate> learningDays, LocalDate today) {
        var ordered = new TreeSet<>(learningDays);
        int run = 0, longest = 0;
        LocalDate previous = null, start = null;
        for (LocalDate day : ordered) {
            if (day.isAfter(today)) break;
            if (previous != null && day.equals(previous.plusDays(1))) run++;
            else { run = 1; start = day; }
            longest = Math.max(longest, run);
            previous = day;
        }
        if (previous == null || previous.isBefore(today.minusDays(1))) return new State(0, longest, null);
        return new State(run, longest, start);
    }
}
