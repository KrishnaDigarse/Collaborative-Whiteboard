package com.whiteboard.service;

import com.whiteboard.model.Shape;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ShapeService {
    // Map of roomId -> list of Shapes
    private final Map<String, List<Shape>> roomShapes = new ConcurrentHashMap<>();

    /**
     * Add a shape to the room's collection
     */
    public void addShape(String roomId, Shape shape) {
        roomShapes.computeIfAbsent(roomId, k -> Collections.synchronizedList(new ArrayList<>()))
                .add(shape);
    }

    /**
     * Get all shapes for a specific room
     */
    public List<Shape> getShapes(String roomId) {
        return new ArrayList<>(roomShapes.getOrDefault(roomId, new ArrayList<>()));
    }

    /**
     * Remove a shape from a room
     */
    public void removeShape(String roomId, int index) {
        List<Shape> shapes = roomShapes.get(roomId);
        if (shapes != null && index >= 0 && index < shapes.size()) {
            shapes.remove(index);
        }
    }

    /**
     * Clear all shapes in a room
     */
    public void clearShapes(String roomId) {
        roomShapes.remove(roomId);
    }

    /**
     * Clear all shapes from all rooms
     */
    public void clearAll() {
        roomShapes.clear();
    }

    /**
     * Get room count
     */
    public int getRoomCount() {
        return roomShapes.size();
    }
}
