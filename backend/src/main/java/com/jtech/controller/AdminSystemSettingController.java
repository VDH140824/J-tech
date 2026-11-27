package com.jtech.controller;

import com.jtech.dto.request.SystemSettingUpdateRequest;
import com.jtech.dto.response.SystemSettingResponse;
import com.jtech.service.SystemSettingService;
import jakarta.validation.Valid;
import java.security.Principal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/admin/settings")
@PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ADMIN')")
public class AdminSystemSettingController {
    private final SystemSettingService service;
    public AdminSystemSettingController(SystemSettingService service) { this.service=service; }
    @GetMapping public SystemSettingResponse get() { return service.get(); }
    @PutMapping public SystemSettingResponse update(@Valid @RequestBody SystemSettingUpdateRequest request, Principal principal) {
        return service.save(request,principal);
    }
}
