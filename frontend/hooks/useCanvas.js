import { useRef, useCallback } from 'react';

/**
 * Custom hook for managing canvas drawing operations
 * @param {Function} onDrawStart - Callback when drawing starts
 * @param {Function} onDrawMove - Callback when drawing moves
 * @param {Function} onDrawEnd - Callback when drawing ends
 * @returns {Object} Canvas reference and drawing state
 */
export function useCanvas(onDrawStart, onDrawMove, onDrawEnd) {
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPositionRef = useRef({ x: null, y: null });
  const remoteLastPositionRef = useRef({ x: null, y: null });
  const remoteWasDrawingRef = useRef(false);  // Track previous drawing state for remote strokes

  /**
   * Draw a line segment on the canvas
   */
  const drawLine = useCallback((x1, y1, x2, y2, color, lineWidth = 2) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }, []);

  /**
   * Draw a remote user's stroke
   */
  const drawRemoteStroke = useCallback((event) => {
    // Handle both 'isDrawing' and 'drawing' property names (Jackson may convert)
    const isDrawing = event.isDrawing !== undefined ? event.isDrawing : event.drawing;
    const wasDrawing = remoteWasDrawingRef.current;
    
    // FIRST: Always check if we're starting a brand new stroke
    // This takes precedence over everything else
    if (isDrawing && !wasDrawing) {
      // Starting a NEW stroke - ALWAYS reset position to null
      // This prevents connecting to the previous stroke
      remoteLastPositionRef.current = { x: null, y: null };
      remoteWasDrawingRef.current = true;
      return; // Exit early - don't draw on first point of stroke
    }
    
    // If drawing stopped, clear the last position for next stroke
    if (!isDrawing && wasDrawing) {
      remoteLastPositionRef.current = { x: null, y: null };
      remoteWasDrawingRef.current = false;
      return; // Exit early - don't draw on stroke end
    }
    
    // ONLY draw if we're actively drawing (isDrawing === true)
    // AND we have a previous position from earlier in THIS stroke
    if (isDrawing && remoteLastPositionRef.current.x !== null && remoteLastPositionRef.current.y !== null) {
      drawLine(
        remoteLastPositionRef.current.x,
        remoteLastPositionRef.current.y,
        event.x,
        event.y,
        event.color || '#ffffff',
        2
      );
    }
    
    // Finally, update position for NEXT event in this stroke
    if (isDrawing) {
      remoteLastPositionRef.current = { x: event.x, y: event.y };
    }
  }, [drawLine]);

  /**
   * Clear the entire canvas
   */
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  /**
   * Get mouse coordinates relative to canvas
   */
  const getCanvasCoordinates = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }, []);

  /**
   * Handle mouse down event
   */
  const handleMouseDown = useCallback((e, color) => {
    e.preventDefault();
    isDrawingRef.current = true;
    const { x, y } = getCanvasCoordinates(e);
    lastPositionRef.current = { x, y };

    if (onDrawStart) {
      onDrawStart(x, y, color);
    }
  }, [getCanvasCoordinates, onDrawStart]);

  /**
   * Handle mouse move event
   */
  const handleMouseMove = useCallback((e, color) => {
    if (!isDrawingRef.current) return;

    e.preventDefault();
    const { x, y } = getCanvasCoordinates(e);
    const { x: lastX, y: lastY } = lastPositionRef.current;

    if (lastX !== null && lastY !== null) {
      drawLine(lastX, lastY, x, y, color, 2);
    }

    lastPositionRef.current = { x, y };

    if (onDrawMove) {
      onDrawMove(x, y, color);
    }
  }, [getCanvasCoordinates, drawLine, onDrawMove]);

  /**
   * Handle mouse up event
   */
  const handleMouseUp = useCallback((e) => {
    if (!isDrawingRef.current) return;
    
    e.preventDefault();
    isDrawingRef.current = false;
    lastPositionRef.current = { x: null, y: null };

    if (onDrawEnd) {
      onDrawEnd();
    }
  }, [onDrawEnd]);

  return {
    canvasRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    drawRemoteStroke,
    clearCanvas
  };
}
