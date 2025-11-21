# Collaborative Whiteboard

A real-time collaborative whiteboard application built with Next.js 16 and Spring Boot 3.5.7, enabling multiple users to draw, collaborate, and interact on a shared canvas simultaneously from anywhere.

## ✨ Features

### Drawing & Canvas
- **Real-time Collaborative Drawing** - See changes instantly as your team draws
- **Full-screen Canvas** - Maximized drawing area with responsive sizing
- **Smooth Stroke Handling** - Fluid drawing with optimized rendering
- **Color Picker** - Customizable brush colors for each user
- **Adjustable Brush Size** - Variable line thickness support

### Collaboration
- **WebSocket-based Real-time Sync** - Instant synchronization across all connected users
- **Room-based Architecture** - Create or join rooms with custom IDs
- **Multi-user Support** - Support for unlimited concurrent users in each room
- **No Installation Required** - Works directly in your browser

### User Experience
- **Modern Landing Page** - Beautiful gradient interface with smooth animations
- **Minimal & Intuitive** - Easy-to-use interface for quick collaboration
- **Dark Theme** - Eye-friendly dark mode for extended drawing sessions
- **Error Handling** - Clear error messages and validation

## 🛠️ Tech Stack

### Frontend
- **Next.js 16.0.1** - React framework for production
- **React 19.2.0** - Modern UI library
- **@stomp/stompjs 7.2.1** - STOMP WebSocket client
- **sockjs-client 1.6.1** - WebSocket fallback support
- **Tailwind CSS v4** - Utility-first CSS framework
- **JavaScript ES2020+** - Modern JavaScript features

### Backend
- **Spring Boot 3.5.7** - Production-ready framework
- **Java 21** - Latest Java LTS version
- **Spring WebSocket** - Real-time communication
- **Spring MVC** - RESTful web services
- **Gradle 8.x** - Build automation
- **Lombok** - Code generation for Java

## 📋 Prerequisites

### System Requirements
- **Node.js 18+** (for frontend development)
- **Java Development Kit (JDK) 21+** (for backend)
- **npm or yarn** (Node package manager)
- **Gradle 8+** (for backend build)

### Port Requirements
- Port **3000** (frontend) - Must be available
- Port **8080** (backend) - Must be available

## 🚀 Getting Started

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Build the project:
```bash
# On Windows
gradlew build

# On macOS/Linux
./gradlew build
```

3. Run the Spring Boot application:
```bash
# On Windows
gradlew bootRun

# On macOS/Linux
./gradlew bootRun
```

The backend server will start on `http://localhost:8080`

**Note:** The first build may take a few minutes as Gradle downloads dependencies.

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

The frontend application will be available at `http://localhost:3000`

4. Open your browser and visit `http://localhost:3000`

### Using the Application

1. **Create a Room**: Enter a room ID on the landing page (e.g., "design-meeting", "team-1")
2. **Join Room**: Click the "Join Room" button to create/join the room
3. **Share & Collaborate**: Share the room ID with teammates to collaborate in real-time
4. **Draw**: Use your mouse to draw on the canvas - changes sync instantly to all connected users

## 📁 Project Structure

