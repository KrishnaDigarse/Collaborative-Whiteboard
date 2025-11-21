package com.whiteboard.service;

import com.whiteboard.model.DrawEvent;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class DrawingHistoryService {
    // Map of roomId -> list of DrawEvents
    private final Map<String, List<DrawEvent>> roomHistory = new ConcurrentHashMap<>();

    /**
     * Add a drawing event to the room's history
     */
    public void addEvent(String roomId, DrawEvent event) {
        roomHistory.computeIfAbsent(roomId, k -> Collections.synchronizedList(new ArrayList<>()))
                .add(event);
    }

    /**
     * Get all drawing events for a specific room
     */
    public List<DrawEvent> getHistory(String roomId) {
        return new ArrayList<>(roomHistory.getOrDefault(roomId, new ArrayList<>()));
    }

    /**
     * Clear history for a room (optional - when room is deleted)
     */
    public void clearHistory(String roomId) {
        roomHistory.remove(roomId);
    }

    /**
     * Clear all histories
     */
    public void clearAll() {
        roomHistory.clear();
    }
}
