# 🧐 Code Deep Dive

This document provides a detailed, component-level explanation of the Collaborative Whiteboard codebase. It is designed to help developers understand *how* the code works under the hood.

---

## 🖥️ Frontend: `InfiniteCanvas.jsx`

**Location**: `frontend/app/board/[roomId]/InfiniteCanvas.jsx`

This is the heart of the application. It handles the canvas, user input, rendering, and real-time communication.

### 1. State Management (`useState`)
*   `items`: An array of all drawing objects (lines, shapes, text) on the board.
*   `cursors`: A map of other users' cursor positions (`{ userId: { x, y, name } }`).
*   `camera`: Controls the view (`x`, `y` offset and `zoom` level).
*   `tool`: The currently selected tool (e.g., `PEN`, `RECTANGLE`, `ERASER`).
*   `eraserType`: Sub-mode for eraser (`STANDARD` = masking, `OBJECT` = delete).
*   `isConnected`: Tracks WebSocket connection status.

### 2. References (`useRef`)
*   `canvasRef`: Direct access to the HTML `<canvas>` element for drawing.
*   `stompClientRef`: Holds the active WebSocket client instance.
*   `currentItemRef`: Temporarily stores the shape being drawn *right now* (before mouse release).
*   `throttledSendRef`: A throttled function to send updates to the server without flooding it.

### 3. Coordinate Systems
The app uses two coordinate systems:
*   **Screen Coordinates**: The pixel position on your monitor (e.g., Mouse X/Y).
*   **World Coordinates**: The absolute position on the infinite canvas.
*   **Conversion**:
    *   `toWorld(screenX, screenY)`: Subtracts camera offset and divides by zoom.
    *   `toScreen(worldX, worldY)`: Multiplies by zoom and adds camera offset.

### 4. The Render Loop (`render`)
The `render` function clears and redraws the **entire canvas** on every frame (using `requestAnimationFrame`).
1.  **Clear**: Fills the canvas with the background color (`#121212`).
2.  **Transform**: Applies `ctx.translate()` and `ctx.scale()` based on the `camera` state.
3.  **Draw Items**: Loops through `items` + `currentItemRef` and draws them:
    *   **PEN**: Uses `ctx.quadraticCurveTo` for smooth lines.
    *   **RECTANGLE/CIRCLE**: Uses `ctx.strokeRect` / `ctx.arc`.
    *   **LINE/ARROW**: Draws lines; Arrow calculates trigonometry for the head.
4.  **Draw Cursors**: Loops through `cursors` and draws colored dots/names for other users.

### 5. Event Handlers
*   `handleMouseDown`:
    *   Calculates "World" position.
    *   **Eraser (Object)**: Checks if an item is clicked (`isPointInItem`) and deletes it.
    *   **Drawing**: Creates a new `currentItem` (e.g., a new Pen stroke or Shape) and sets `isDragging = true`.
*   `handleMouseMove`:
    *   **Panning**: If Spacebar is held, updates `camera` state.
    *   **Drawing**: Updates the `currentItem` (adds points to Pen, or updates End X/Y for shapes).
    *   **Broadcasting**: Sends the current item state to the server (throttled to ~30ms).
*   `handleMouseUp`:
    *   Finalizes the `currentItem`.
    *   Adds it to the local `items` state.
    *   Sends the final "complete" item to the server.

### 6. WebSocket Logic (`useEffect`)
*   **Connect**: Uses `SockJS` and `StompJS` to connect to `http://localhost:8080/ws`.
*   **Subscribe**:
    *   `/topic/board/{roomId}`: Listens for new items, deletes, or clears.
    *   `/topic/cursors/{roomId}`: Listens for cursor movements.
    *   `/topic/history/{roomId}`: Listens for the initial load of existing items.
*   **Sync**: When a message arrives, it updates the React state (`setItems`, `setCursors`), triggering a re-render.

---

## ⚙️ Backend: Spring Boot

**Location**: `backend/src/main/java/com/whiteboard/...`

The backend is a stateless WebSocket relay. It receives messages and broadcasts them to the correct room.

### 1. `WhiteboardController.java`
Handles the WebSocket endpoints (`@MessageMapping`).

*   `@MessageMapping("/board/{roomId}")`:
    *   Receives a `BoardItem`.
    *   Calls `service.addOrUpdateItem()` to save it.
    *   Broadcasts it to `/topic/board/{roomId}`.
*   `@MessageMapping("/history/{roomId}")`:
    *   Retrieves the list of items for the room.
    *   Sends them to `/topic/history/{roomId}`.
*   `@MessageMapping("/clear/{roomId}")`:
    *   Wipes the room's history.
    *   Broadcasts a `CLEAR` event.
*   `@MessageMapping("/undo/{roomId}")`:
    *   Removes the last item.
    *   Broadcasts a `DELETE` event with the ID of the removed item.

### 2. `WhiteboardService.java`
Manages the in-memory data storage.

*   **Storage**: `Map<String, List<BoardItem>> roomItems`.
    *   Key: `roomId` (String).
    *   Value: `List<BoardItem>` (CopyOnWriteArrayList for thread safety).
*   `addOrUpdateItem`:
    *   Checks if an item with the same ID exists.
    *   If yes, **replaces** it (updates).
    *   If no, **adds** it to the list.
    *   *Why?* This prevents duplicate items when the frontend sends updates during drawing.

### 3. `BoardItem.java` (Model)
A simple POJO (Plain Old Java Object) representing a drawing element.
*   `id`: Unique UUID.
*   `type`: Enum-like string (`PEN`, `RECTANGLE`, `TEXT`, etc.).
*   `points`: List of `{x, y}` for Pen strokes.
*   `startX, startY, endX, endY`: Coordinates for shapes.
*   `text`: Content for text tools.
*   `strokeColor`, `strokeWidth`: Styling.

---

## 🧠 Key Algorithms

### 1. Hit Testing (`isPointInItem`)
Used by the **Object Eraser** to see if you clicked on a shape.
*   **Rectangle**: Checks if the point is within the bounding box but *not* inside the inner area (hollow).
*   **Circle**: Calculates distance from center; checks if it matches the radius (within tolerance).
*   **Line/Pen**: Calculates the perpendicular distance from the point to the line segment. If it's less than the tolerance (e.g., 5px), it's a hit.

### 2. Throttling
Used in `handleMouseMove`.
*   **Problem**: Sending a WebSocket message every time the mouse moves (60+ times/sec) floods the network.
*   **Solution**: `throttle` function ensures we only send a message once every 30ms.
*   **Result**: Smooth drawing for the user, manageable load for the server.

### 3. Optimistic Updates
*   **Problem**: Waiting for the server to echo back your own drawing feels laggy.
*   **Solution**: The frontend draws your `currentItem` immediately. The server message is just for *other* users (and history).
