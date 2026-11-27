package com.jtech.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jtech.dto.request.SystemSettingUpdateRequest;
import com.jtech.entity.*;
import com.jtech.repository.*;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class SystemSettingServiceTest {
    private final SystemSettingRepository repository=mock(SystemSettingRepository.class);
    private final UserRepository users=mock(UserRepository.class);
    private final ObjectMapper json=new ObjectMapper();
    private final SystemSettingService service=new SystemSettingService(repository,users,json);

    @Test void defaultsPreserveEmailsAndDoNotWriteOnRead() {
        when(repository.find()).thenReturn(Optional.empty());
        assertFalse(service.get().settings().announcementEnabled());
        assertTrue(service.learningReminderEnabled()); assertTrue(service.feedbackEmailEnabled());
        verify(repository,never()).save(anyString(),anyLong());
    }
    @Test void savesNormalizedSettingsAndReturnsUpdaterMetadata() throws Exception {
        var role=new Role(); role.setRoleName("ADMIN");
        var actor=new User(); actor.setUserId(3L); actor.setRole(role);
        when(users.findByEmail("admin@test.local")).thenReturn(Optional.of(actor));
        var row=new AtomicReference<SystemSettingRepository.StoredSettings>();
        var now=LocalDateTime.of(2026,11,17,17,0);
        doAnswer(invocation -> {
            row.set(new SystemSettingRepository.StoredSettings(invocation.getArgument(0),false,3L,"Admin",now));
            return null;
        }).when(repository).save(anyString(),eq(3L));
        when(repository.find()).thenAnswer(invocation -> Optional.ofNullable(row.get()));
        var result=service.save(new SystemSettingUpdateRequest(true," Thông báo "," Nội dung ",false,false),() -> "admin@test.local");
        assertEquals("Thông báo",result.settings().announcementTitle());
        assertEquals(now,result.updatedAt()); assertEquals(3L,result.updatedBy());
        assertFalse(service.learningReminderEnabled()); assertFalse(service.feedbackEmailEnabled());
        assertEquals("Nội dung",service.announcement().content());
    }
    @Test void rejectsInvalidSettingsBeforeWriting() {
        assertThrows(IllegalArgumentException.class,() -> service.save(new SystemSettingUpdateRequest(true," ","text",true,true),null));
        assertThrows(IllegalArgumentException.class,() -> service.save(new SystemSettingUpdateRequest(false,"x".repeat(201),"",true,true),null));
        assertThrows(IllegalArgumentException.class,() -> service.save(new SystemSettingUpdateRequest(null,"","",true,true),null));
        verifyNoInteractions(repository,users);
    }
    @Test void refusesSecretOrMalformedStoredSettings() {
        when(repository.find()).thenReturn(Optional.of(new SystemSettingRepository.StoredSettings(null,true,null,null,null)));
        assertEquals(409,assertThrows(ResponseStatusException.class,service::get).getStatusCode().value());
        when(repository.find()).thenReturn(Optional.of(new SystemSettingRepository.StoredSettings("broken",false,null,null,null)));
        assertEquals(500,assertThrows(ResponseStatusException.class,service::get).getStatusCode().value());
    }
    @Test void disabledAnnouncementDoesNotExposeDraftOrAdminMetadata() throws Exception {
        var config=new SystemSettingUpdateRequest(false,"Draft title","Draft content",true,true);
        when(repository.find()).thenReturn(Optional.of(new SystemSettingRepository.StoredSettings(json.writeValueAsString(config),false,3L,"Admin",null)));
        assertEquals(new SystemSettingService.Announcement(false,"",""),service.announcement());
    }
    @Test void disabledRemindersDoNotMarkStudentsOrSendMail() {
        var settings=mock(SystemSettingService.class);
        var days=mock(UserStreakRepository.class); var mail=mock(FeedbackMailService.class);
        new DailyLearningReminderJob(days,mail,settings).sendReminders();
        verifyNoInteractions(days,mail);
    }
    @Test void enabledRemindersRetainPerStudentSelectionAndDeduplication() {
        var settings=mock(SystemSettingService.class); when(settings.learningReminderEnabled()).thenReturn(true);
        var days=mock(UserStreakRepository.class); var mail=mock(FeedbackMailService.class);
        when(days.findStudentsWithoutLearningToday(any())).thenReturn(List.of(Map.of("user_id",7L,"email","student@test.local","full_name","Student")));
        when(days.markLearningReminderSent(eq(7L),any())).thenReturn(true,false);
        var job=new DailyLearningReminderJob(days,mail,settings); job.sendReminders(); job.sendReminders();
        verify(mail,times(1)).sendLearningReminder("student@test.local","Student");
    }
}
