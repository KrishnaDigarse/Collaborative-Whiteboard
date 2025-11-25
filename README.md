# 🎨 CollabCanvas

[Live Link](https://whiteboard-frontend-7y7t.onrender.com/)

A real-time, infinite canvas whiteboard application built for seamless collaboration. Features multi-user cursors, live drawing, shape tools, and global undo/redo—all without a persistent database.

![CollabCanvas Demo](/frontend/public/landing.png)

## ✨ Features

*   **Infinite Canvas**: Pan and zoom freely to explore your ideas.
*   **Real-Time Collaboration**: See other users' drawings and cursors instantly.
*   **Rich Toolset**:
    *   ✏️ **Pen**: Freehand drawing.
    *   ⬜ **Shapes**: Rectangle, Circle, Line, Arrow.
    *   T **Text**: Add labels and notes.
    *   🧹 **Eraser**: Standard (Masking) and Object (Delete) modes.
*   **Multi-User Cursors**: See who is working where with named cursors.
*   **Global Undo/Redo**: collaborative undo history.
*   **Export**: Download your board as a PNG image.
*   **Cloud Ready**: Stateless backend design (In-Memory) for easy deployment.

## 🛠️ Tech Stack

### Frontend
*   **Framework**: [Next.js](https://nextjs.org/) (React)
*   **Styling**: [TailwindCSS](https://tailwindcss.com/)
*   **Real-Time**: [SockJS](https://github.com/sockjs/sockjs-client) & [StompJS](https://github.com/stomp-js/stompjs)
*   **Canvas**: HTML5 Canvas API

### Backend
*   **Framework**: [Spring Boot](https://spring.io/projects/spring-boot) (Java 21)
*   **WebSocket**: Spring WebSocket (STOMP)
*   **Storage**: In-Memory (`ConcurrentHashMap`) - *No Database Required*

## 🚀 Getting Started

### Prerequisites
*   **Node.js** (v18+)
*   **Java JDK** (v21)

### 1. Start the Backend
The backend handles WebSocket connections and stores board state in memory.

```bash
cd backend
# Windows
.\gradlew.bat bootRun
# Mac/Linux
./gradlew bootRun
```
*Server runs on `http://localhost:8080`*

### 2. Start the Frontend
The frontend provides the whiteboard interface.

```bash
cd frontend
npm install
npm run dev
```
*Client runs on `http://localhost:3000`*

### 3. Usage
1.  Open `http://localhost:3000`.
2.  Enter a **Room ID** (e.g., `room1`) and your **Name**.
3.  Share the URL (or Room ID) with a friend to collaborate!

## ☁️ Deployment

### Frontend (Vercel)
1.  Push `frontend` folder to GitHub.
2.  Import project into Vercel.
3.  Set Environment Variable:
    *   `NEXT_PUBLIC_BACKEND_URL`: `https://whiteboard-backend-7y7t.onrender.com/ws`

### Backend (Render)
1.  Push `backend` folder to GitHub.
2.  Deploy as a Gradle project.
3.  Ensure port `8080` is exposed.
4.  *Note: Since storage is in-memory, data resets on restart.*

## 🤝 Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## 📄 License
[MIT](https://choosealicense.com/licenses/mit/)