package com.jtech.campus;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PreDestroy;
import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.PongMessage;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
public class CampusWebSocketHandler extends TextWebSocketHandler {
    private final CampusRoomService room;
    private final ObjectMapper json;
    private final Map<String, Connection> connections = new ConcurrentHashMap<>();

    public CampusWebSocketHandler(CampusRoomService room, ObjectMapper json) { this.room = room; this.json = json; }

    // One bounded writer per socket preserves message order without a slow client holding the room lock.
    private static final class Connection implements CampusMessages.Channel {
        final WebSocketSession session;
        final ArrayBlockingQueue<String> outbound = new ArrayBlockingQueue<>(64);
        final AtomicBoolean stopped = new AtomicBoolean();
        final long createdAt = System.currentTimeMillis();
        volatile long lastSeen = createdAt;
        volatile boolean authenticated;
        long window = createdAt;
        int count;
        Thread writer;
        Connection(WebSocketSession session) {
            this.session = session;
            writer = Thread.ofVirtual().name("campus-writer-" + session.getId()).start(() -> {
                try { while (!stopped.get() && session.isOpen()) session.sendMessage(new TextMessage(outbound.take())); }
                catch (InterruptedException exception) { Thread.currentThread().interrupt(); }
                catch (IOException | RuntimeException exception) { close(1011, "connection_failed"); }
            });
        }
        @Override public String id() { return session.getId(); }
        @Override public boolean isOpen() { return !stopped.get() && session.isOpen(); }
        @Override public boolean send(String text) {
            if (stopped.get()) return false;
            if (outbound.offer(text)) return true;
            close(1013, "slow_connection"); return false;
        }
        void stop() { if (stopped.compareAndSet(false, true)) { writer.interrupt(); outbound.clear(); } }
        @Override public void close(int code, String reason) {
            if (stopped.get()) return;
            stop();
            Thread.startVirtualThread(() -> {
                try { session.close(new CloseStatus(code, reason)); } catch (IOException ignored) { }
            });
        }
    }

    @Override public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        if (connections.size() >= 64) { session.close(new CloseStatus(1013, "server_busy")); return; }
        session.setTextMessageSizeLimit(8192);
        connections.put(session.getId(), new Connection(session));
    }
    @Override protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        Connection connection = connections.get(session.getId());
        if (connection == null || connection.stopped.get()) return;
        connection.lastSeen = System.currentTimeMillis();
        if (connection.lastSeen - connection.window > 1000) { connection.window = connection.lastSeen; connection.count = 0; }
        if (++connection.count > 50) { connection.close(1008, "message_rate"); return; }
        try {
            JsonNode packet = json.readTree(message.getPayload());
            if (packet == null || !packet.isObject()) { connection.close(1007, "invalid_message"); return; }
            if (!connection.authenticated) {
                if (!"auth".equals(packet.path("type").asText())) { connection.close(4401, "auth_required"); return; }
                connection.authenticated = room.join(connection, packet.path("token").asText(""),
                    packet.path("mapId").asText(""), packet.path("character").asText(""));
            } else room.receive(connection, packet);
        } catch (com.fasterxml.jackson.core.JsonProcessingException exception) {
            connection.close(1007, "invalid_message");
        } catch (RuntimeException exception) {
            // Do not log incoming frames: authentication frames contain a JWT.
            connection.close(1011, "server_unavailable");
        }
    }
    @Override protected void handlePongMessage(WebSocketSession session, PongMessage message) {
        Connection connection = connections.get(session.getId());
        if (connection != null) connection.lastSeen = System.currentTimeMillis();
    }
    @Override public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        Connection connection = connections.remove(session.getId());
        if (connection != null) { connection.stop(); room.leave(connection); }
    }
    @Override public void handleTransportError(WebSocketSession session, Throwable exception) {
        Connection connection = connections.remove(session.getId());
        if (connection != null) { connection.close(1011, "transport_error"); room.leave(connection); }
    }
    @Scheduled(fixedDelay = 1000)
    public void expireConnections() {
        long now = System.currentTimeMillis();
        for (Connection connection : connections.values()) {
            if (!connection.isOpen()) {
                if (connections.remove(connection.id(), connection)) { connection.stop(); room.leave(connection); }
            } else if (!connection.authenticated && now - connection.createdAt > 5000) connection.close(4401, "auth_timeout");
            else if (now - connection.lastSeen > 35000) connection.close(1001, "heartbeat_timeout");
        }
    }
    @PreDestroy public void shutdown() { connections.values().forEach(connection -> connection.close(1001, "server_stopping")); }
}
