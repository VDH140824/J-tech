package com.jtech.controller;

import com.jtech.service.SystemSettingService;
import org.springframework.web.bind.annotation.*;

/** Only announcement content is exposed to authenticated users; no administrative settings or metadata. */
@RestController
@RequestMapping("/system/announcement")
public class SystemSettingController {
    private final SystemSettingService service;
    public SystemSettingController(SystemSettingService service) { this.service=service; }
    @GetMapping public SystemSettingService.Announcement announcement() { return service.announcement(); }
}
