package com.jtech.controller;

import com.jtech.dto.response.SystemLogResponse;
import com.jtech.service.AdminSystemLogService;
import java.time.LocalDate;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/admin/system-logs")
@PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ADMIN')")
public class AdminSystemLogController {
    private final AdminSystemLogService service;
    public AdminSystemLogController(AdminSystemLogService service) { this.service=service; }
    @GetMapping
    public Page<SystemLogResponse> list(@RequestParam(required=false) String search,
        @RequestParam(required=false) String level, @RequestParam(required=false) String entityType,
        @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate to,
        @RequestParam(defaultValue="0") int page, @RequestParam(defaultValue="10") int size) {
        return service.list(search,level,entityType,from,to,page,size);
    }
    @GetMapping("/{id}")
    public SystemLogResponse detail(@PathVariable long id) { return service.detail(id); }
}
