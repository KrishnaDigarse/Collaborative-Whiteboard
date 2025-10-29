# Collaborative Whiteboard

A real-time collaborative whiteboard application built with Next.js and Spring Boot, allowing multiple users to draw and interact on a shared canvas simultaneously.

## Features

- Real-time collaborative drawing
- WebSocket-based communication
- Responsive canvas interface
- Multi-user support

## Tech Stack

### Frontend
- Next.js
- JavaScript/JSX
- WebSocket client
- Tailwind CSS (based on configuration)

### Backend
- Spring Boot
- Java
- WebSocket (using Spring WebSocket)
- Gradle

## Prerequisites

- Node.js (for frontend)
- Java JDK 21 or higher (for backend)
- Gradle

## Getting Started

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Run the Spring Boot application using Gradle:
```bash
./gradlew bootRun
```

The backend server will start on `http://localhost:8080` (default Spring Boot port)

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

## Project Structure

```
.
├── backend/                 # Spring Boot backend
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/      # Java source files
│   │   │   └── resources/ # Application properties
│   └── build.gradle       # Gradle configuration
│
└── frontend/              # Next.js frontend
    ├── app/              # Next.js app directory
    ├── public/          # Static files
    └── package.json     # Node.js dependencies
```

## Development

### Backend Development

The backend is built with Spring Boot and includes:
- WebSocket configuration for real-time communication
- Controllers for handling drawing events
- Model classes for data transfer

### Frontend Development

The frontend is built with Next.js and includes:
- Real-time canvas drawing functionality
- WebSocket client integration
- Responsive layout

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

Feel free to contact me for any questions or suggestions.