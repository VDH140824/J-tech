package com.jtech.config;

import com.jtech.audit.AdminAuditInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.*;

@Configuration
public class AdminAuditConfig implements WebMvcConfigurer {
    private final AdminAuditInterceptor interceptor;
    public AdminAuditConfig(AdminAuditInterceptor interceptor) { this.interceptor=interceptor; }
    @Override public void addInterceptors(InterceptorRegistry registry) { registry.addInterceptor(interceptor); }
}
