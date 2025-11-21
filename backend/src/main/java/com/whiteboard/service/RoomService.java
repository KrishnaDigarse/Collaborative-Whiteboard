package com.whiteboard.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;

@Service
public class RoomService {
    private static final Logger logger = LoggerFactory.getLogger(RoomService.class);

    @Autowired
    private WhiteboardService whiteboardService;

    // Map of roomId -> number of connected users
    private final Map<String, Integer> roomUserCount = new ConcurrentHashMap<>();

    /**
     * Add a user to the room (increment connection count)
     */
    public void addUserToRoom(String roomId) {
        int newCount = roomUserCount.compute(roomId, (k, v) -> (v == null ? 0 : v) + 1);
        logger.info("👤 User joined room: {}. Total users in room: {}", roomId, newCount);
    }

    /**
     * Remove a user from the room and clear room data if empty
     */
    public void removeUserFromRoom(String roomId) {
        Integer newCount = roomUserCount.compute(roomId, (k, v) -> (v == null || v <= 1) ? null : v - 1);

        if (newCount == null) {
            // Room is now empty, clear all data
            logger.info("🔴 Room {} is now empty. Clearing all drawing data.", roomId);
            whiteboardService.clearRoom(roomId);
            logger.info("✓ Room {} completely cleared", roomId);
        } else {
            logger.info("👤 User left room: {}. Remaining users: {}", roomId, newCount);
        }
    }

    /**
     * Get the number of users in a room
     */
    public int getUserCount(String roomId) {
        return roomUserCount.getOrDefault(roomId, 0);
    }

    /**
     * Get total number of active rooms
     */
    public int getActiveRoomCount() {
        return roomUserCount.size();
    }

    /**
     * Clear all rooms (for testing/debugging)
     */
    public void clearAllRooms() {
        logger.info("🗑️ Clearing all rooms");
        roomUserCount.clear();
        // whiteboardService.clearAll(); // Method not implemented yet in
        // WhiteboardService, but clearRoom is enough for now
    }
}
