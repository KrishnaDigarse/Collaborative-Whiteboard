package com.whiteboard.model;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class Shape {
    private String type; // RECTANGLE, CIRCLE, OVAL, LINE, TRIANGLE, etc.
    private double startX;
    private double startY;
    private double endX;
    private double endY;
    private String color;
    private int strokeWidth;
    private boolean filled;
    private String roomId;

    public Shape() {}

    public Shape(String type, double startX, double startY, double endX, double endY, String color, int strokeWidth, boolean filled) {
        this.type = type;
        this.startX = startX;
        this.startY = startY;
        this.endX = endX;
        this.endY = endY;
        this.color = color;
        this.strokeWidth = strokeWidth;
        this.filled = filled;
    }

    public Shape(String type, double startX, double startY, double endX, double endY, String color, int strokeWidth, boolean filled, String roomId) {
        this.type = type;
        this.startX = startX;
        this.startY = startY;
        this.endX = endX;
        this.endY = endY;
        this.color = color;
        this.strokeWidth = strokeWidth;
        this.filled = filled;
        this.roomId = roomId;
    }

    public enum ShapeType {
        RECTANGLE, CIRCLE, OVAL, LINE, TRIANGLE, SQUARE, POLYGON
    }
}
