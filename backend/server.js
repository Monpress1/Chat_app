const dotenv = require('dotenv');
const express = require('express');
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { GoogleGenerativeAI } = require("@google/generative-ai"); // <-- NEW

// Load environment variables from .env file (for local development)
dotenv.config();

const app = express();
const server = http.createServer(app);

// -------------------------------------------------------------
// CONFIGURE ALLOWED ORIGINS FOR CORS
// IMPORTANT: Replace with your ACTUAL Vercel frontend URL
// Example: "https://your-vercel-app-name.vercel.app"
// -------------------------------------------------------------
const ALLOWED_ORIGINS = [
    "http://localhost:3000", // For local frontend development (Create React App)
    "http://localhost:5173", // For local frontend development (Vite)
    "https://chat-app-two-jet-65.vercel.app", // <--- CONFIRM THIS IS YOUR FRONTEND URL
    // Add any other specific Vercel preview URLs if needed
];

app.use(express.json()); // For parsing JSON request bodies

// Configure CORS for Express HTTP routes (if you have them)
app.use(cors({
    origin: (origin, callback) => {
        if (ALLOWED_ORIGINS.includes(origin) || !origin) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked HTTP request from origin: ${origin}`);
            callback(new Error('Not allowed by CORS for HTTP requests'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

// Configure Socket.IO server with CORS
const io = new Server(server, {
    cors: {
        origin: (origin, callback) => {
            if (ALLOWED_ORIGINS.includes(origin) || !origin) {
                callback(null, true);
            } else {
                console.warn(`Socket.IO CORS blocked connection from origin: ${origin}`);
                callback(new Error('Not allowed by CORS for Socket.IO connection'));
            }
        },
        methods: ["GET", "POST"], // Standard methods for Socket.IO handshakes
        credentials: true
    },
});

// -------------------------------------------------------------
// Gemini API Configuration
// Retrieve API key from environment variables (DO NOT HARDCODE IT HERE)
// -------------------------------------------------------------
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error("CRITICAL ERROR: GEMINI_API_KEY is not set in environment variables!");
    console.error("Please add GEMINI_API_KEY to your Render environment variables.");
    process.exit(1); // Exit the process if the API key is missing
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
// Choose the appropriate model (e.g., "gemini-pro", "gemini-pro-vision")
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// -------------------------------------------------------------
// Socket.IO Event Handlers
// -------------------------------------------------------------
io.on("connection", (socket) => {
    console.log(`User Connected: ${socket.id}`);

    socket.on("join_room", (roomName) => {
        socket.join(roomName);
        console.log(`User with ID: ${socket.id} joined room: ${roomName}`);
    });

    socket.on("send_message", async (data) => { // Make this handler async
        console.log(`Message received from ${data.author} in room ${data.room}: "${data.message}"`);

        // First, broadcast the human user's message to everyone else in the room
        socket.to(data.room).emit("receive_message", data);

        // Then, process the message with Gemini AI (if it's not the AI sending)
        if (data.author !== "Gemini AI") { // Prevent AI from responding to itself
            try {
                const prompt = data.message;
                const result = await model.generateContent(prompt);
                const response = await result.response;
                const aiText = response.text();

                const aiMessageData = {
                    room: data.room,
                    author: "Gemini AI", // Distinct author for AI messages
                    message: aiText,
                    time: new Date(Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), // Formatted time
                };

                // Send the AI's response to all clients in the room (including the sender)
                io.to(data.room).emit("receive_message", aiMessageData);

            } catch (error) {
                console.error("Error communicating with Gemini API:", error);
                const errorMessageData = {
                    room: data.room,
                    author: "Gemini AI",
                    message: "Oops! I encountered an error while processing your request. Please try again or rephrase.",
                    time: new Date(Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                };
                io.to(data.room).emit("receive_message", errorMessageData);
            }
        }
    });

    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

// -------------------------------------------------------------
// Health Check Endpoint for Render
// -------------------------------------------------------------
app.get('/health', (req, res) => {
    res.status(200).send('Server is healthy and running.');
});

// -------------------------------------------------------------
// Server Start
// Use process.env.PORT for deployment on platforms like Render
// Fallback to 5000 for local development if PORT is not set
// -------------------------------------------------------------
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server started on PORT ${PORT}`);
    console.log(`Backend accessible locally at: http://localhost:${PORT}`);
});
