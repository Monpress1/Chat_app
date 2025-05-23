const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const server = http.createServer(app);

// -------------------------------------------------------------
// CONFIGURE ALLOWED ORIGINS FOR CORS
// IMPORTANT: Replace with your ACTUAL Vercel frontend URL
// -------------------------------------------------------------
const ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:5173',
    "https://chat-app-two-jet-65.vercel.app", // <--- CONFIRM THIS IS YOUR FRONTEND URL
    // Add any other specific Vercel preview URLs if needed
];

app.use(express.json());

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
        methods: ['GET', 'POST'],
        credentials: true
    },
});

// -------------------------------------------------------------
// Gemini API Configuration - **INSECURE: API KEY DIRECTLY IN CODE**
// **DO NOT DO THIS IN PRODUCTION! Use Environment Variables!**
// -------------------------------------------------------------
const GEMINI_API_KEY = "AIzaSyAWMbK4XziFm3xkMCb6xQHDUQe3UIh97ko"; // **REPLACE THIS WITH YOUR ACTUAL API KEY**

if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_GEMINI_API_KEY") { // Added check for placeholder
    console.error("CRITICAL ERROR: GEMINI_API_KEY is not set or is a placeholder!");
    console.error("Please replace 'YOUR_GEMINI_API_KEY' with your actual key, or use environment variables.");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

// -------------------------------------------------------------
// Socket.IO Event Handlers - Simplified for AI Chat
// -------------------------------------------------------------
io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`);

    // No 'join_room' event needed as each user chats with AI directly
    // If you need to keep track of conversations or history per user,
    // you might use socket.id as a room ID internally, but not exposed to client as 'room'

    socket.on('send_message', async (data) => {
        console.log(`Message received from client ${socket.id}: "${data.message}"`);

        // Acknowledge the user's message back to their own client (optional, but good for UI)
        socket.emit('receive_message', {
            author: 'You', // Display as "You"
            message: data.message,
            time: new Date(Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        });

        try {
            const prompt = data.message;
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const aiText = response.text();

            const aiMessageData = {
                author: 'Gemini AI', // Distinct author for AI messages
                message: aiText,
                time: new Date(Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            };

            // Send the AI's response ONLY to the sender of the message
            socket.emit('receive_message', aiMessageData);

        } catch (error) {
            console.error('Error communicating with Gemini API:', error);
            const errorMessageData = {
                author: 'Gemini AI',
                message: 'Oops! I encountered an error. Please try again.',
                time: new Date(Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            };
            socket.emit('receive_message', errorMessageData);
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

// Health Check Endpoint
app.get('/health', (req, res) => {
    res.status(200).send('Server is healthy and running.');
});

// Server Start
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server started on PORT ${PORT}`);
    console.log(`Backend accessible locally at: http://localhost:${PORT}`);
});
