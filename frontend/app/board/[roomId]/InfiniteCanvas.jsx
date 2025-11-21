'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const BACKEND_URL = 'http://localhost:8080/ws';

export default function InfiniteCanvas() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = params?.roomId;
  const userName = searchParams.get('name') || 'Guest';

  // --- State ---
  const [items, setItems] = useState([]); // All board items (strokes, shapes)
  const [cursors, setCursors] = useState({}); // { userId: { x, y, userName } }
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [tool, setTool] = useState('PEN'); // PEN, RECTANGLE, CIRCLE, TEXT, PAN
  const [color, setColor] = useState('#ffffff');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [isConnected, setIsConnected] = useState(false);
  const [textInput, setTextInput] = useState({ x: 0, y: 0, visible: false, value: '' });

  // --- Refs ---
  const canvasRef = useRef(null);
  const stompClientRef = useRef(null);
  const isDraggingRef = useRef(false);
  const currentItemRef = useRef(null); // The item currently being drawn
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const myUserIdRef = useRef(crypto.randomUUID());

  // --- Coordinate Systems ---
  const toWorld = useCallback((screenX, screenY) => {
    return {
      x: (screenX - camera.x) / camera.zoom,
      y: (screenY - camera.y) / camera.zoom,
    };
  }, [camera]);

  const toScreen = useCallback((worldX, worldY) => {
    return {
      x: worldX * camera.zoom + camera.x,
      y: worldY * camera.zoom + camera.y,
    };
  }, [camera]);

  // --- Rendering ---
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Clear screen
    ctx.fillStyle = '#121212'; // Dark background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply Camera Transform
    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);

    // Draw All Items
    [...items, currentItemRef.current].forEach(item => {
      if (!item) return;
      ctx.strokeStyle = item.strokeColor || '#fff';
      ctx.fillStyle = item.strokeColor || '#fff';
      ctx.lineWidth = item.strokeWidth || 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.font = `${item.fontSize || 20}px sans-serif`;
      ctx.beginPath();

      if (item.type === 'PEN' && item.points && item.points.length > 0) {
        ctx.moveTo(item.points[0].x, item.points[0].y);
        for (let i = 1; i < item.points.length - 1; i++) {
          const p1 = item.points[i];
          const p2 = item.points[i + 1];
          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;
          ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
        }
        if (item.points.length > 1) {
          const last = item.points[item.points.length - 1];
          ctx.lineTo(last.x, last.y);
        }
        ctx.stroke();
      } else if (item.type === 'RECTANGLE') {
        ctx.strokeRect(item.startX, item.startY, item.endX - item.startX, item.endY - item.startY);
      } else if (item.type === 'CIRCLE') {
        const radius = Math.sqrt(Math.pow(item.endX - item.startX, 2) + Math.pow(item.endY - item.startY, 2));
        ctx.beginPath();
        ctx.arc(item.startX, item.startY, radius, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (item.type === 'TEXT' && item.text) {
        ctx.fillText(item.text, item.startX, item.startY);
      }
    });

    // Draw Cursors (Remote Users)
    Object.entries(cursors).forEach(([userId, cursor]) => {
      if (userId === myUserIdRef.current) return; // Don't draw own cursor

      ctx.fillStyle = cursor.color || '#ff0000'; // Could assign random colors based on ID
      ctx.beginPath();
      ctx.arc(cursor.x, cursor.y, 5 / camera.zoom, 0, 2 * Math.PI);
      ctx.fill();

      // Draw Name Tag
      ctx.fillStyle = 'white';
      ctx.font = `${14 / camera.zoom}px sans-serif`;
      ctx.fillText(cursor.userName || 'User', cursor.x + 10 / camera.zoom, cursor.y + 10 / camera.zoom);
    });

    ctx.restore();
  }, [items, camera, cursors]);

  // Animation Loop
  useEffect(() => {
    let animationFrameId;
    const loop = () => {
      render();
      animationFrameId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animationFrameId);
  }, [render]);

  // --- Utils ---
  const throttle = (func, limit) => {
    let inThrottle;
    return function (...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }
  };

  // Throttled sender
  const throttledSendRef = useRef(
    throttle((client, roomId, item) => {
      if (client && client.connected) {
        client.publish({
          destination: `/app/board/${roomId}`,
          body: JSON.stringify(item),
        });
      }
    }, 30)
  );

  // Throttled Cursor Sender
  const throttledCursorRef = useRef(
    throttle((client, roomId, cursorData) => {
      if (client && client.connected) {
        client.publish({
          destination: `/app/cursor/${roomId}`,
          body: JSON.stringify(cursorData)
        });
      }
    }, 50)
  );

  // --- WebSocket ---
  useEffect(() => {
    if (!roomId) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(BACKEND_URL),
      reconnectDelay: 5000,
      onConnect: () => {
        setIsConnected(true);
        console.log('Connected to WS');

        // Subscribe to Board Updates
        client.subscribe(`/topic/board/${roomId}`, (message) => {
          const item = JSON.parse(message.body);
          if (item.type === 'CLEAR') {
            setItems([]);
          } else if (item.type === 'DELETE') {
            setItems(prev => prev.filter(i => i.id !== item.id));
          } else {
            setItems(prev => {
              const filtered = prev.filter(i => i.id !== item.id);
              return [...filtered, item];
            });
          }
        });

        // Subscribe to History
        client.subscribe(`/topic/history/${roomId}`, (message) => {
          const history = JSON.parse(message.body);
          if (Array.isArray(history)) {
            setItems(history);
          }
        });

        // Subscribe to Cursors
        client.subscribe(`/topic/cursors/${roomId}`, (message) => {
          const cursorData = JSON.parse(message.body);
          if (cursorData.userId !== myUserIdRef.current) {
            setCursors(prev => ({
              ...prev,
              [cursorData.userId]: cursorData
            }));
          }
        });

        // Request History
        client.publish({ destination: `/app/history/${roomId}` });
      },
      onDisconnect: () => setIsConnected(false),
    });

    client.activate();
    stompClientRef.current = client;

    return () => {
      client.deactivate();
    };
  }, [roomId]);

  // --- Input Handling ---
  const handleMouseDown = (e) => {
    const { clientX, clientY } = e;
    const worldPos = toWorld(clientX, clientY);
    lastMousePosRef.current = { x: clientX, y: clientY };

    if (tool === 'TEXT') {
      setTextInput({ x: clientX, y: clientY, visible: true, value: '', worldX: worldPos.x, worldY: worldPos.y });
      return;
    }

    isDraggingRef.current = true;

    if (tool === 'PAN' || e.button === 1 || e.key === ' ') {
      return;
    }

    // Start Drawing
    const id = crypto.randomUUID();
    currentItemRef.current = {
      id,
      type: tool,
      roomId,
      strokeColor: color,
      strokeWidth: strokeWidth,
      startX: worldPos.x,
      startY: worldPos.y,
      endX: worldPos.x,
      endY: worldPos.y,
      points: tool === 'PEN' ? [{ x: worldPos.x, y: worldPos.y }] : [],
    };
  };

  const handleMouseMove = (e) => {
    const { clientX, clientY } = e;
    const worldPos = toWorld(clientX, clientY);

    // Broadcast Cursor
    throttledCursorRef.current(stompClientRef.current, roomId, {
      userId: myUserIdRef.current,
      userName: userName,
      x: worldPos.x,
      y: worldPos.y
    });

    if (!isDraggingRef.current) return;

    // Handle Pan
    if (tool === 'PAN' || e.buttons === 4) {
      const dx = clientX - lastMousePosRef.current.x;
      const dy = clientY - lastMousePosRef.current.y;
      setCamera(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      lastMousePosRef.current = { x: clientX, y: clientY };
      return;
    }

    // Handle Draw
    if (currentItemRef.current) {
      const item = currentItemRef.current;

      if (item.type === 'PEN') {
        item.points.push({ x: worldPos.x, y: worldPos.y });
      } else {
        item.endX = worldPos.x;
        item.endY = worldPos.y;
      }

      throttledSendRef.current(stompClientRef.current, roomId, item);
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;

    if (currentItemRef.current) {
      // Finalize item
      const finalItem = { ...currentItemRef.current };
      setItems(prev => [...prev, finalItem]);

      // Send to Backend
      if (stompClientRef.current && stompClientRef.current.connected) {
        stompClientRef.current.publish({
          destination: `/app/board/${roomId}`,
          body: JSON.stringify(finalItem),
        });
      }

      currentItemRef.current = null;
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const scaleBy = 1.1;
    const oldZoom = camera.zoom;
    const newZoom = e.deltaY < 0 ? oldZoom * scaleBy : oldZoom / scaleBy;

    // Zoom towards mouse pointer
    const mouseX = e.clientX;
    const mouseY = e.clientY;

    const worldMouseX = (mouseX - camera.x) / oldZoom;
    const worldMouseY = (mouseY - camera.y) / oldZoom;

    const newX = mouseX - worldMouseX * newZoom;
    const newY = mouseY - worldMouseY * newZoom;

    setCamera({ x: newX, y: newY, zoom: newZoom });
  };

  // --- Actions ---
  const handleUndo = () => {
    if (stompClientRef.current && stompClientRef.current.connected) {
      stompClientRef.current.publish({ destination: `/app/undo/${roomId}` });
    }
  };

  const handleExport = () => {
    const canvas = document.createElement('canvas');
    if (items.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    items.forEach(item => {
      if (item.type === 'PEN') {
        item.points.forEach(p => {
          minX = Math.min(minX, p.x);
          minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x);
          maxY = Math.max(maxY, p.y);
        });
      } else if (item.startX !== undefined) {
        minX = Math.min(minX, item.startX, item.endX);
        minY = Math.min(minY, item.startY, item.endY);
        maxX = Math.max(maxX, item.startX, item.endX);
        maxY = Math.max(maxY, item.startY, item.endY);
      }
    });

    const padding = 50;
    minX -= padding; minY -= padding; maxX += padding; maxY += padding;

    const width = maxX - minX;
    const height = maxY - minY;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, width, height);

    ctx.translate(-minX, -minY);

    items.forEach(item => {
      ctx.strokeStyle = item.strokeColor || '#fff';
      ctx.fillStyle = item.strokeColor || '#fff';
      ctx.lineWidth = item.strokeWidth || 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.font = `${item.fontSize || 20}px sans-serif`;
      ctx.beginPath();

      if (item.type === 'PEN' && item.points && item.points.length > 0) {
        ctx.moveTo(item.points[0].x, item.points[0].y);
        for (let i = 1; i < item.points.length - 1; i++) {
          const p1 = item.points[i];
          const p2 = item.points[i + 1];
          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;
          ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
        }
        if (item.points.length > 1) {
          const last = item.points[item.points.length - 1];
          ctx.lineTo(last.x, last.y);
        }
        ctx.stroke();
      } else if (item.type === 'RECTANGLE') {
        ctx.strokeRect(item.startX, item.startY, item.endX - item.startX, item.endY - item.startY);
      } else if (item.type === 'CIRCLE') {
        const radius = Math.sqrt(Math.pow(item.endX - item.startX, 2) + Math.pow(item.endY - item.startY, 2));
        ctx.beginPath();
        ctx.arc(item.startX, item.startY, radius, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (item.type === 'TEXT' && item.text) {
        ctx.fillText(item.text, item.startX, item.startY);
      }
    });

    const link = document.createElement('a');
    link.download = `whiteboard-${roomId}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const handleTextSubmit = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const text = textInput.value;
      if (text.trim()) {
        const item = {
          id: crypto.randomUUID(),
          type: 'TEXT',
          roomId,
          text,
          fontSize: 20,
          strokeColor: color,
          startX: textInput.worldX,
          startY: textInput.worldY,
        };
        setItems(prev => [...prev, item]);
        if (stompClientRef.current) {
          stompClientRef.current.publish({
            destination: `/app/board/${roomId}`,
            body: JSON.stringify(item),
          });
        }
      }
      setTextInput({ ...textInput, visible: false, value: '' });
    }
  };

  // Resize Handler
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="w-full h-screen overflow-hidden bg-[#121212] text-white relative">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="block touch-none cursor-crosshair"
      />

      {/* Text Input Overlay */}
      {textInput.visible && (
        <textarea
          style={{
            position: 'absolute',
            left: textInput.x,
            top: textInput.y,
            color: color,
            fontSize: '20px',
            background: 'transparent',
            border: '1px dashed #555',
            outline: 'none',
            minWidth: '100px',
            minHeight: '30px',
          }}
          autoFocus
          value={textInput.value}
          onChange={e => setTextInput({ ...textInput, value: e.target.value })}
          onKeyDown={handleTextSubmit}
          onBlur={() => setTextInput({ ...textInput, visible: false })}
        />
      )}

      {/* Toolbar */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-[#232329] p-2 rounded-lg shadow-xl flex gap-2 border border-gray-700 items-center">
        <button onClick={() => setTool('PAN')} className={`p-2 rounded ${tool === 'PAN' ? 'bg-blue-600' : 'hover:bg-gray-700'}`} title="Pan (Space)">✋</button>
        <button onClick={() => setTool('PEN')} className={`p-2 rounded ${tool === 'PEN' ? 'bg-blue-600' : 'hover:bg-gray-700'}`} title="Pen">✏️</button>
        <button onClick={() => setTool('RECTANGLE')} className={`p-2 rounded ${tool === 'RECTANGLE' ? 'bg-blue-600' : 'hover:bg-gray-700'}`} title="Rectangle">⬜</button>
        <button onClick={() => setTool('CIRCLE')} className={`p-2 rounded ${tool === 'CIRCLE' ? 'bg-blue-600' : 'hover:bg-gray-700'}`} title="Circle">◯</button>
        <button onClick={() => setTool('TEXT')} className={`p-2 rounded ${tool === 'TEXT' ? 'bg-blue-600' : 'hover:bg-gray-700'}`} title="Text">T</button>

        <div className="w-px h-6 bg-gray-600 mx-1"></div>

        <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-8 h-8 bg-transparent cursor-pointer border-none" title="Color" />
        <input type="range" min="1" max="20" value={strokeWidth} onChange={e => setStrokeWidth(parseInt(e.target.value))} className="w-20" title="Stroke Width" />

        <div className="w-px h-6 bg-gray-600 mx-1"></div>

        <button onClick={handleUndo} className="p-2 rounded hover:bg-gray-700" title="Undo">↩️</button>
        <button onClick={handleExport} className="p-2 rounded hover:bg-gray-700" title="Export Image">💾</button>
        <button onClick={() => router.push('/')} className="p-2 rounded hover:bg-red-900 text-red-400" title="Exit Room">🚪</button>
      </div>

      {/* Zoom Bar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-[#232329] px-4 py-2 rounded-full shadow-xl flex gap-4 border border-gray-700 items-center text-sm">
        <button onClick={() => setCamera(prev => ({ ...prev, zoom: prev.zoom / 1.2 }))} className="hover:text-blue-400 font-bold">−</button>
        <span className="w-12 text-center">{Math.round(camera.zoom * 100)}%</span>
        <button onClick={() => setCamera(prev => ({ ...prev, zoom: prev.zoom * 1.2 }))} className="hover:text-blue-400 font-bold">+</button>
        <button onClick={() => setCamera({ x: 0, y: 0, zoom: 1 })} className="text-xs text-gray-400 hover:text-white ml-2">Reset</button>
      </div>

      {/* Status */}
      <div className="fixed bottom-4 right-4 text-xs text-gray-500">
        {isConnected ? '🟢 Online' : '🔴 Offline'}
      </div>
    </div>
  );
}
