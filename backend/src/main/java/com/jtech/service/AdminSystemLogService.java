package com.jtech.service;

import com.jtech.dto.response.SystemLogResponse;
import com.jtech.repository.SystemLogRepository;
import java.time.LocalDate;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AdminSystemLogService {
    private final SystemLogRepository repository;
    public AdminSystemLogService(SystemLogRepository repository) { this.repository=repository; }
    public Page<SystemLogResponse> list(String search, String level, String entityType,
        LocalDate from, LocalDate to, int page, int size) {
        if (page<0 || size<1 || size>100) throw bad("Phân trang không hợp lệ (size từ 1 đến 100).");
        if (from!=null && to!=null && from.isAfter(to)) throw bad("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.");
        if (to!=null && to.equals(LocalDate.MAX)) throw bad("Ngày kết thúc không hợp lệ.");
        String normalized = level==null || level.isBlank() ? null : level.trim().toUpperCase(Locale.ROOT);
        if (normalized!=null && !Set.of("INFO","WARNING","ERROR").contains(normalized)) throw bad("Mức độ log không hợp lệ.");
        return repository.find(search,normalized,entityType,from,to,PageRequest.of(page,size));
    }
    public SystemLogResponse detail(long id) {
        return repository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy nhật ký."));
    }
    private ResponseStatusException bad(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST,message); }
}
