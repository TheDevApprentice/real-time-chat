 # Real-Time Chat Server (Node.js)

A Node.js-based real-time chat server using Express, Socket.IO, SQLite, and strict object-oriented programming (OOP) principles. This backend powers a chat application with real-time messaging and persistent storage, intended to be paired with a Vue+Vite front-end.

---

## Table of Contents
1. [Features](#features)
2. [Architecture Overview](#architecture-overview)
3. [Setup & Installation](#setup--installation)
4. [Environment Variables](#environment-variables)
5. [How It Works](#how-it-works)
6. [File-by-File Breakdown](#file-by-file-breakdown)
7. [Database Schema](#database-schema)
8. [Extending the Server](#extending-the-server)

---

## Features
- Real-time chat via WebSockets (Socket.IO)
- Persistent storage with SQLite
- Strict OOP for User and Message entities
- REST API for fetching users and messages
- Centralized logging utility
- Environment-based configuration

---

## Architecture Overview
- **Express** serves the HTTP API and static files
- **Socket.IO** provides real-time WebSocket communication for chat
- **SQLite** stores users and messages
- **OOP Models**: All users and messages are handled as class instances, never as plain objects
- **Logger**: All logs are timestamped and centralized

---

## Setup & Installation

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd real-time-chat/server
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Create a `.env` file (or use the provided one) and set:
```
PORT=3000
SQLITE_FILE=./data/chat.sqlite
```
- `PORT`: Port for the server (default: 3000)
- `SQLITE_FILE`: Path to SQLite DB file (default: `./data/chat.sqlite`)

### 4. Start the server
```bash
npm run dev
```
The server will start and listen for HTTP and WebSocket connections.

---

## Environment Variables
- **PORT**: The port number for the server to listen on (required)
- **SQLITE_FILE**: Path to the SQLite database file (required)

Both are validated at startup. The server will not start if either is missing.

---

## How It Works

### Startup
- Loads environment variables using `@dotenvx/dotenvx`
- Initializes Express app and HTTP server
- Sets up middleware (CORS, JSON parser, static file serving)
- Initializes SQLite database and tables (if not present)
- Starts WebSocket service

### WebSocket Chat
- On client connection, sends the full chat history
- On receiving a new message:
  - Checks if the user exists in the DB; if not, adds them
  - Stores the message in the DB
  - Broadcasts the message to all connected clients
- On disconnect, logs the event

### REST API
- **GET /api/messages**: Returns all chat messages
- **GET /api/users**: Returns all users
- **GET /api/**: Returns a welcome message

*Note: Sending messages is done via WebSocket, not HTTP POST.*

---

## File-by-File Breakdown

| File/Folder                  | Purpose                                                                 |
|------------------------------|------------------------------------------------------------------------|
| `server.ts`                  | Main entry point; sets up Express, DB, WebSocket, routes                |
| `models/User.ts`             | Defines `User` class (id, name, JSON, DB factory)                       |
| `models/Message.ts`          | Defines `Message` class (id, author:User, content, timestamp, JSON, DB) |
| `utils/DatabaseService.ts`   | Singleton for SQLite DB connection and queries                          |
| `utils/WebSocketService.ts`  | Handles Socket.IO connections, message flow, and broadcasting           |
| `utils/Logger.ts`            | Centralized logging utility (info, infoObj, error)                      |
| `routes/chat.ts`             | REST API routes for messages and users (GET only)                       |
| `routes/index.ts`            | Mounts all API routes under `/api`                                      |
| `public/`                    | Static assets for the front-end (HTML, JS, CSS)                         |
| `data/chat.sqlite`           | SQLite database file                                                    |
| `.env`                       | Environment variables (not committed)                                   |
| `package.json`               | NPM dependencies and scripts                                            |
| `tsconfig.json`              | TypeScript configuration                                                |

---

## Database Schema

- **users**
  - `id` (TEXT, PRIMARY KEY)
  - `name` (TEXT, NOT NULL)
- **messages**
  - `id` (INTEGER, PRIMARY KEY AUTOINCREMENT)
  - `authorId` (TEXT)
  - `authorName` (TEXT)
  - `content` (TEXT)
  - `timestamp` (INTEGER)

---

## Extending the Server
- Add authentication/authorization (currently open)
- Add more REST endpoints as needed
- Improve validation and error handling
- Add automated tests for models and services
- Integrate with the Vue+Vite front-end (see main project README)

---

## Credits
- Built with Node.js, Express, Socket.IO, SQLite, and TypeScript
- OOP design for maintainability and clarity

---

For any questions or contributions, please open an issue or submit a pull request.