package com.whiteboard.config;

import com.whiteboard.service.RoomService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;

@Component
public class WebSocketEventListener {
    private static final Logger logger = LoggerFactory.getLogger(WebSocketEventListener.class);

    @Autowired
    private RoomService roomService;

    /**
     * Listen for WebSocket subscription events to track room joins
     */
    @EventListener
    public void handleWebSocketSubscribeListener(SessionSubscribeEvent event) {
        SimpMessageHeaderAccessor headers = SimpMessageHeaderAccessor.wrap(event.getMessage());
        String destination = headers.getDestination();
        
        if (destination != null && destination.startsWith("/topic/board/")) {
            // Extract roomId from destination like /topic/board/roomId
            String roomId = destination.substring("/topic/board/".length());
            roomService.addUserToRoom(roomId);
            logger.info("✅ User subscribed to room: {}", roomId);
        } else if (destination != null && destination.startsWith("/topic/shapes/")) {
            // Track shape topic subscriptions as well
            String roomId = destination.substring("/topic/shapes/".length());
            roomService.addUserToRoom(roomId);
            logger.info("✅ User subscribed to shapes in room: {}", roomId);
        }
    }

    /**
     * Listen for WebSocket disconnect events to track room leaves
     */
    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        SimpMessageHeaderAccessor headers = SimpMessageHeaderAccessor.wrap(event.getMessage());
        String sessionId = headers.getSessionId();
        logger.info("🔴 User disconnected - Session: {}", sessionId);
        
        // Clear data for all rooms since we don't have room-specific tracking per connection
        // This is a limitation - we'll need to track subscriptions per session
        // For now, we'll rely on client-side disconnect handling
    }
}
