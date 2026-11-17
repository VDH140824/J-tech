package com.jtech.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jtech.dto.request.SystemSettingUpdateRequest;
import com.jtech.dto.response.SystemSettingResponse;
import com.jtech.repository.SystemSettingRepository;
import com.jtech.repository.UserRepository;
import java.security.Principal;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class SystemSettingService {
    private final SystemSettingRepository repository;
    private final UserRepository users;
    private final ObjectMapper json;
    public SystemSettingService(SystemSettingRepository repository, UserRepository users, ObjectMapper json) {
        this.repository=repository; this.users=users; this.json=json;
    }
    // Missing settings preserve existing mail behaviour. Reads never insert database rows.
    public static SystemSettingUpdateRequest defaults() {
        return new SystemSettingUpdateRequest(false,"","",true,true);
    }
    public SystemSettingResponse get() {
        var stored=repository.find();
        if (stored.isEmpty()) return new SystemSettingResponse(defaults(),null,null,null);
        var row=stored.get();
        if (row.secret()) throw new ResponseStatusException(HttpStatus.CONFLICT,"Khóa cấu hình đang được sử dụng cho dữ liệu bí mật.");
        try {
            var settings=json.readValue(row.value(),SystemSettingUpdateRequest.class);
            validate(settings);
            return new SystemSettingResponse(settings,row.updatedBy(),row.updatedByName(),row.updatedAt());
        } catch (JsonProcessingException | IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,"Dữ liệu cấu hình hệ thống không hợp lệ.");
        }
    }
    @Transactional
    public SystemSettingResponse save(SystemSettingUpdateRequest request, Principal principal) {
        validate(request);
        if (principal==null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Vui lòng đăng nhập.");
        var actor=users.findByEmail(principal.getName()).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Không tìm thấy tài khoản đăng nhập."));
        if (actor.getRole()==null || !"ADMIN".equals(actor.getRole().getRoleName())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Chỉ Admin được thay đổi cấu hình.");
        }
        var normalized=new SystemSettingUpdateRequest(request.announcementEnabled(),request.announcementTitle().trim(),
            request.announcementContent().trim(),request.learningReminderEnabled(),request.feedbackEmailEnabled());
        try { repository.save(json.writeValueAsString(normalized),actor.getUserId()); }
        catch (JsonProcessingException ex) { throw new IllegalStateException("Không thể lưu cấu hình.",ex); }
        return get();
    }
    public boolean learningReminderEnabled() { return get().settings().learningReminderEnabled(); }
    public boolean feedbackEmailEnabled() { return get().settings().feedbackEmailEnabled(); }

    public record Announcement(boolean enabled, String title, String content) {}
    public Announcement announcement() {
        var settings=get().settings();
        return settings.announcementEnabled()
            ? new Announcement(true,settings.announcementTitle(),settings.announcementContent())
            : new Announcement(false,"","");
    }
    private void validate(SystemSettingUpdateRequest value) {
        if (value==null || value.announcementEnabled()==null || value.learningReminderEnabled()==null
            || value.feedbackEmailEnabled()==null || value.announcementTitle()==null || value.announcementContent()==null
            || value.announcementTitle().length()>200 || value.announcementContent().length()>2000) {
            throw new IllegalArgumentException("Cấu hình không hợp lệ: tiêu đề tối đa 200 ký tự, nội dung tối đa 2000 ký tự.");
        }
        if (value.announcementEnabled() && (value.announcementTitle().isBlank() || value.announcementContent().isBlank())) {
            throw new IllegalArgumentException("Vui lòng nhập tiêu đề và nội dung khi bật thông báo.");
        }
    }
}
