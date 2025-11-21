package com.whiteboard.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.List;
import java.util.ArrayList;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BoardItem {
    private String id;
    private String type; // PEN, RECTANGLE, CIRCLE, OVAL, LINE, TRIANGLE, TEXT
    private String roomId;

    // Style
    private String strokeColor;
    private int strokeWidth;
    private String backgroundColor; // For filled shapes
    private boolean isFilled;

    // Text Tool Fields
    private String text;
    private int fontSize;

    // For Shapes (Bounding Box / Start-End)
    private Double startX;
    private Double startY;
    private Double endX;
    private Double endY;

    // For Pen (Freehand)
    private List<Point> points = new ArrayList<>();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Point {
        private double x;
        private double y;
    }
}
