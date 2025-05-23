 const dotenv = require('dotenv');
const express = require('express');
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

// Load environment variables from .env file (if present)
// On Render, you'll set these directly in the dashboard, but keep this for local development
dotenv.config();

const app = express();
const server = http.createServer(app);

// -------------------------------------------------------------
// CONFIGURE ALLOWED ORIGINS FOR CORS
// IMPORTANT:
// 1. Add your Vercel frontend URL here (e.g., https://your-vercel-app.vercel.app)
// 2. Add any local development URLs if you test locally (e.g., http://localhost:3000, http://localhost:5173 for Vite)
// 3. Ensure no trailing slash on the Vercel URL here, unless Vercel explicitly adds it to your browser's origin header.
//    (Usually, it's safer without the trailing slash for the origin match).
// -------------------------------------------------------------
const ALLOWED_ORIGINS = [
    "http://localhost:3000", // Default Create React App development server
    "http://localhost:5173", // Default Vite development server
    "https://chat-app-two-jet-65.vercel.app", // <--- REPLACE THIS WITH YOUR ACTUAL VERCEL FRONTEND URL
    // Add other preview URLs if needed, e.g.:
    // "https://your-app-name-git-branch-name-yourusername.vercel.app"
];

// Middleware to parse JSON bodies (if you have REST API endpoints)
app.use(express.json());

// Configure CORS for Express HTTP routes (if you have them)
// This is separate from Socket.IO CORS but often uses the same logic
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests from allowed origins or requests with no origin (e.g., Postman, same-origin)
        if (ALLOWED_ORIGINS.includes(origin) || !origin) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked request from origin: ${origin}`);
            callback(new Error('Not allowed by CORS for HTTP requests'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Specify allowed HTTP methods
    credentials: true // Allow sending cookies/auth headers if needed
}));

// Configure Socket.IO server
const io = new Server(server, {
    cors: {
        // This is the CRITICAL part for Socket.IO connections (WebSocket handshake)
        origin: (origin, callback) => {
            // Allow requests from allowed origins or requests with no origin
            if (ALLOWED_ORIGINS.includes(origin) || !origin) {
                callback(null, true);
            } else {
                console.warn(`Socket.IO CORS blocked connection from origin: ${origin}`);
                callback(new Error('Not allowed by CORS for Socket.IO connection'));
            }
        },
        methods: ["GET", "POST"], // Standard methods for Socket.IO handshakes
        credentials: true // Allow sending cookies/auth headers if needed
    },
});

// -------------------------------------------------------------
// Socket.IO Event Handlers
// -------------------------------------------------------------
io.on("connection", (socket) => {
    // Log when a new user connects
    console.log(`User Connected: ${socket.id}`);

    // Handle 'join_room' event
    socket.on("join_room", (data) => {
        socket.join(data); // Add the socket to the specified room
        console.log(`User with ID: ${socket.id} joined room: ${data}`);
    });

    // Handle 'send_message' event
    socket.on("send_message", (data) => {
        console.log(`Message received from ${data.author} in room ${data.room}: "${data.message}"`);
        // Emit the message to all clients in that specific room, EXCLUDING the sender.
        // The sender's frontend code usually adds their own message to their UI locally.
        socket.to(data.room).emit("receive_message", data);
    });

    // Handle 'disconnect' event
    socket.on("disconnect", () => {
        // Log when a user disconnects
        console.log(`User disconnected: ${socket.id}`);
    });
});

// -------------------------------------------------------------
// Basic Health Check Endpoint for Render (and other platforms)
// Render uses this to know if your server is ready.
// -------------------------------------------------------------
app.get('/health', (req, res) => {
    res.status(200).send('Server is healthy and running.');
});

// -------------------------------------------------------------
// Server Start
// Use process.env.PORT for deployment (Render provides this)
// Fallback to 5000 for local development if PORT isn't set.
// -------------------------------------------------------------
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server started on PORT ${PORT}`);
    console.log(`Backend accessible at: http://localhost:${PORT} (for local development)`);
});
