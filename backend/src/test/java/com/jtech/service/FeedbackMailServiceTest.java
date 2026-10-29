package com.jtech.service;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class FeedbackMailServiceTest {
    @Test void deliveryFailureDoesNotPropagateToCommittedResolution() {
        @SuppressWarnings("unchecked") ObjectProvider<JavaMailSender> provider = mock(ObjectProvider.class);
        JavaMailSender sender = mock(JavaMailSender.class);
        when(provider.getIfAvailable()).thenReturn(sender);
        doThrow(new IllegalStateException("SMTP unavailable")).when(sender).send(any(SimpleMailMessage.class));
        var service = new FeedbackMailService(provider, "no-reply@example.com");
        assertDoesNotThrow(() -> service.send(new FeedbackMailService.ResolutionMail("student@example.com", 1L, "Title", "Đã xử lý", "Done")));
    }
}
