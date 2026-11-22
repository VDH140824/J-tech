package com.jtech.campus;

import static com.jtech.campus.CampusMessages.*;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jtech.entity.User;
import com.jtech.entity.UserStatus;
import com.jtech.repository.UserRepository;
import com.jtech.security.JwtService;
import java.io.IOException;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class CampusRoomService {
    private final ObjectMapper json;
    private final JwtService jwt;
    private final UserRepository users;
    private final MapDefinition map;
    private final int capacity;
    private final Map<Long, Member> members = new LinkedHashMap<>();
    private final Map<String, Door> doorDefinitions = new LinkedHashMap<>();
    private final Map<String, Seat> seatDefinitions = new LinkedHashMap<>();
    private final Map<String, Double> doors = new LinkedHashMap<>();
    private final Map<String, Long> seats = new LinkedHashMap<>();
    private final ArrayDeque<Chat> history = new ArrayDeque<>();
    private final AtomicLong messageIds = new AtomicLong();

    private static final class Member {
        final Channel channel;
        final long id;
        final String email;
        final String character;
        String token;
        String name;
        Pose pose;
        String seatId;
        boolean seatConfirmed;
        long reservedAt;
        long updatedAt;
        long lastState;
        long chatWindow;
        int chatCount;
        boolean dirty = true;
        int spawnIndex;
        final LinkedHashSet<String> chatIds = new LinkedHashSet<>();
        Member(Channel channel, User user, String token, String character, Pose pose) {
            this.channel = channel; this.id = user.getUserId(); this.email = user.getEmail();
            this.character = "female".equals(character) ? "female" : "male";
            this.token = token; this.name = publicName(user); this.pose = pose; this.updatedAt = System.currentTimeMillis();
        }
        Player view() { return new Player(id, name, character, pose, updatedAt); }
    }

    public CampusRoomService(ObjectMapper json, JwtService jwt, UserRepository users,
                             @Value("${app.campus.capacity:30}") int capacity) throws IOException {
        this.json = json; this.jwt = jwt; this.users = users; this.capacity = Math.max(1, Math.min(30, capacity));
        try (var input = new ClassPathResource("campus-map.json").getInputStream()) {
            this.map = json.readValue(input, MapDefinition.class);
        }
        map.doors().forEach(door -> { doorDefinitions.put(door.id(), door); doors.put(door.id(), 0d); });
        map.seats().forEach(seat -> seatDefinitions.put(seat.id(), seat));
    }

    private static String publicName(User user) {
        return user.getFullName() == null || user.getFullName().isBlank() ? "Học viên " + user.getUserId() : user.getFullName().trim();
    }
    private static boolean allowed(User user) {
        return user.getStatus() == UserStatus.ACTIVE && user.getRole() != null
            && ("STUDENT".equalsIgnoreCase(user.getRole().getRoleName()) || "ROLE_STUDENT".equalsIgnoreCase(user.getRole().getRoleName()));
    }
    private User authenticate(String token) {
        String email = jwt.extractUsername(token);
        if (email == null || !jwt.isTokenValid(token, email)) return null;
        return users.findByEmail(email).orElse(null);
    }
    private String wire(Object event) {
        try { return json.writeValueAsString(event); }
        catch (JsonProcessingException exception) { throw new IllegalStateException("Cannot encode campus message", exception); }
    }
    private void send(Channel channel, Object event) { channel.send(wire(event)); }
    private void broadcast(Object event) {
        String text = wire(event);
        List.copyOf(members.values()).forEach(member -> member.channel.send(text));
    }
    private void error(Member member, String code, String message) {
        send(member.channel, event("error", "code", code, "message", message));
    }
    private Member find(Channel channel) {
        return members.values().stream().filter(member -> member.channel.id().equals(channel.id())).findFirst().orElse(null);
    }

    public boolean join(Channel channel, String token, String mapId, String character) {
        if (!Objects.equals(map.mapId(), mapId)) { channel.close(4410, "map_mismatch"); return false; }
        User user = authenticate(token);
        if (user == null) { channel.close(4401, "auth_required"); return false; }
        if (!allowed(user)) { channel.close(4403, "student_required"); return false; }
        synchronized (this) {
            if (!channel.isOpen()) return false;
            Member previous = members.get(user.getUserId());
            if (previous == null && members.size() >= capacity) { channel.close(4429, "room_full"); return false; }
            if (previous != null) {
                release(previous);
                members.remove(previous.id);
                previous.channel.close(4409, "opened_in_another_tab");
            }
            int slot = 0;
            for (; slot < capacity; slot++) {
                int candidate = slot;
                if (members.values().stream().noneMatch(player -> player.spawnIndex == candidate)) break;
            }
            double[] spawn = map.spawns() != null && slot < map.spawns().size() ? map.spawns().get(slot) : map.spawn();
            Member member = new Member(channel, user, token, character,
                new Pose(spawn[0], spawn[1], spawn[2], Math.PI, 0, false, null, null, true));
            member.spawnIndex = slot;
            members.put(member.id, member);
            send(channel, event("welcome", "selfId", member.id, "name", member.name, "capacity", capacity, "mapId", map.mapId(),
                "players", members.values().stream().map(Member::view).toList(), "doors", doors, "seats", seats,
                "messages", new ArrayList<>(history), "time", System.currentTimeMillis()));
            broadcast(event("joined", "player", member.view()));
            return true;
        }
    }

    public synchronized void leave(Channel channel) {
        Member member = find(channel);
        if (member == null) return;
        release(member);
        members.remove(member.id);
        broadcast(event("left", "id", member.id));
    }

    public synchronized void receive(Channel channel, JsonNode packet) throws JsonProcessingException {
        Member member = find(channel);
        if (member == null) { channel.close(4401, "auth_required"); return; }
        switch (packet.path("type").asText()) {
            case "state" -> acceptState(member, json.treeToValue(packet.path("state"), Pose.class));
            case "chat" -> chat(member, packet.path("text").asText(""), packet.path("clientId").asText(""));
            case "door" -> door(member, packet.path("id").asText(""), packet.path("angle").asDouble(Double.NaN));
            case "seat" -> {
                if (packet.has("state")) {
                    member.lastState = 0;
                    acceptState(member, json.treeToValue(packet.path("state"), Pose.class));
                }
                reserve(member, packet.path("seatId").isNull() ? null : packet.path("seatId").asText(""), packet.path("requestId").asText(""));
            }
            case "heartbeat" -> send(channel, event("pong", "time", System.currentTimeMillis()));
            case "reauth" -> {
                String token = packet.path("token").asText("");
                User user = authenticate(token);
                if (user == null) channel.close(4401, "auth_required");
                else if (user.getUserId() != member.id || !allowed(user)) channel.close(4403, "identity_changed");
                else member.token = token;
            }
            default -> error(member, "UNKNOWN_MESSAGE", "Thao tác không được hỗ trợ.");
        }
    }

    private void acceptState(Member member, Pose pose) {
        long now = System.currentTimeMillis();
        if (now - member.lastState < 40 || pose == null) return;
        double[] values = { pose.x(), pose.y(), pose.z(), pose.yaw(), pose.speed() };
        for (double value : values) if (!Double.isFinite(value)) return;
        if (pose.x() < map.boundsMin()[0] - 0.5 || pose.x() > map.boundsMax()[0] + 0.5
            || pose.z() < map.boundsMin()[2] - 0.5 || pose.z() > map.boundsMax()[2] + 0.5
            || pose.y() < map.boundsMin()[1] - 6 || pose.y() > map.boundsMax()[1] + 6
            || pose.speed() < 0 || pose.speed() > 8) return;
        Gesture gesture = pose.gesture();
        if (gesture != null && (!Double.isFinite(gesture.progress()) || gesture.progress() < 0 || gesture.progress() > 1
            || !("touch".equals(gesture.action()) || "pray".equals(gesture.action())))) return;
        if (pose.seatId() != null) {
            if (!pose.seatId().equals(member.seatId)) return;
            Seat seat = seatDefinitions.get(member.seatId);
            member.seatConfirmed = true;
            pose = new Pose(seat.position()[0], seat.position()[1] + 0.1, seat.position()[2], pose.yaw(), 0, false, member.seatId, null, pose.teleport());
        } else if (member.seatConfirmed) release(member);
        member.pose = pose; member.updatedAt = now; member.lastState = now; member.dirty = true;
    }

    private void chat(Member member, String text, String clientId) {
        text = text.strip();
        if (text.isEmpty() || text.codePointCount(0, text.length()) > 300 || clientId.length() > 80 || clientId.isBlank()) {
            error(member, "CHAT_LENGTH", "Tin nhắn cần có từ 1 đến 300 ký tự."); return;
        }
        if (member.chatIds.contains(clientId)) return;
        long now = System.currentTimeMillis();
        if (now - member.chatWindow > 5000) { member.chatWindow = now; member.chatCount = 0; }
        if (++member.chatCount > 5) { error(member, "CHAT_RATE", "Bạn nhắn hơi nhanh. Hãy chờ một chút nhé."); return; }
        member.chatIds.add(clientId);
        if (member.chatIds.size() > 100) member.chatIds.remove(member.chatIds.iterator().next());
        Chat message = new Chat(messageIds.incrementAndGet(), clientId, member.id, member.name, text, now);
        history.addLast(message);
        while (history.size() > 100) history.removeFirst();
        broadcast(event("chat", "message", message));
    }

    private void door(Member member, String id, double angle) {
        Door door = doorDefinitions.get(id);
        if (door == null || !Double.isFinite(angle) || !(angle == 0 || Math.abs(Math.abs(angle) - Math.PI / 2) < 0.001)) return;
        double cx = door.hinge()[0] + door.center()[0], cz = door.hinge()[2] + door.center()[2];
        double floor = door.hinge()[1] + door.center()[1] - door.halfExtents()[1];
        if (Math.hypot(member.pose.x() - cx, member.pose.z() - cz) > 3 || Math.abs(member.pose.y() - 0.84 - floor) > 0.9) {
            error(member, "DOOR_DISTANCE", "Hãy đến gần cửa để mở hoặc đóng."); return;
        }
        double from = doors.get(id);
        if (members.values().stream().anyMatch(player -> sweptDoor(door, from, angle, player.pose))) {
            error(member, "DOOR_BLOCKED", "Có người đang đứng trong lối xoay của cửa."); return;
        }
        doors.put(id, angle);
        broadcast(event("doors", "doors", doors));
    }
    private boolean sweptDoor(Door door, double from, double to, Pose player) {
        if (Math.abs(to - from) < 0.001) return false;
        double x = player.x() - door.hinge()[0], z = player.z() - door.hinge()[2];
        double dy = Math.max(0, Math.abs(player.y() - door.hinge()[1] - door.center()[1]) - 0.56 - door.halfExtents()[1]);
        for (int i = 1; i <= 32; i++) {
            double angle = from + (to - from) * i / 32;
            double dx = Math.max(0, Math.abs(x * Math.cos(angle) - z * Math.sin(angle) - door.center()[0]) - door.halfExtents()[0]);
            double dz = Math.max(0, Math.abs(x * Math.sin(angle) + z * Math.cos(angle) - door.center()[2]) - door.halfExtents()[2]);
            if (dx * dx + dy * dy + dz * dz < 0.34 * 0.34) return true;
        }
        return false;
    }

    private void reserve(Member member, String seatId, String requestId) {
        if (requestId.length() > 80) return;
        if (seatId == null) { release(member); return; }
        Seat seat = seatDefinitions.get(seatId);
        boolean granted = seat != null && (seats.get(seatId) == null || seats.get(seatId) == member.id)
            && Math.hypot(member.pose.x() - seat.position()[0], member.pose.z() - seat.position()[2]) < 2.4
            && Math.abs(member.pose.y() - 0.84 - seat.floorY()) < 0.8;
        if (granted) {
            if (!seatId.equals(member.seatId)) release(member);
            member.seatId = seatId; member.seatConfirmed = false; member.reservedAt = System.currentTimeMillis();
            seats.put(seatId, member.id);
            broadcast(event("seats", "seats", seats));
        }
        send(member.channel, event("seatResult", "requestId", requestId, "seatId", seatId, "granted", granted,
            "message", granted ? "Đã giữ chỗ cho bạn." : "Ghế đã có người ngồi hoặc bạn đã rời xa bàn."));
    }
    private void release(Member member) {
        if (member.seatId == null) return;
        seats.remove(member.seatId, member.id); member.seatId = null; member.seatConfirmed = false;
        broadcast(event("seats", "seats", seats));
    }

    @Scheduled(fixedRate = 100)
    public synchronized void tick() {
        long now = System.currentTimeMillis();
        List<Player> changed = new ArrayList<>();
        for (Member member : members.values()) {
            if (member.seatId != null && !member.seatConfirmed && now - member.reservedAt > 5000) release(member);
            if (member.dirty) { changed.add(member.view()); member.dirty = false; }
        }
        if (!changed.isEmpty()) broadcast(event("snapshot", "players", changed, "time", now));
    }

    @Scheduled(fixedDelay = 15000)
    public void verifyAccounts() {
        List<Member> snapshot;
        synchronized (this) { snapshot = List.copyOf(members.values()); }
        for (Member member : snapshot) {
            String token;
            synchronized (this) { token = member.token; }
            User user;
            try { user = authenticate(token); } catch (RuntimeException unavailable) { continue; }
            synchronized (this) {
                if (members.get(member.id) != member || !member.token.equals(token)) continue;
                if (user == null) member.channel.close(4401, "auth_expired");
                else if (!allowed(user)) member.channel.close(4403, "account_unavailable");
                else if (!member.name.equals(publicName(user))) {
                    member.name = publicName(user); broadcast(event("joined", "player", member.view()));
                }
            }
        }
    }
}
