package com.jtech.campus;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class CampusMessages {
    private CampusMessages() {}

    public interface Channel {
        String id();
        boolean isOpen();
        boolean send(String json);
        void close(int code, String reason);
    }
    public record Gesture(String action, double progress) {}
    public record Pose(double x, double y, double z, double yaw, double speed, boolean running,
                       String seatId, Gesture gesture, boolean teleport) {}
    public record Player(long id, String name, String character, Pose state, long updatedAt) {}
    public record Chat(long id, String clientId, long userId, String name, String text, long time) {}
    public record Door(String id, double[] hinge, double[] center, double[] halfExtents) {}
    public record Seat(String id, double[] position, double floorY) {}
    public record MapDefinition(String mapId, double[] boundsMin, double[] boundsMax, double[] spawn, List<double[]> spawns,
                                List<Door> doors, List<Seat> seats) {}

    public static Map<String, Object> event(String type, Object... entries) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("type", type);
        for (int index = 0; index < entries.length; index += 2) result.put((String) entries[index], entries[index + 1]);
        return result;
    }
}
