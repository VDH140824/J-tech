package com.jtech.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionalEventListener;

@Service
public class FeedbackMailService {
    private static final Logger log = LoggerFactory.getLogger(FeedbackMailService.class);
    private final ObjectProvider<JavaMailSender> senders;
    private final String from;

    public FeedbackMailService(ObjectProvider<JavaMailSender> senders,
            @Value("${app.feedback.mail-from:no-reply@jtech.local}") String from) {
        this.senders = senders;
        this.from = from;
    }

    public record ResolutionMail(String email, long feedbackId, String title, String status, String note) {}

    // Send only after the status and in-app notification have committed successfully.
    @TransactionalEventListener
    public void send(ResolutionMail event) {
        try {
            JavaMailSender sender = senders.getIfAvailable();
            if (sender == null) {
                log.warn("SMTP chưa được cấu hình; không gửi được email cho feedback #{}", event.feedbackId());
                return;
            }
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(from);
            message.setTo(event.email());
            message.setSubject("J-Tech: cập nhật phản hồi #" + event.feedbackId());
            message.setText(event.title() + "\nTrạng thái: " + event.status() + "\nGhi chú: " + event.note());
            sender.send(message);
        } catch (Exception ex) {
            log.warn("Không gửi được email feedback #{}; kết quả xử lý đã được lưu", event.feedbackId(), ex);
        }
    }
}
