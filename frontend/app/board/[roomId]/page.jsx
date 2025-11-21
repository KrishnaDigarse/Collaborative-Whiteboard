'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';

const BACKEND_URL = 'http://localhost:8080/ws';

export default function Board() {
  const router = useRouter();
  const params = useParams();
  const roomId = params?.roomId || null;
  const [isConnected, setIsConnected] = useState(false);
  const [color, setColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(2);
  const [drawingMode, setDrawingMode] = useState('pen');

  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const stompRef = useRef(null);
  const isDrawingRef = useRef(false);
  const remoteIsDrawingRef = useRef(false);
  const lastRemotePointRef = useRef({ x: 0, y: 0 });
  const startPointRef = useRef({ x: 0, y: 0 });
  const canvasImageRef = useRef(null);
  const pathPointsRef = useRef([]);
  const strokeIdRef = useRef(0);

  // Smooth bezier curve interpolation
  const drawSmoothCurve = (ctx, points) => {
    if (points.length < 2) return;
    if (points.length === 2) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[1].x, points[1].y);
      ctx.stroke();
      return;
    }

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 0; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.stroke();
  };

  // Setup canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctxRef.current = ctx;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Draw remote pen strokes with smooth interpolation
  const drawRemotePen = (event) => {
    if (!ctxRef.current) return;
    const ctx = ctxRef.current;
    const { x, y, color: remoteColor, isDrawing, toolType, brushSize: remoteBrushSize } = event;

    if (!isDrawing) {
      remoteIsDrawingRef.current = false;
      lastRemotePointRef.current = { x: 0, y: 0 };
      return;
    }

    if (x === 0 && y === 0) return;

    const isEraser = toolType === 'eraser';
    const lineWidth = remoteBrushSize || 2;

    if (!remoteIsDrawingRef.current) {
      if (isEraser) {
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(x, y, lineWidth / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.strokeStyle = remoteColor;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = 'source-over';
        ctx.moveTo(x, y);
      }
      remoteIsDrawingRef.current = true;
      lastRemotePointRef.current = { x, y };
    } else {
      const distance = Math.sqrt(Math.pow(x - lastRemotePointRef.current.x, 2) + Math.pow(y - lastRemotePointRef.current.y, 2));

      if ((x < 50 && y < 50 && distance > 100) || (x === 0 && y === 0)) {
        if (isEraser) {
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(x, y, lineWidth / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.closePath();
          ctx.beginPath();
          ctx.strokeStyle = remoteColor;
          ctx.lineWidth = lineWidth;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.globalCompositeOperation = 'source-over';
          ctx.moveTo(x, y);
        }
      } else {
        if (isEraser) {
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(x, y, lineWidth / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Use quadratic curve for smoother lines
          ctx.quadraticCurveTo(
            lastRemotePointRef.current.x,
            lastRemotePointRef.current.y,
            (lastRemotePointRef.current.x + x) / 2,
            (lastRemotePointRef.current.y + y) / 2
          );
          ctx.stroke();
        }
      }
      lastRemotePointRef.current = { x, y };
    }
  };

  // Draw remote shapes
  const drawRemoteShape = (shape) => {
    if (!ctxRef.current) return;
    const ctx = ctxRef.current;
    const { type, startX, startY, endX, endY, color: shapeColor, strokeWidth } = shape;

    ctx.strokeStyle = shapeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const upperType = (type || '').toUpperCase();

    switch (upperType) {
      case 'RECTANGLE':
        ctx.strokeRect(startX, startY, endX - startX, endY - startY);
        break;
      case 'SQUARE': {
        const size = Math.abs(endX - startX);
        ctx.strokeRect(startX, startY, size, size);
        break;
      }
      case 'CIRCLE': {
        const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
        ctx.beginPath();
        ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
        ctx.stroke();
        break;
      }
      case 'OVAL': {
        const radiusX = Math.abs(endX - startX) / 2;
        const radiusY = Math.abs(endY - startY) / 2;
        ctx.beginPath();
        ctx.ellipse(startX + radiusX, startY + radiusY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        ctx.stroke();
        break;
      }
      case 'LINE':
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        break;
      case 'TRIANGLE': {
        const centerX = startX;
        const centerY = startY;
        const dx = endX - centerX;
        const dy = endY - centerY;
        const radius = Math.sqrt(dx * dx + dy * dy);

        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          const angle = (i * 2 * Math.PI) / 3 - Math.PI / 2;
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
        break;
      }
      default:
        break;
    }
  };

  // Handle incoming events
  const handleRemoteEvent = (event) => {
    if (!event) return;
    
    // Check if it's a shape
    if (event.type && ['RECTANGLE', 'CIRCLE', 'OVAL', 'LINE', 'TRIANGLE', 'SQUARE'].includes((event.type || '').toUpperCase())) {
      if (event.type === '__SHAPES_COMPLETE__') {
        console.log('✅ Shapes history loaded');
        return;
      }
      drawRemoteShape(event);
    } else if (event.x !== undefined && event.y !== undefined) {
      // It's a pen stroke
      drawRemotePen(event);
    }
  };

  // WebSocket setup
  useEffect(() => {
    if (!roomId) return;

    const SockJS = require('sockjs-client');
    const StompJs = require('@stomp/stompjs');

    const sock = new SockJS(BACKEND_URL);
    const client = new StompJs.Client({
      webSocketFactory: () => sock,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    client.onConnect = () => {
      setIsConnected(true);

      // Subscribe to pen drawing
      client.subscribe(`/topic/board/${roomId}`, (message) => {
        const event = JSON.parse(message.body);
        if (!event) return;
        
        if (event.type && ['RECTANGLE', 'CIRCLE', 'OVAL', 'LINE', 'TRIANGLE', 'SQUARE'].includes((event.type || '').toUpperCase())) {
          if (event.type === '__SHAPES_COMPLETE__') return;
          drawRemoteShape(event);
        } else if (event.x !== undefined && event.y !== undefined) {
          drawRemotePen(event);
        }
      });

      // Subscribe to shapes
      client.subscribe(`/topic/shapes/${roomId}`, (message) => {
        const event = JSON.parse(message.body);
        if (!event) return;
        
        // Handle clear signal
        if (event.type === '__CLEAR_ALL__') {
          if (!ctxRef.current || !canvasRef.current) return;
          ctxRef.current.fillStyle = '#000000';
          ctxRef.current.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          console.log('🧹 Canvas cleared by another user');
          return;
        }
        
        if (event.type && ['RECTANGLE', 'CIRCLE', 'OVAL', 'LINE', 'TRIANGLE', 'SQUARE'].includes((event.type || '').toUpperCase())) {
          if (event.type === '__SHAPES_COMPLETE__') return;
          drawRemoteShape(event);
        } else if (event.x !== undefined && event.y !== undefined) {
          drawRemotePen(event);
        }
      });

      // Subscribe to shape history
      client.subscribe(`/topic/shapes/history/${roomId}`, (message) => {
        const event = JSON.parse(message.body);
        if (!event) return;
        
        // Handle clear signal in history
        if (event.type === '__CLEAR_ALL__') {
          if (!ctxRef.current || !canvasRef.current) return;
          ctxRef.current.fillStyle = '#000000';
          ctxRef.current.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          console.log('🧹 Canvas cleared (from history)');
          return;
        }
        
        if (event.type && ['RECTANGLE', 'CIRCLE', 'OVAL', 'LINE', 'TRIANGLE', 'SQUARE'].includes((event.type || '').toUpperCase())) {
          if (event.type === '__SHAPES_COMPLETE__') return;
          drawRemoteShape(event);
        } else if (event.x !== undefined && event.y !== undefined) {
          drawRemotePen(event);
        }
      });

      // Subscribe to drawing history
      client.subscribe(`/topic/history/${roomId}`, (message) => {
        const event = JSON.parse(message.body);
        if (!event) return;
        
        if (event.type && ['RECTANGLE', 'CIRCLE', 'OVAL', 'LINE', 'TRIANGLE', 'SQUARE'].includes((event.type || '').toUpperCase())) {
          if (event.type === '__SHAPES_COMPLETE__') return;
          drawRemoteShape(event);
        } else if (event.x !== undefined && event.y !== undefined) {
          drawRemotePen(event);
        }
      });

      // Request pen drawing history
      client.publish({
        destination: `/app/history/${roomId}`,
      });

      // Request shape history
      client.publish({
        destination: `/app/shapes/${roomId}`,
      });
    };

    client.onDisconnect = () => {
      setIsConnected(false);
      remoteIsDrawingRef.current = false;
    };

    client.activate();
    stompRef.current = client;

    // Handle page unload (closing tab/window)
    const handleBeforeUnload = () => {
      if (client?.connected) {
        // Send disconnect event to backend
        client.publish({
          destination: `/app/disconnect/${roomId}`,
        });
        client.deactivate();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (client?.connected) {
        client.deactivate();
      }
    };
  }, [roomId]);

  const sendEvent = (x, y, isDrawing) => {
    if (!stompRef.current?.connected) return;

    stompRef.current.publish({
      destination: `/app/draw/${roomId}`,
      body: JSON.stringify({
        x,
        y,
        color,
        isDrawing,
        roomId,
        toolType: drawingMode,
        brushSize,
      }),
    });
  };

  const sendShape = (shape) => {
    if (!stompRef.current?.connected) return;

    stompRef.current.publish({
      destination: `/app/shape/${roomId}`,
      body: JSON.stringify(shape),
    });
  };

  const handleMouseDown = (e) => {
    const { offsetX, offsetY } = e.nativeEvent;
    isDrawingRef.current = true;
    startPointRef.current = { x: offsetX, y: offsetY };
    lastRemotePointRef.current = { x: offsetX, y: offsetY };
    pathPointsRef.current = [];
    strokeIdRef.current = Math.random();

    if (drawingMode === 'pen') {
      // Initialize with first point only
      pathPointsRef.current.push({ x: offsetX, y: offsetY });
    } else if (drawingMode === 'eraser') {
      // Eraser - fill with black background color
      ctxRef.current.fillStyle = '#000000';
      ctxRef.current.beginPath();
      ctxRef.current.arc(offsetX, offsetY, brushSize / 2, 0, Math.PI * 2);
      ctxRef.current.fill();
    } else {
      canvasImageRef.current = ctxRef.current.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawingRef.current) return;

    const { offsetX, offsetY } = e.nativeEvent;
    const ctx = ctxRef.current;

    lastRemotePointRef.current = { x: offsetX, y: offsetY };

    if (drawingMode === 'pen') {
      // Draw smooth curve using quadratic Bézier
      if (pathPointsRef.current.length === 1) {
        // First move - start the path
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.moveTo(pathPointsRef.current[0].x, pathPointsRef.current[0].y);
      }
      
      // Add new point and draw curve
      pathPointsRef.current.push({ x: offsetX, y: offsetY });
      
      if (pathPointsRef.current.length > 1) {
        const points = pathPointsRef.current;
        const lastPoint = points[points.length - 2];
        const currentPoint = points[points.length - 1];
        
        ctx.quadraticCurveTo(
          lastPoint.x,
          lastPoint.y,
          (lastPoint.x + currentPoint.x) / 2,
          (lastPoint.y + currentPoint.y) / 2
        );
        ctx.stroke();
      }
      
      sendEvent(offsetX, offsetY, true);
    } else if (drawingMode === 'eraser') {
      // Eraser - fill with black background color using circular brush
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(offsetX, offsetY, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
      sendEvent(offsetX, offsetY, true);
    } else {
      // Preview for shapes
      ctx.putImageData(canvasImageRef.current, 0, 0);
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const startX = startPointRef.current.x;
      const startY = startPointRef.current.y;

      switch (drawingMode) {
        case 'rectangle':
          ctx.strokeRect(startX, startY, offsetX - startX, offsetY - startY);
          break;
        case 'square': {
          const size = Math.abs(offsetX - startX);
          ctx.strokeRect(startX, startY, size, size);
          break;
        }
        case 'circle': {
          const radius = Math.sqrt(Math.pow(offsetX - startX, 2) + Math.pow(offsetY - startY, 2));
          ctx.beginPath();
          ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
          ctx.stroke();
          break;
        }
        case 'oval': {
          const radiusX = Math.abs(offsetX - startX) / 2;
          const radiusY = Math.abs(offsetY - startY) / 2;
          ctx.beginPath();
          ctx.ellipse(startX + radiusX, startY + radiusY, radiusX, radiusY, 0, 0, 2 * Math.PI);
          ctx.stroke();
          break;
        }
        case 'line':
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(offsetX, offsetY);
          ctx.stroke();
          break;
        case 'triangle': {
          const centerX = startX;
          const centerY = startY;
          const dx = offsetX - centerX;
          const dy = offsetY - centerY;
          const radius = Math.sqrt(dx * dx + dy * dy);

          ctx.beginPath();
          for (let i = 0; i < 3; i++) {
            const angle = (i * 2 * Math.PI) / 3 - Math.PI / 2;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.stroke();
          break;
        }
        default:
          break;
      }
    }
  };

  const handleMouseUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (drawingMode === 'pen') {
      // Close path and clear points
      pathPointsRef.current = [];
      sendEvent(0, 0, false);
    } else if (drawingMode === 'eraser') {
      sendEvent(0, 0, false);
    } else {
      const shape = {
        type: drawingMode.toUpperCase(),
        startX: startPointRef.current.x,
        startY: startPointRef.current.y,
        endX: lastRemotePointRef.current.x,
        endY: lastRemotePointRef.current.y,
        color,
        strokeWidth: brushSize,
        filled: false,
        roomId,
      };
      sendShape(shape);
    }
  };

  const handleLeave = () => {
    if (stompRef.current?.connected) {
      // Notify backend that this user is leaving the room
      stompRef.current.publish({
        destination: `/app/disconnect/${roomId}`,
      });
      
      // Give a brief moment for the message to send before disconnecting
      setTimeout(() => {
        stompRef.current.deactivate();
      }, 100);
    }
    router.push('/');
  };

  const handleClear = () => {
    if (!ctxRef.current) return;
    ctxRef.current.fillStyle = '#000000';
    ctxRef.current.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // Send clear signal
    if (stompRef.current?.connected) {
      stompRef.current.publish({
        destination: `/app/shapes/clear/${roomId}`,
      });
    }
  };

  const handleCopyRoom = () => {
    navigator.clipboard.writeText('localhost:3000/board/' + roomId);
  };

  return (
    <div className="w-full h-screen bg-black overflow-hidden">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="block w-full h-full cursor-crosshair"
      />

      {/* Top Navbar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/80 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-white">Whiteboard</h1>
            {isConnected ? (
              <div className="px-3 py-1 bg-green-500/20 rounded-full border border-green-500/50">
                <span className="flex items-center text-green-400 text-sm">🟢 {roomId}</span>
              </div>
            ) : (
              <div className="px-3 py-1 bg-yellow-500/20 rounded-full border border-yellow-500/50">
                <span className="text-yellow-400 text-sm">Connecting...</span>
              </div>
            )}
          </div>

          {isConnected && (
            <div className="flex items-center gap-3 flex-wrap">
              {/* Drawing Mode Selector */}
              <div className="flex gap-1 border-r border-gray-600 pr-3">
                <button
                  onClick={() => setDrawingMode('pen')}
                  className={`px-2 py-1 rounded text-sm font-medium transition ${
                    drawingMode === 'pen' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  title="Pen Tool"
                >
                  ✏️ Pen
                </button>
                <button
                  onClick={() => setDrawingMode('eraser')}
                  className={`px-2 py-1 rounded text-sm font-medium transition ${
                    drawingMode === 'eraser' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  title="Eraser Tool"
                >
                  🧹 Eraser
                </button>
                <button
                  onClick={() => setDrawingMode('rectangle')}
                  className={`px-2 py-1 rounded text-sm font-medium transition ${
                    drawingMode === 'rectangle' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  title="Rectangle Tool"
                >
                  ▭ Rect
                </button>
                <button
                  onClick={() => setDrawingMode('square')}
                  className={`px-2 py-1 rounded text-sm font-medium transition ${
                    drawingMode === 'square' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  title="Square Tool"
                >
                  ⬜ Square
                </button>
                <button
                  onClick={() => setDrawingMode('circle')}
                  className={`px-2 py-1 rounded text-sm font-medium transition ${
                    drawingMode === 'circle' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  title="Circle Tool"
                >
                  ◯ Circle
                </button>
                <button
                  onClick={() => setDrawingMode('oval')}
                  className={`px-2 py-1 rounded text-sm font-medium transition ${
                    drawingMode === 'oval' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  title="Oval Tool"
                >
                  ⬭ Oval
                </button>
                <button
                  onClick={() => setDrawingMode('line')}
                  className={`px-2 py-1 rounded text-sm font-medium transition ${
                    drawingMode === 'line' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  title="Line Tool"
                >
                  ╱ Line
                </button>
                <button
                  onClick={() => setDrawingMode('triangle')}
                  className={`px-2 py-1 rounded text-sm font-medium transition ${
                    drawingMode === 'triangle' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  title="Triangle Tool"
                >
                  △ Triangle
                </button>
              </div>

              {/* Color Picker */}
              <div className="flex gap-1">
                {['#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-5 h-5 rounded-full border-2 ${color === c ? 'border-white scale-110' : 'border-gray-400'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              {/* Brush Size */}
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  className="w-20"
                />
                <span className="text-white text-sm w-4">{brushSize}</span>
              </div>

              {/* Buttons */}
              <button
                onClick={handleCopyRoom}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition"
              >
                Room Link
              </button>
              <button
                onClick={handleClear}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition"
              >
                Clear
              </button>
              <button
                onClick={handleLeave}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition"
              >
                Leave
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
