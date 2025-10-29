"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { Client } from '@stomp/stompjs';
import SockJS from "sockjs-client";

export default function Whiteboard() {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const lastRemoteRef = useRef({ x: null, y: null });
  const [drawing, setDrawing] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [stompClient, setStompClient] = useState(null);

  const drawLine = useCallback((x, y, color, isDrawing) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    if (!isDrawing) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }, []);

  const drawSegment = useCallback((x1, y1, x2, y2, color) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }, []);

  const handleDrawEvent = useCallback((message) => {
    const event = JSON.parse(message.body);
    if (event.x !== undefined && event.y !== undefined) {
      if (lastRemoteRef.current.x !== null && lastRemoteRef.current.y !== null) {
        drawSegment(
          lastRemoteRef.current.x,
          lastRemoteRef.current.y,
          event.x,
          event.y,
          event.color
        );
      }

      if (!event.isDrawing) {
        // keep last position for smooth stroke
        lastRemoteRef.current = { x: event.x, y: event.y };
      } else {
        // stroke ended — reset
        lastRemoteRef.current = { x: null, y: null };
      }
    }
  }, [drawSegment]);

  const connectToRoom = useCallback((newRoomId) => {
    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      onConnect: () => {
        console.log('Connected to room:', newRoomId);
        client.subscribe(`/topic/board/${newRoomId}`, handleDrawEvent);
        setIsConnected(true);
      },
      onDisconnect: () => {
        console.log('Disconnected from room:', newRoomId);
        setIsConnected(false);
      }
    });

    client.activate();
    setStompClient(client);
  }, [handleDrawEvent]);

  const disconnectFromRoom = useCallback(() => {
    if (stompClient) {
      stompClient.deactivate();
      setStompClient(null);
    }
    setIsConnected(false);
    setRoomId('');
  }, [stompClient]);

  const joinRoom = useCallback((targetRoomId) => {
    if (stompClient) {
      stompClient.deactivate();
    }
    connectToRoom(targetRoomId);
  }, [stompClient, connectToRoom]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isConnected) return;
    
    canvas.width = window.innerWidth - 100;
    canvas.height = window.innerHeight - 100;
    const context = canvas.getContext("2d");
    ctxRef.current = context;

    return () => {
      if (stompClient) {
        stompClient.deactivate();
        setStompClient(null);
      }
    };
  }, [isConnected, stompClient]);

  const startDrawing = useCallback((e) => {
    if (!stompClient || !isConnected) return;
    setDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    drawLine(x, y, '#000000', false);
    stompClient.publish({
      destination: `/app/draw/${roomId}`,
      body: JSON.stringify({
        x,
        y,
        color: '#000000',
        isDrawing: false,
        roomId: roomId
      })
    });
  }, [drawLine, roomId, isConnected, stompClient]);

  const stopDrawing = useCallback(() => {
    setDrawing(false);
  }, []);

  const draw = useCallback((e) => {
    if (!drawing || !stompClient || !isConnected) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    drawLine(x, y, '#000000', true);
    stompClient.publish({
      destination: `/app/draw/${roomId}`,
      body: JSON.stringify({
        x,
        y,
        color: '#000000',
        isDrawing: true,
        roomId: roomId
      })
    });
  }, [drawing, drawLine, roomId, isConnected, stompClient]);

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-zinc-900">
      {!isConnected ? (
        <div className="mb-4 p-4 bg-zinc-700 rounded shadow">
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Enter Room ID"
            className="border p-2 rounded mr-2 text-white"
          />
          <button
            onClick={() => {
              if (roomId) {
                joinRoom(roomId);
              }
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Join Room
          </button>
        </div>
      ) : (
        <div className="flex items-center mb-4">
          <span className="mr-2">Room: {roomId}</span>
          <button
            onClick={disconnectFromRoom}
            className="bg-red-500 text-white px-4 py-2 rounded"
          >
            Leave Room
          </button>
        </div>
      )}
      {isConnected && (
        <canvas
          ref={canvasRef}
          className="bg-zinc-400"
          onMouseDown={startDrawing}
          onMouseUp={stopDrawing}
          onMouseMove={draw}
        />
      )}
    </div>
  );
}