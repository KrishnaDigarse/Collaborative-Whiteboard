package com.whiteboard.controller;

import com.whiteboard.model.DrawEvent;
import com.whiteboard.service.DrawingHistoryService;
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
    private DrawingHistoryService drawingHistoryService;

    @Autowired
    private RoomService roomService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/draw/{roomId}")
    public void handleRoomDrawEvent(@DestinationVariable String roomId, DrawEvent event) {
        logger.info("📩 Room-specific draw event RECEIVED - Room: {}, X: {}, Y: {}, Color: {}", 
            roomId, event.getX(), event.getY(), event.getColor());
        
        // Ensure roomId is set in the event
        event.setRoomId(roomId);
        
        // Save to history (for pen strokes)
        if (event.isDrawing() || event.getShapeData() != null) {
            drawingHistoryService.addEvent(roomId, event);
        }
        
        // Broadcast to all users in the room for live drawing
        String topicDestination = "/topic/board/" + roomId;
        messagingTemplate.convertAndSend(topicDestination, event);
        logger.info("📤 Broadcasted pen event to {}", topicDestination);
    }

    @MessageMapping("/history/{roomId}")
    public void getDrawingHistory(@DestinationVariable String roomId) {
        logger.info("📋 Requesting drawing history for room: {}", roomId);
        List<DrawEvent> history = drawingHistoryService.getHistory(roomId);
        logger.info("📊 Sending {} events from history", history.size());
        
        String topicDestination = "/topic/history/" + roomId;
        if (history != null && !history.isEmpty()) {
            for (DrawEvent event : history) {
                if (event != null) {
                    messagingTemplate.convertAndSend(topicDestination, event);
                }
            }
        }
        
        // Send a completion signal
        DrawEvent completionSignal = new DrawEvent();
        completionSignal.setRoomId(roomId);
        completionSignal.setColor("__HISTORY_COMPLETE__");
        messagingTemplate.convertAndSend(topicDestination, completionSignal);
        logger.info("✓ History replay complete");
    }

    @MessageMapping("/disconnect/{roomId}")
    public void handleRoomDisconnect(@DestinationVariable String roomId) {
        logger.info("👋 User disconnecting from room: {}", roomId);
        roomService.removeUserFromRoom(roomId);
    }
}
