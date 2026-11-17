package com.jtech.audit;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jtech.repository.SystemLogRepository;
import com.jtech.repository.UserRepository;
import jakarta.servlet.http.*;
import java.util.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.HandlerMapping;

/** Records request outcomes, not field-level before/after snapshots. Never captures bodies or credentials. */
@Component
public class AdminAuditInterceptor implements HandlerInterceptor {
    private static final Logger LOG = LoggerFactory.getLogger(AdminAuditInterceptor.class);
    private static final String ACTOR = AdminAuditInterceptor.class.getName()+".actor";
    private final UserRepository users;
    private final SystemLogRepository logs;
    private final ObjectMapper json;
    public AdminAuditInterceptor(UserRepository users, SystemLogRepository logs, ObjectMapper json) {
        this.users=users; this.logs=logs; this.json=json;
    }
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        var auth=SecurityContextHolder.getContext().getAuthentication();
        if (handler instanceof HandlerMethod && Set.of("POST","PUT","PATCH","DELETE").contains(request.getMethod())
            && auth!=null && auth.isAuthenticated() && auth.getAuthorities().stream()
                .anyMatch(a -> Set.of("ROLE_ADMIN","ADMIN").contains(a.getAuthority()))) {
            users.findByEmail(auth.getName()).ifPresent(user -> request.setAttribute(ACTOR,user.getUserId()));
        }
        return true;
    }
    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        Object actor=request.getAttribute(ACTOR);
        if (!(actor instanceof Long actorId) || !(handler instanceof HandlerMethod method)) return;
        String action=clip(method.getBeanType().getSimpleName()+"."+method.getMethod().getName(),100);
        try {
            int status=ex!=null ? 500 : response.getStatus();
            String level=status>=500 ? "ERROR" : status>=400 ? "WARNING" : "INFO";
            Map<String,Object> detail=new LinkedHashMap<>();
            detail.put("method",request.getMethod());
            // Route templates avoid leaking values from URLs or query parameters.
            detail.put("route",Objects.toString(request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE),""));
            detail.put("status",status);
            detail.put("result",status>=200 && status<300 ? "SUCCESS" : "FAILED");
            Long entityId=null;
            Object variables=request.getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE);
            if (variables instanceof Map<?,?> map) {
                Object id=map.get("id");
                if (id!=null) { try { entityId=Long.valueOf(id.toString()); } catch (NumberFormatException ignored) {} }
            }
            logs.append(actorId,action,clip(method.getBeanType().getSimpleName().replace("Controller",""),50),
                entityId,level,json.writeValueAsString(detail),clip(request.getRemoteAddr(),45),clip(request.getHeader("User-Agent"),255));
        } catch (Exception failure) {
            // The business transaction has already completed. Do not turn a committed operation into a failed response.
            LOG.error("Could not persist admin audit event: actor={}, action={}",actorId,action,failure);
        }
    }
    private String clip(String value,int limit) { return value==null ? null : value.substring(0,Math.min(value.length(),limit)); }
}
