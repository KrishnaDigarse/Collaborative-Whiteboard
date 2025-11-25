'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const getBackendUrl = () => {
  const url = "whiteboard-backend-q24z.onrender.com";
  if (url && !url.startsWith('http')) {
    return `https://${url}/ws`;
  }
  return url || 'http://localhost:8080/ws';
};

const BACKEND_URL = getBackendUrl();

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
  const [tool, setTool] = useState('PEN'); // PEN, RECTANGLE, CIRCLE, LINE, ARROW, TEXT, PAN, ERASER
  const [eraserType, setEraserType] = useState('STANDARD'); // STANDARD (Mask), OBJECT (Delete)
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

  // --- Hit Testing ---
  const isPointInItem = (x, y, item) => {
    const tolerance = 5 / camera.zoom; // Adjust tolerance based on zoom

    if (item.type === 'RECTANGLE') {
      const minX = Math.min(item.startX, item.endX);
      const maxX = Math.max(item.startX, item.endX);
      const minY = Math.min(item.startY, item.endY);
      const maxY = Math.max(item.startY, item.endY);
      // Check if point is near the border (hollow rectangle)
      const outer = (x >= minX - tolerance && x <= maxX + tolerance && y >= minY - tolerance && y <= maxY + tolerance);
      const inner = (x >= minX + tolerance && x <= maxX - tolerance && y >= minY + tolerance && y <= maxY - tolerance);
      return outer && !inner;
    } else if (item.type === 'CIRCLE') {
      const radius = Math.sqrt(Math.pow(item.endX - item.startX, 2) + Math.pow(item.endY - item.startY, 2));
      const dist = Math.sqrt(Math.pow(x - item.startX, 2) + Math.pow(y - item.startY, 2));
      return Math.abs(dist - radius) <= tolerance;
    } else if (item.type === 'PEN') {
      if (!item.points) return false;
      for (let i = 0; i < item.points.length - 1; i++) {
        const p1 = item.points[i];
        const p2 = item.points[i + 1];
        if (isPointNearLine(x, y, p1, p2, tolerance)) return true;
      }
      return false;
    } else if (item.type === 'LINE' || item.type === 'ARROW') {
      const p1 = { x: item.startX, y: item.startY };
      const p2 = { x: item.endX, y: item.endY };
      return isPointNearLine(x, y, p1, p2, tolerance);
    } else if (item.type === 'TEXT') {
      // Approximate text bounds (very rough)
      const width = (item.text?.length || 0) * (item.fontSize || 20) * 0.6;
      const height = (item.fontSize || 20);
      return x >= item.startX && x <= item.startX + width && y >= item.startY - height && y <= item.startY;
    }
    return false;
  };

  const isPointNearLine = (x, y, p1, p2, tolerance) => {
    const A = x - p1.x;
    const B = y - p1.y;
    const C = p2.x - p1.x;
    const D = p2.y - p1.y;
    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;
    if (len_sq !== 0) param = dot / len_sq;
    let xx, yy;
    if (param < 0) { xx = p1.x; yy = p1.y; }
    else if (param > 1) { xx = p2.x; yy = p2.y; }
    else { xx = p1.x + param * C; yy = p1.y + param * D; }
    const dx = x - xx;
    const dy = y - yy;
    return (dx * dx + dy * dy) <= tolerance * tolerance;
  };

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
      } else if (item.type === 'LINE') {
        ctx.moveTo(item.startX, item.startY);
        ctx.lineTo(item.endX, item.endY);
        ctx.stroke();
      } else if (item.type === 'ARROW') {
        ctx.moveTo(item.startX, item.startY);
        ctx.lineTo(item.endX, item.endY);
        ctx.stroke();

        // Arrowhead
        const angle = Math.atan2(item.endY - item.startY, item.endX - item.startX);
        const headLength = 20 / camera.zoom * (item.strokeWidth / 2); // Scale with zoom/width roughly
        const actualHeadLength = Math.max(10, headLength);

        ctx.beginPath();
        ctx.moveTo(item.endX, item.endY);
        ctx.lineTo(item.endX - actualHeadLength * Math.cos(angle - Math.PI / 6), item.endY - actualHeadLength * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(item.endX, item.endY);
        ctx.lineTo(item.endX - actualHeadLength * Math.cos(angle + Math.PI / 6), item.endY - actualHeadLength * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      } else if (item.type === 'TEXT' && item.text) {
        ctx.fillText(item.text, item.startX, item.startY);
      }
    });

    // Draw Cursors (Remote Users)
    Object.entries(cursors).forEach(([userId, cursor]) => {
      if (userId === myUserIdRef.current) return; // Don't draw own cursor

      ctx.fillStyle = cursor.color || '#ff0000';
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
      e.preventDefault(); // Prevent canvas from stealing focus immediately
      setTextInput({ x: clientX, y: clientY, visible: true, value: '', worldX: worldPos.x, worldY: worldPos.y });
      return;
    }

    isDraggingRef.current = true;

    if (tool === 'PAN' || e.button === 1 || e.key === ' ') {
      return;
    }

    // Handle Object Eraser
    if (tool === 'ERASER' && eraserType === 'OBJECT') {
      const hitItem = items.slice().reverse().find(item => isPointInItem(worldPos.x, worldPos.y, item));
      if (hitItem) {
        // Optimistic update
        setItems(prev => prev.filter(i => i.id !== hitItem.id));
        // Send Delete
        if (stompClientRef.current) {
          stompClientRef.current.publish({
            destination: `/app/board/${roomId}`,
            body: JSON.stringify({ type: 'DELETE', id: hitItem.id })
          });
        }
      }
      return; // Don't start a drawing stroke
    }

    // Start Drawing (Pen or Standard Eraser)
    const id = crypto.randomUUID();
    const isEraser = tool === 'ERASER' && eraserType === 'STANDARD';

    currentItemRef.current = {
      id,
      type: 'PEN', // Standard eraser is just a PEN with bg color
      roomId,
      strokeColor: isEraser ? '#121212' : color, // Background color for eraser
      strokeWidth: isEraser ? 20 : strokeWidth,
      startX: worldPos.x,
      startY: worldPos.y,
      endX: worldPos.x,
      endY: worldPos.y,
      points: (tool === 'PEN' || isEraser) ? [{ x: worldPos.x, y: worldPos.y }] : [],
    };

    // If it's a shape tool, override type
    if (tool !== 'PEN' && tool !== 'ERASER') {
      currentItemRef.current.type = tool;
      currentItemRef.current.points = [];
    }
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

    // Handle Object Eraser Drag
    if (tool === 'ERASER' && eraserType === 'OBJECT') {
      const hitItem = items.slice().reverse().find(item => isPointInItem(worldPos.x, worldPos.y, item));
      if (hitItem) {
        setItems(prev => prev.filter(i => i.id !== hitItem.id));
        if (stompClientRef.current) {
          stompClientRef.current.publish({
            destination: `/app/board/${roomId}`,
            body: JSON.stringify({ type: 'DELETE', id: hitItem.id })
          });
        }
      }
      return;
    }

    // Handle Draw
    if (currentItemRef.current) {
      const item = currentItemRef.current;

      if (item.type === 'PEN') {
        item.points.push({ x: worldPos.x, y: worldPos.y });
        // Only broadcast PEN updates during drag to show real-time drawing
        throttledSendRef.current(stompClientRef.current, roomId, item);
      } else {
        item.endX = worldPos.x;
        item.endY = worldPos.y;
        // Do NOT broadcast shapes during drag to avoid "ghost" duplicates in history
        // They will be sent once finalized in handleMouseUp
      }
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

  const handleClear = () => {
    if (confirm('Are you sure you want to clear the entire board? This cannot be undone.')) {
      if (stompClientRef.current && stompClientRef.current.connected) {
        stompClientRef.current.publish({ destination: `/app/clear/${roomId}` });
      }
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
      } else if (item.type === 'LINE') {
        ctx.moveTo(item.startX, item.startY);
        ctx.lineTo(item.endX, item.endY);
        ctx.stroke();
      } else if (item.type === 'ARROW') {
        ctx.moveTo(item.startX, item.startY);
        ctx.lineTo(item.endX, item.endY);
        ctx.stroke();

        const angle = Math.atan2(item.endY - item.startY, item.endX - item.startX);
        const headLength = 20;
        const actualHeadLength = Math.max(10, headLength);

        ctx.beginPath();
        ctx.moveTo(item.endX, item.endY);
        ctx.lineTo(item.endX - actualHeadLength * Math.cos(angle - Math.PI / 6), item.endY - actualHeadLength * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(item.endX, item.endY);
        ctx.lineTo(item.endX - actualHeadLength * Math.cos(angle + Math.PI / 6), item.endY - actualHeadLength * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      } else if (item.type === 'TEXT' && item.text) {
        ctx.fillText(item.text, item.startX, item.startY);
      }
    });

    const link = document.createElement('a');
    link.download = `collab-canvas-${roomId}.png`;
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
    <div className="w-full h-screen overflow-hidden bg-[#121212] text-white relative flex items-center justify-center">
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
            position: 'fixed',
            left: `${textInput.x}px`,
            top: `${textInput.y}px`,
            color: color,
            fontSize: '20px',
            background: 'transparent',
            border: '1px dashed rgba(255,255,255,0.5)',
            outline: 'none',
            minWidth: '50px',
            minHeight: '30px',
            zIndex: 1000,
            resize: 'both',
            overflow: 'hidden',
          }}
          onBlur={() => setTextInput({ ...textInput, visible: false })}
        />
      )}

      {/* Toolbar */}
      <div className="fixed top-4  flex items-center gap-1 md:gap-2 p-1.5 md:p-2 rounded-lg bg-zinc-800 border border-zinc-900">
        <button onClick={() => setTool('PAN')} className={`p-1.5 md:p-2 rounded shrink-0 ${tool === 'PAN' ? 'bg-blue-500' : 'hover:bg-gray-700'}`} title="Pan (Space)"><img src="../arrows.png" alt="Pan" className="w-4 h-4 md:w-[15px] md:h-[15px]" /></button>
        <button onClick={() => setTool('PEN')} className={`p-1.5 md:p-2 rounded shrink-0 ${tool === 'PEN' ? 'bg-blue-500' : 'hover:bg-gray-700'}`} title="Pen"><img src="../pencil.png" alt="Pencil" className="w-4 h-4 md:w-[15px] md:h-[15px]" /></button>
        <button onClick={() => setTool('RECTANGLE')} className={`p-1.5 md:p-2 rounded shrink-0 ${tool === 'RECTANGLE' ? 'bg-blue-500' : 'hover:bg-gray-700'}`} title="Rectangle"><img src="../square.png" alt="Rectangle" className="w-4 h-4 md:w-[15px] md:h-[15px]" /></button>
        <button onClick={() => setTool('CIRCLE')} className={`p-1.5 md:p-2 rounded shrink-0 ${tool === 'CIRCLE' ? 'bg-blue-500' : 'hover:bg-gray-700'}`} title="Circle"><img src="../circle.png" alt="Circle" className="w-4 h-4 md:w-[15px] md:h-[15px]" /></button>
        <button onClick={() => setTool('LINE')} className={`p-1.5 md:p-2 rounded shrink-0 ${tool === 'LINE' ? 'bg-blue-500' : 'hover:bg-gray-700'}`} title="Line"><img src="../slash.png" alt="Line" className="w-4 h-4 md:w-[15px] md:h-[15px]" /></button>
        <button onClick={() => setTool('ARROW')} className={`p-1.5 md:p-2 rounded shrink-0 ${tool === 'ARROW' ? 'bg-blue-500' : 'hover:bg-gray-700'}`} title="Arrow"><img src="../arrow-up-right.png" alt="Arrow" className="w-4 h-4 md:w-[15px] md:h-[15px]" /></button>
        <button onClick={() => setTool('TEXT')} className={`p-1.5 md:p-2 rounded shrink-0 ${tool === 'TEXT' ? 'bg-blue-500' : 'hover:bg-gray-700'}`} title="Text"><img src="../italic.png" alt="Text" className="w-4 h-4 md:w-[15px] md:h-[15px]" /></button>

        {/* Eraser Group */}
        <div className="flex flex-row gap-0.5 md:gap-1 items-center border-l border-r border-gray-600 px-1 md:px-2 shrink-0">
          <button onClick={() => { setTool('ERASER'); setEraserType('STANDARD'); }} className={`p-1.5 md:p-2 rounded shrink-0 ${tool === 'ERASER' && eraserType === 'STANDARD' ? 'bg-blue-500' : 'hover:bg-gray-700'}`} title="Standard Eraser (Mask)"><img src="../eraser-1.png" alt="Eraser" className="w-4 h-4 md:w-[15px] md:h-[15px]" /></button>
          <button onClick={() => { setTool('ERASER'); setEraserType('OBJECT'); }} className={`p-1.5 md:p-2 rounded shrink-0 ${tool === 'ERASER' && eraserType === 'OBJECT' ? 'bg-blue-500' : 'hover:bg-gray-700'}`} title="Object Eraser (Delete)"><img src="../eraser.png" alt="Eraser" className="w-4 h-4 md:w-[15px] md:h-[15px]" /></button>
        </div>

        <div className="shrink-0"></div>

        <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-5 h-5 rounded-full cursor-pointer p-0 border-0 shrink-0" title="Color" />
        <input type="range" min="1" max="20" value={strokeWidth} onChange={e => setStrokeWidth(parseInt(e.target.value))} className="w-16 md:w-20 shrink-0" title="Stroke Width" />

        <div className="w-px h-6 bg-gray-600 mx-1 shrink-0"></div>

        <button onClick={handleUndo} className="p-1.5 md:p-2 rounded hover:bg-gray-700 shrink-0" title="Undo"><img src="../undo.png" alt="Undo" className="w-4 h-4 md:w-[15px] md:h-[15px]" /></button>
        <button onClick={handleExport} className="p-1.5 md:p-2 rounded hover:bg-gray-700 shrink-0" title="Export Image"><img src="../file-download.png" alt="Export" className="w-4 h-4 md:w-[15px] md:h-[15px]" /></button>
        <button onClick={handleClear} className="p-1.5 md:p-2 rounded hover:bg-red-700 text-red-400 shrink-0" title="Clear All"><img src="../trash.png" alt="Clear" className="w-4 h-4 md:w-[15px] md:h-[15px]" /></button>
      </div>

      {/* Logout Button (Top Right) */}
      <button
        onClick={() => router.push('/')}
        className="fixed top-4 right-4 p-3 cursor-pointer rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-lg flex items-center gap-2"
        title="Exit Room"
      >
        <span><img src="../sign-out.png" alt="Logout" className="w-6 h-6 md:w-[15px] md:h-[15px]" /></span>
      </button>

      {/* Zoom Bar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-zinc-800 px-4 py-2 rounded-full shadow-xl flex gap-4 border border-gray-900 items-center text-sm">
        <button onClick={() => setCamera(prev => ({ ...prev, zoom: prev.zoom / 1.2 }))} className="text-zinc-300 hover:text-zinc-400 font-bold">−</button>
        <span className="w-12 text-zinc-300 text-center">{Math.round(camera.zoom * 100)}%</span>
        <button onClick={() => setCamera(prev => ({ ...prev, zoom: prev.zoom * 1.2 }))} className="text-zinc-300 hover:text-zinc-400 font-bold">+</button>
        <button onClick={() => setCamera({ x: 0, y: 0, zoom: 1 })} className="text-xs text-zinc-300 hover:text-zinc-400 ml-2">Reset</button>
      </div>

      {/* Status */}
      <div className="fixed bottom-4 right-4 text-xs text-gray-500">
        {isConnected ? '🟢 Online' : '🔴 Offline'}
      </div>
    </div>
  );
}
