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
    private String drawingMode;
    private String toolType;
    private int brushSize;
    private ShapeData shapeData;

    public DrawEvent() {}

    public DrawEvent(double x, double y, String color, boolean isDrawing) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.isDrawing = isDrawing;
    }

    @Getter
    @Setter
    public static class ShapeData {
        private double startX;
        private double startY;
        private double endX;
        private double endY;
        private String shape;

        public ShapeData() {}

        public ShapeData(double startX, double startY, double endX, double endY, String shape) {
            this.startX = startX;
            this.startY = startY;
            this.endX = endX;
            this.endY = endY;
            this.shape = shape;
        }
    }
}
