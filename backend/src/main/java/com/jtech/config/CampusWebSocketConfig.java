package com.jtech.config;

import com.jtech.campus.CampusWebSocketHandler;
import java.util.Arrays;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
@EnableScheduling
public class CampusWebSocketConfig implements WebSocketConfigurer {
    private final CampusWebSocketHandler handler;
    private final String[] origins;
    public CampusWebSocketConfig(CampusWebSocketHandler handler,
        @Value("${app.frontend.allowed-origins:${app.frontend.url:http://localhost:5173}}") String origins) {
        this.handler = handler;
        this.origins = Arrays.stream(origins.split(",")).map(String::trim).filter(value -> !value.isEmpty()).toArray(String[]::new);
    }
    @Override public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(handler, "/campus/ws").setAllowedOrigins(origins);
    }
    @Bean(name = "taskScheduler")
    public ThreadPoolTaskScheduler campusTaskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        // Account/database checks must not pause the 10 Hz movement broadcasts.
        scheduler.setPoolSize(3);
        scheduler.setThreadNamePrefix("campus-clock-");
        scheduler.setRemoveOnCancelPolicy(true);
        return scheduler;
    }
}
