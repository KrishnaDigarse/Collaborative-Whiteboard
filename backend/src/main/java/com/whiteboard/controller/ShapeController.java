package com.whiteboard.controller;

import com.whiteboard.model.Shape;
import com.whiteboard.service.ShapeService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import java.util.List;

@Controller
public class ShapeController {

    private static final Logger logger = LoggerFactory.getLogger(ShapeController.class);

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private ShapeService shapeService;

    /**
     * Handle drawing a new shape
     */
    @MessageMapping("/shape/{roomId}")
    public void drawShape(@DestinationVariable String roomId, Shape shape) {
        logger.info("🔷 Shape draw event RECEIVED");
        logger.info("   Room: {}", roomId);
        logger.info("   Type: {}, Color: {}, Stroke: {}", shape.getType(), shape.getColor(), shape.getStrokeWidth());
        logger.info("   Start: ({}, {}), End: ({}, {})", 
            shape.getStartX(), shape.getStartY(), shape.getEndX(), shape.getEndY());

        // Save shape to history
        shapeService.addShape(roomId, shape);

        // Broadcast to all users in the room
        String topicDestination = "/topic/shapes/" + roomId;
        logger.info("📤 Broadcasting shape to topic: {}", topicDestination);
        messagingTemplate.convertAndSend(topicDestination, shape);
        logger.info("✓ Shape broadcasted successfully");
    }

    /**
     * Request all shapes in a room (for new users joining)
     */
    @MessageMapping("/shapes/{roomId}")
    public void getShapes(@DestinationVariable String roomId) {
        logger.info("📋 Requesting all shapes for room: {}", roomId);
        List<Shape> shapes = shapeService.getShapes(roomId);
        logger.info("📊 Sending {} shapes to new user", shapes.size());

        String topicDestination = "/topic/shapes/history/" + roomId;
        
        // Send all shapes
        for (Shape shape : shapes) {
            messagingTemplate.convertAndSend(topicDestination, shape);
        }

        // Send completion signal
        Shape completionSignal = new Shape();
        completionSignal.setType("__SHAPES_COMPLETE__");
        completionSignal.setRoomId(roomId);
        messagingTemplate.convertAndSend(topicDestination, completionSignal);
        
        logger.info("✓ Shapes sent to new user");
    }

    /**
     * Clear all shapes in a room
     */
    @MessageMapping("/shapes/clear/{roomId}")
    public void clearShapes(@DestinationVariable String roomId) {
        logger.info("🗑️ Clearing all shapes in room: {}", roomId);
        shapeService.clearShapes(roomId);

        String topicDestination = "/topic/shapes/" + roomId;
        Shape clearSignal = new Shape();
        clearSignal.setType("__CLEAR_ALL__");
        messagingTemplate.convertAndSend(topicDestination, clearSignal);
        
        logger.info("✓ Shapes cleared");
    }
}
