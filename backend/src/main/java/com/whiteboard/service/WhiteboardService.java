package com.whiteboard.service;

import com.whiteboard.model.BoardItem;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class WhiteboardService {

    // In-Memory Storage: RoomId -> List of Items
    private final Map<String, List<BoardItem>> roomItems = new ConcurrentHashMap<>();

    /**
     * Add an item to the board or update it
     */
    public void addOrUpdateItem(String roomId, BoardItem item) {
        List<BoardItem> items = roomItems.computeIfAbsent(roomId, k -> new CopyOnWriteArrayList<>());

        // Check if item exists and replace it (to handle updates/moves)
        boolean found = false;
        for (int i = 0; i < items.size(); i++) {
            if (items.get(i).getId().equals(item.getId())) {
                items.set(i, item);
                found = true;
                break;
            }
        }

        if (!found) {
            items.add(item);
        }
    }

    /**
     * Get all items for a room (History)
     */
    public List<BoardItem> getBoardItems(String roomId) {
        return roomItems.getOrDefault(roomId, Collections.emptyList());
    }

    /**
     * Clear all items in a room
     */
    public void clearRoom(String roomId) {
        roomItems.remove(roomId);
    }

    /**
     * Undo the last action in a room
     * Returns the ID of the deleted item, or null if nothing to undo
     */
    public BoardItem undoLastAction(String roomId) {
        List<BoardItem> items = roomItems.get(roomId);
        if (items == null || items.isEmpty())
            return null;

        // Remove the last item
        // Since we use CopyOnWriteArrayList, removing the last element is safe but
        // might be slow for huge lists.
        // For a whiteboard, it's acceptable.
        BoardItem lastItem = items.remove(items.size() - 1);
        return lastItem;
    }

    /**
     * Get total active rooms
     */
    public int getActiveRoomCount() {
        return roomItems.size();
    }
}
