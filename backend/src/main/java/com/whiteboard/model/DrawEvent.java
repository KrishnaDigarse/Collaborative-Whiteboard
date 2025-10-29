package com.whiteboard.model;


import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DrawEvent {
    private double x;
    private double y;
    private String color;
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
