package com.whiteboard.controller;

import com.whiteboard.model.DrawEvent;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Controller
public class WhiteboardController {

    @MessageMapping("/draw")
    @SendTo("/topic/board/{roomId}")
    public DrawEvent handleDrawEvent(DrawEvent event) {
        return event;
    }

    @MessageMapping("/draw/{roomId}")
    @SendTo("/topic/board/{roomId}")
    public DrawEvent handleRoomDrawEvent(DrawEvent event) {
        return event;
    }
}
