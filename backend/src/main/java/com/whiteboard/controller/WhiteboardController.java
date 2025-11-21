package com.whiteboard.controller;

import com.whiteboard.model.BoardItem;
import com.whiteboard.service.WhiteboardService;
import com.whiteboard.service.RoomService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.List;

@Controller
public class WhiteboardController {

    private static final Logger logger = LoggerFactory.getLogger(WhiteboardController.class);

    @Autowired
    private WhiteboardService whiteboardService;

    @Autowired
    private RoomService roomService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    /**
     * Unified endpoint for all board updates (Shapes, Strokes, etc.)
     */
    @MessageMapping("/board/{roomId}")
    public void handleBoardEvent(@DestinationVariable String roomId, BoardItem item) {
        // Ensure roomId is set
        item.setRoomId(roomId);

        // Save to history
        // Note: In a real infinite canvas, we might only save "finished" items to
        // history
        // to avoid saving every single intermediate frame of a drag operation.
        // For now, we'll assume the frontend sends "finalized" items or we store
        // everything.
        // To keep it simple: We save everything. Frontend handles "preview" vs
        // "committed".
        whiteboardService.addOrUpdateItem(roomId, item);

        // Broadcast to all users in the room
        messagingTemplate.convertAndSend("/topic/board/" + roomId, item);
    }

    /**
     * Request history for a room
     */
    @MessageMapping("/history/{roomId}")
    public void getHistory(@DestinationVariable String roomId) {
        logger.info("📋 Requesting history for room: {}", roomId);
        List<BoardItem> history = whiteboardService.getBoardItems(roomId);

        // Send history as a single batch (Optimization Phase 2 preview: but let's do it
        // now if easy)
        // Actually, for now, let's send them one by one to match current frontend
        // expectation
        // OR send a wrapper. The plan said "Batch History" is Phase 2.
        // BUT, since we are rewriting the frontend, let's send a LIST.

        messagingTemplate.convertAndSend("/topic/history/" + roomId, history);
        logger.info("Sent {} items to {}", history.size(), roomId);
    }

    /**
     * Clear board
     */
    @MessageMapping("/clear/{roomId}")
    public void clearBoard(@DestinationVariable String roomId) {
        logger.info("🗑️ Clearing room: {}", roomId);
        whiteboardService.clearRoom(roomId);

        // Broadcast clear event
        BoardItem clearSignal = new BoardItem();
        clearSignal.setType("CLEAR");
        clearSignal.setRoomId(roomId);
        messagingTemplate.convertAndSend("/topic/board/" + roomId, clearSignal);
    }

    @MessageMapping("/disconnect/{roomId}")
    public void handleDisconnect(@DestinationVariable String roomId) {
        roomService.removeUserFromRoom(roomId);
    }

    /**
     * Undo last action
     */
    @MessageMapping("/undo/{roomId}")
    public void handleUndo(@DestinationVariable String roomId) {
        BoardItem deletedItem = whiteboardService.undoLastAction(roomId);
        if (deletedItem != null) {
            // Broadcast DELETE event
            BoardItem deleteEvent = new BoardItem();
            deleteEvent.setType("DELETE");
            deleteEvent.setId(deletedItem.getId());
            deleteEvent.setRoomId(roomId);
            messagingTemplate.convertAndSend("/topic/board/" + roomId, deleteEvent);
        }
    }

    /**
     * Cursor Movement (Pass-through, no persistence)
     */
    @MessageMapping("/cursor/{roomId}")
    public void handleCursor(@DestinationVariable String roomId, CursorData cursor) {
        messagingTemplate.convertAndSend("/topic/cursors/" + roomId, cursor);
    }

    // Simple DTO for Cursor
    public static class CursorData {
        public String userId;
        public String userName;
        public double x;
        public double y;
    }
}
