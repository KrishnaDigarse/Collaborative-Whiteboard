# Collaborative Whiteboard - Frontend

A real-time collaborative whiteboard application built with Next.js and WebSocket.

## Project Structure

```
frontend/
├── app/
│   ├── page.jsx           # Main page component
│   ├── layout.jsx         # Root layout
│   └── globals.css        # Global styles
├── components/
│   ├── Canvas.jsx         # Canvas drawing component
│   ├── RoomControls.jsx   # Room join/leave controls
│   └── Toolbar.jsx        # Color picker and tools
├── hooks/
│   ├── useWebSocket.js    # WebSocket connection hook
│   └── useCanvas.js       # Canvas drawing logic hook
└── package.json
```

## Component Overview

### Main Components

#### `app/page.jsx`
The main orchestrator component that:
- Manages the overall application state
- Coordinates between WebSocket and Canvas hooks
- Renders all child components (RoomControls, Toolbar, Canvas)

#### `components/Canvas.jsx`
Handles the canvas rendering:
- Renders the HTML canvas element
- Binds mouse event handlers
- Displays the drawing surface

#### `components/RoomControls.jsx`
Manages room connectivity:
- Input field for room ID
- Join/Leave room buttons
- Connection status display

#### `components/Toolbar.jsx`
Provides drawing tools:
- Color picker with predefined colors
- Clear canvas button
- Tool selection (future: brush size, eraser, etc.)

### Custom Hooks

#### `hooks/useWebSocket.js`
Manages WebSocket connection:
- Connects to Spring Boot backend via STOMP/SockJS
- Subscribes to room-specific topics (`/topic/board/{roomId}`)
- Sends draw events to backend (`/app/draw/{roomId}`)
- Handles connection/disconnection logic

#### `hooks/useCanvas.js`
Handles canvas drawing logic:
- Manages canvas context and rendering
- Tracks mouse position and drawing state
- Draws lines on the canvas
- Handles remote draw events from other users
- Provides canvas manipulation functions (clear, etc.)

## Data Flow

1. **Local Drawing:**
   - User draws on Canvas → `handleMouseDown/Move/Up`
   - Canvas hook triggers callbacks
   - Callbacks invoke `sendDrawEvent` from WebSocket hook
   - Event sent to backend via WebSocket

2. **Remote Drawing:**
   - Backend broadcasts event to all subscribers
   - WebSocket hook receives event
   - Calls `onDrawEvent` callback
   - Canvas hook's `drawRemoteStroke` renders the line

## Backend Integration

The frontend connects to a Spring Boot backend with the following endpoints:

- **WebSocket Endpoint:** `/ws` (SockJS)
- **Message Mapping:** `/app/draw/{roomId}`
- **Topic Subscription:** `/topic/board/{roomId}`

### DrawEvent Model
```javascript
{
  x: number,        // X coordinate
  y: number,        // Y coordinate
  color: string,    // Hex color code
  isDrawing: boolean, // true = line, false = start new path
  roomId: string    // Room identifier
}
```

## Running the Application

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Make sure the backend is running:**
   - The backend should be running on `http://localhost:8080`
   - WebSocket endpoint should be available at `/ws`

4. **Open the application:**
   - Navigate to `http://localhost:3000`
   - Enter a room ID and click "Join Room"
   - Start drawing!

## Features

- ✅ Real-time collaborative drawing
- ✅ Multiple color options
- ✅ Room-based collaboration
- ✅ Clear canvas functionality
- ✅ Responsive canvas sizing
- ✅ Clean, modular component architecture

## Future Enhancements

- [ ] Brush size control
- [ ] Eraser tool
- [ ] Undo/Redo functionality
- [ ] Save/Export canvas as image
- [ ] User cursor indicators
- [ ] Chat functionality
- [ ] Drawing shapes (rectangle, circle, line)
- [ ] Text tool
- [ ] Layer support