```
Collaborative-Whiteboard/
├── backend/                          # Spring Boot Backend (Java)
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/
│   │   │   │   └── com/whiteboard/
│   │   │   │       ├── config/
│   │   │   │       │   ├── WebConfig.java           # CORS & HTTP configuration
│   │   │   │       │   └── WebSocketConfig.java     # WebSocket setup
│   │   │   │       ├── controller/
│   │   │   │       │   └── WhiteboardController.java # Drawing event endpoints
│   │   │   │       └── model/
│   │   │   │           └── DrawEvent.java           # Event data model
│   │   │   └── resources/
│   │   │       └── application.properties           # Server configuration
│   │   └── test/                                    # Unit tests
│   ├── build.gradle                                 # Gradle build configuration
│   ├── gradle/
│   │   └── wrapper/                                 # Gradle wrapper
│   └── HELP.md                                      # Spring Boot guide
│
└── frontend/                         # Next.js Frontend (React)
    ├── app/
    │   ├── page.jsx                  # Landing page
    │   ├── layout.jsx                # Root layout
    │   ├── globals.css               # Global styles
    │   └── board/
    │       ├── [roomId]/
    │       │   └── page.jsx           # Drawing board (dynamic route)
    │       └── layout.jsx             # Board layout
    ├── public/                        # Static assets
    ├── package.json                   # Dependencies & scripts
    ├── next.config.mjs                # Next.js configuration
    ├── postcss.config.mjs             # PostCSS configuration
    ├── tailwind.config.js             # Tailwind CSS configuration
    ├── jsconfig.json                  # JavaScript configuration
    └── eslint.config.mjs              # ESLint configuration
```

## 🔌 WebSocket Communication

### Connection Flow
1. Frontend connects to `ws://localhost:8080/ws` using STOMP over SockJS
2. User subscribes to `/topic/board/{roomId}` for room-specific updates
3. Drawing events sent to `/app/draw/{roomId}` endpoint

### Event Structure
```javascript
{
  x: number,           // X coordinate
  y: number,           // Y coordinate
  color: string,       // Hex color code (e.g., "#FF0000")
  isDrawing: boolean,  // Drawing state (true = drawing, false = stroke end)
  roomId: string       // Room identifier
}
```

### Server Features
- **Automatic Broadcasting** - Events broadcast to all room subscribers
- **JSON Serialization** - Proper handling of event data
- **Error Handling** - Graceful connection failures

## 🎨 Architecture Overview

### Frontend Architecture
- **Single Page Application (SPA)** - Next.js handles routing
- **Client-side Drawing** - HTML5 Canvas API for rendering
- **Real-time Sync** - WebSocket for instant state updates
- **State Management** - React hooks (useState, useRef, useEffect)
- **Minimal Dependencies** - No external UI component libraries

### Backend Architecture
- **MVC Pattern** - Model-View-Controller structure
- **REST + WebSocket** - Hybrid communication protocol
- **Room-based Isolation** - Separate topics for each room
- **Event-driven** - Reactive message handling

## 🚧 Development

### Building for Production

**Frontend:**
```bash
cd frontend
npm run build
npm run start
```

**Backend:**
```bash
cd backend
./gradlew build
java -jar build/libs/whiteboard-*.jar
```

### Code Quality

**ESLint:**
```bash
cd frontend
npm run lint
```

## 🔒 Security Notes

- CORS configured for local development
- WebSocket connections isolated by room ID
- Client-side validation for room IDs
- Input sanitization on form submissions

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Windows: Check and kill process on port 8080
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# macOS/Linux:
lsof -ti:8080 | xargs kill -9
```

### Connection Issues
- Ensure both backend and frontend are running
- Check firewall settings
- Verify ports 3000 and 8080 are accessible
- Clear browser cache and reload

### Drawing Not Syncing
- Check WebSocket connection in browser DevTools
- Verify both users are in the same room ID
- Restart the backend server

## 📊 Performance Considerations

- Canvas rendering optimized for smooth 60fps drawing
- WebSocket events throttled to prevent flooding
- Distance-based race condition detection for multi-user synchronization
- Minimal re-renders using React hooks

## 🛣️ Future Enhancements

- [ ] Eraser tool and shape tools (line, rectangle, circle)
- [ ] Undo/redo functionality
- [ ] User presence indicators with cursors
- [ ] Canvas export/download (PNG, SVG)
- [ ] Touch support for mobile devices
- [ ] Brush styles and effects
- [ ] Text annotation tool
- [ ] Room access controls and permissions

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👤 Author

**Krishna Digarse**

## 🤝 Contributing

Contributions are welcome! Please feel free to:
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📧 Support

For issues, questions, or suggestions, please open an issue on GitHub or contact the maintainer.

---

**Happy Collaborating! 🎨✨**