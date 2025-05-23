 const express = require('express');
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// ---------------------------------------------
// HARDCODED GEMINI API KEY (for testing only)
// Replace with your actual Gemini API key below
// ---------------------------------------------
const GEMINI_API_KEY = "AIzaSyAWMbK4XziFm3xkMCb6xQHDUQe3UIh97ko"; // <<== PUT YOUR API KEY HERE

if (!GEMINI_API_KEY) {
    console.error("ERROR: Missing Gemini API Key");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

const app = express();
const server = http.createServer(app);

// ---------------------------------------------
// CORS CONFIG - UPDATE YOUR FRONTEND URL HERE
// ---------------------------------------------
const ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://chat-app-two-jet-65.vercel.app", // Replace if needed
];

app.use(express.json());
app.use(cors({
    origin: (origin, callback) => {
        if (ALLOWED_ORIGINS.includes(origin) || !origin) {
            callback(null, true);
        } else {
            console.warn(`Blocked HTTP request from: ${origin}`);
            callback(new Error('CORS blocked'));
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
                console.warn(`Blocked Socket.IO connection from: ${origin}`);
                callback(new Error('CORS blocked'));
            }
        },
        methods: ["GET", "POST"],
        credentials: true
    },
});

// ---------------------------------------------
// SOCKET.IO HANDLERS
// ---------------------------------------------
io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("join_room", (room) => {
        socket.join(room);
        console.log(`User ${socket.id} joined room: ${room}`);
    });

    socket.on("send_message", async (data) => {
        console.log(`[${data.room}] ${data.author}: ${data.message}`);
        socket.to(data.room).emit("receive_message", data);

        if (data.author !== "Gemini AI") {
            try {
                const prompt = data.message;
                const result = await model.generateContent(prompt);
                const response = await result.response;
                const aiText = response.text();

                const aiMessage = {
                    room: data.room,
                    author: "Gemini AI",
                    message: aiText,
                    time: new Date().toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                };

                io.to(data.room).emit("receive_message", aiMessage);

            } catch (err) {
                console.error("Gemini error:", err);
                const errorMessage = {
                    room: data.room,
                    author: "Gemini AI",
                    message: "Sorry, I ran into an issue. Please try again.",
                    time: new Date().toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                };
                io.to(data.room).emit("receive_message", errorMessage);
            }
        }
    });

    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

// ---------------------------------------------
// HEALTH CHECK
// ---------------------------------------------
app.get('/health', (req, res) => {
    res.status(200).send('Server is healthy');
});

// ---------------------------------------------
// START SERVER
// ---------------------------------------------
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
