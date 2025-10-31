"use client";
import { useRef, useEffect } from 'react';

/**
 * Canvas component for drawing - fullscreen
 * @param {Object} canvasRef - Reference to the canvas element
 * @param {Function} onMouseDown - Mouse down event handler
 * @param {Function} onMouseMove - Mouse move event handler
 * @param {Function} onMouseUp - Mouse up event handler
 * @param {string} color - Current drawing color
 */
export default function Canvas({ canvasRef, onMouseDown, onMouseMove, onMouseUp, color }) {
  const localCanvasRef = useRef(null);

  useEffect(() => {
    const canvas = localCanvasRef.current;
    if (!canvas) return;

    // Set canvas to fill entire viewport
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Also set the parent ref if provided
    if (canvasRef) {
      canvasRef.current = canvas;
    }

    return () => window.removeEventListener('resize', resizeCanvas);
  }, [canvasRef]);

  return (
    <canvas
      ref={localCanvasRef}
      className="fixed top-0 left-0 bg-black cursor-crosshair"
      style={{ 
        display: 'block',
        width: '100vw',
        height: '100vh',
        touchAction: 'none'
      }}
      onMouseDown={(e) => onMouseDown(e, color)}
      onMouseMove={(e) => onMouseMove(e, color)}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    />
  );
}
