package com.jtech.campus;

import com.jtech.dto.campusquiz.CampusQuizDtos.QuizQuestion;
import com.jtech.dto.campusquiz.CampusQuizDtos.QuizResult;
import com.jtech.dto.campusquiz.CampusQuizDtos.SubmissionMode;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

@Component
public class CampusQuizSessionStore {
    private static final Duration SUBMISSION_GRACE = Duration.ofSeconds(60);

    public record QuestionSnapshot(QuizQuestion question, int correctOptionId, String explanation) {}

    public record Session(UUID id, long studentId, long courseId, Instant expiresAt, List<QuestionSnapshot> questions) {}

    public enum Rejection {
        SESSION_UNAVAILABLE,
        DEADLINE_PASSED,
        DEADLINE_NOT_REACHED,
        INVALID_ANSWERS,
        SUBMISSION_IN_PROGRESS,
        SUBMISSION_ANSWERS_CHANGED
    }

    public static class SubmissionException extends RuntimeException {
        private final Rejection reason;

        public SubmissionException(Rejection reason) {
            super(reason.name());
            this.reason = reason;
        }

        public Rejection reason() {
            return reason;
        }
    }

    public record Submission(Session session, Map<Long, Integer> answers, QuizResult result) {}

    private enum Status { IN_PROGRESS, SUBMITTING, RETRYABLE, SUBMITTED }

    private record Entry(Submission submission, Status status) {}

    private final Map<UUID, Entry> sessions = new ConcurrentHashMap<>();

    public Session create(long studentId, long courseId, Instant expiresAt, List<QuestionSnapshot> questions) {
        Instant now = Instant.now();
        sessions.entrySet().removeIf(entry -> entry.getValue().status() != Status.SUBMITTING
            && !submissionWindowOpen(entry.getValue().submission().session(), now));

        Session session = new Session(UUID.randomUUID(), studentId, courseId, expiresAt, List.copyOf(questions));
        sessions.put(session.id(), new Entry(new Submission(session, Map.of(), null), Status.IN_PROGRESS));
        return session;
    }

    public Submission claim(UUID sessionId, long studentId, Map<Long, Integer> answers, SubmissionMode mode) {
        return sessions.compute(sessionId, (id, entry) -> {
            Instant now = Instant.now();
            if (entry == null || entry.submission().session().studentId() != studentId
                || !submissionWindowOpen(entry.submission().session(), now)) {
                throw new SubmissionException(Rejection.SESSION_UNAVAILABLE);
            }
            if (entry.status() == Status.SUBMITTING) {
                throw new SubmissionException(Rejection.SUBMISSION_IN_PROGRESS);
            }

            Submission submission = entry.submission();
            // Keep answers fixed after a claim, including retries following an uncertain reward outcome.
            if (entry.status() != Status.IN_PROGRESS && !submission.answers().equals(answers)) {
                throw new SubmissionException(Rejection.SUBMISSION_ANSWERS_CHANGED);
            }
            if (entry.status() == Status.SUBMITTED) {
                return entry;
            }

            boolean timeout = mode == SubmissionMode.TIMEOUT;
            boolean deadlinePassed = !submission.session().expiresAt().isAfter(now);
            if (deadlinePassed != timeout) {
                throw new SubmissionException(deadlinePassed ? Rejection.DEADLINE_PASSED : Rejection.DEADLINE_NOT_REACHED);
            }

            var questions = submission.session().questions();
            long validAnswers = questions.stream().filter(snapshot ->
                snapshot.question().options().stream().anyMatch(option ->
                    Integer.valueOf(option.id()).equals(answers.get(snapshot.question().id())))).count();
            if (validAnswers != answers.size()) {
                throw new SubmissionException(Rejection.INVALID_ANSWERS);
            }
            return new Entry(new Submission(submission.session(), Map.copyOf(answers), null), Status.SUBMITTING);
        }).submission();
    }

    public void complete(UUID sessionId, QuizResult result) {
        sessions.computeIfPresent(sessionId, (id, entry) ->
            new Entry(new Submission(entry.submission().session(), entry.submission().answers(), result), Status.SUBMITTED));
    }

    public void releaseForRetry(UUID sessionId) {
        sessions.computeIfPresent(sessionId, (id, entry) -> {
            if (!submissionWindowOpen(entry.submission().session(), Instant.now())) {
                return null;
            }
            return new Entry(entry.submission(), Status.RETRYABLE);
        });
    }

    private boolean submissionWindowOpen(Session session, Instant now) {
        return session.expiresAt().plus(SUBMISSION_GRACE).isAfter(now);
    }
}
