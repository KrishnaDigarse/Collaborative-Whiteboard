"use client";
import { useState, useEffect, useRef } from "react";
import Canvas from "../components/Canvas";
import TopNavbar from "../components/TopNavbar";
import { useWebSocket } from "../hooks/useWebSocket";
import { useCanvas } from "../hooks/useCanvas";

const BACKEND_URL = 'http://localhost:8080/ws';

export default function Whiteboard() {
  const [selectedColor, setSelectedColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(2);
  const sendDrawEventRef = useRef(null);

  // Initialize canvas with handlers that use the ref
  const {
    canvasRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    drawRemoteStroke,
    clearCanvas
  } = useCanvas(
    (x, y, color) => {
      // handleDrawStart - user is starting to draw
      const sendFn = sendDrawEventRef.current;
      if (sendFn) {
        sendFn({ x, y, color, isDrawing: true });
      }
    },
    (x, y, color) => {
      // handleDrawMove - user is dragging
      const sendFn = sendDrawEventRef.current;
      if (sendFn) {
        sendFn({ x, y, color, isDrawing: true });
      }
    },
    () => {
      // handleDrawEnd - user released the mouse
      const sendFn = sendDrawEventRef.current;
      if (sendFn) {
        sendFn({ x: 0, y: 0, color: selectedColor, isDrawing: false });
      }
    }
  );

  // Initialize WebSocket connection with remote draw handler
  const {
    isConnected,
    roomId,
    connectToRoom,
    disconnectFromRoom,
    sendDrawEvent
  } = useWebSocket(BACKEND_URL, (event) => {
    if (event.x !== undefined && event.y !== undefined) {
      drawRemoteStroke(event);
    }
  });

  // Update ref when sendDrawEvent changes
  useEffect(() => {
    sendDrawEventRef.current = sendDrawEvent;
  }, [sendDrawEvent]);

  return (
    <div className="w-full h-screen bg-black overflow-hidden">
      {/* Canvas */}
      <Canvas
        canvasRef={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        color={selectedColor}
      />

      {/* Top Navbar Overlay */}
      <TopNavbar
        isConnected={isConnected}
        roomId={roomId}
        selectedColor={selectedColor}
        onColorChange={setSelectedColor}
        onClearCanvas={clearCanvas}
        onJoinRoom={connectToRoom}
        onLeaveRoom={disconnectFromRoom}
        brushSize={brushSize}
        onBrushSizeChange={setBrushSize}
      />
    </div>
  );
}
