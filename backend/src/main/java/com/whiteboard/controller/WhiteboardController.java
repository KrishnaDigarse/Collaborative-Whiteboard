package com.whiteboard.controller;

import com.whiteboard.model.DrawEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
public class WhiteboardController {

    private static final Logger logger = LoggerFactory.getLogger(WhiteboardController.class);

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/draw")
    public void handleDrawEvent(DrawEvent event) {
        logger.info("📩 Draw event RECEIVED - Room: {}, X: {}, Y: {}, Color: {}", 
            event.getRoomId(), event.getX(), event.getY(), event.getColor());
        
        // Send to all subscribers of this room
        String topicDestination = "/topic/board/" + event.getRoomId();
        logger.info("📤 Broadcasting to topic: {}", topicDestination);
        
        messagingTemplate.convertAndSend(topicDestination, event);
        logger.info("✓ Broadcasted event to {}", topicDestination);
    }

    @MessageMapping("/draw/{roomId}")
    public void handleRoomDrawEvent(@DestinationVariable String roomId, DrawEvent event) {
        logger.info("📩 Room-specific draw event RECEIVED - Room: {}, X: {}, Y: {}, Color: {}", 
            roomId, event.getX(), event.getY(), event.getColor());
        
        // Ensure roomId is set in the event
        event.setRoomId(roomId);
        
        // Send to all subscribers of this room
        String topicDestination = "/topic/board/" + roomId;
        logger.info("📤 Broadcasting to topic: {}", topicDestination);
        
        messagingTemplate.convertAndSend(topicDestination, event);
        logger.info("✓ Broadcasted event to {}", topicDestination);
    }
}
