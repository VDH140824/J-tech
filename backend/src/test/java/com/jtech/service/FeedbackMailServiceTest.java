package com.jtech.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

class FeedbackMailServiceTest {

    @Test
    void deliveryFailureDoesNotPropagateToCommittedResolution() {
        @SuppressWarnings("unchecked")
        ObjectProvider<JavaMailSender> provider = mock(ObjectProvider.class);
        JavaMailSender sender = mock(JavaMailSender.class);
        when(provider.getIfAvailable()).thenReturn(sender);
        doThrow(new IllegalStateException("SMTP unavailable"))
            .when(sender)
            .send(any(SimpleMailMessage.class));
        var settings=mock(SystemSettingService.class);
        when(settings.feedbackEmailEnabled()).thenReturn(true);
        var service = new FeedbackMailService(provider, "no-reply@example.com",settings);
        assertDoesNotThrow(() ->
            service.send(
                new FeedbackMailService.ResolutionMail(
                    "student@example.com",
                    1L,
                    "Title",
                    "Đã xử lý",
                    "Done"
                )
            )
        );
    }

    @Test
    void disabledFeedbackEmailNeverRequestsSender() {
        @SuppressWarnings("unchecked")
        ObjectProvider<JavaMailSender> provider=mock(ObjectProvider.class);
        var settings=mock(SystemSettingService.class);
        var service=new FeedbackMailService(provider,"no-reply@example.com",settings);
        service.send(new FeedbackMailService.ResolutionMail("student@example.com",1L,"Title","DONE","Done"));
        verify(settings).feedbackEmailEnabled();
        verifyNoInteractions(provider);
    }

    @Test
    void enablingFeedbackEmailSendsExistingResolutionMessage() {
        @SuppressWarnings("unchecked")
        ObjectProvider<JavaMailSender> provider=mock(ObjectProvider.class);
        var sender=mock(JavaMailSender.class);
        var settings=mock(SystemSettingService.class);
        when(settings.feedbackEmailEnabled()).thenReturn(true);
        when(provider.getIfAvailable()).thenReturn(sender);
        new FeedbackMailService(provider,"no-reply@example.com",settings)
            .send(new FeedbackMailService.ResolutionMail("student@example.com",1L,"Title","DONE","Done"));
        var message=org.mockito.ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(sender).send(message.capture());
        assertArrayEquals(new String[]{"student@example.com"},message.getValue().getTo());
        assertTrue(message.getValue().getText().contains("DONE"));
    }
}
