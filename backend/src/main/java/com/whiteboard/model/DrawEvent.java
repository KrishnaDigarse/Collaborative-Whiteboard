package com.whiteboard.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DrawEvent {
    private double x;
    private double y;
    private String color;
    @JsonProperty("isDrawing")
    private boolean isDrawing;
    private String roomId;

    public DrawEvent() {}

    public DrawEvent(double x, double y, String color, boolean isDrawing) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.isDrawing = isDrawing;
    }
}
