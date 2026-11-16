package com.jtech.service;

import com.jtech.repository.UserStreakRepository;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Map;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class DailyLearningReminderJob {
    private static final ZoneId LEARNING_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final UserStreakRepository days;
    private final FeedbackMailService mail;

    public DailyLearningReminderJob(UserStreakRepository days, FeedbackMailService mail) {
        this.days = days;
        this.mail = mail;
    }

    @Scheduled(cron = "0 * * * * *", zone = "Asia/Ho_Chi_Minh")
    public void sendReminders() {
        LocalDate today = LocalDate.now(LEARNING_ZONE);
        for (Map<String, Object> student : days.findStudentsWithoutLearningToday(today)) {
            long studentId = ((Number) student.get("user_id")).longValue();
            if (!days.markLearningReminderSent(studentId, today)) continue;
            mail.sendLearningReminder((String) student.get("email"), (String) student.get("full_name"));
        }
    }
}
