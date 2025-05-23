 const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const server = http.createServer(app);

// -------------------------------------------------------------
// CONFIGURE ALLOWED ORIGINS FOR CORS
// IMPORTANT: Replace with your ACTUAL Vercel frontend URL(s)
// -------------------------------------------------------------
const ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:5173',
    "https://chat-app-two-jet-65.vercel.app", // <--- CONFIRM THIS IS YOUR FRONTEND URL
    // Add any other specific Vercel preview URLs if needed
];

app.use(express.json());

// CORS for HTTP requests (like /health endpoint)
app.use(cors({
    origin: (origin, callback) => {
        if (ALLOWED_ORIGINS.includes(origin) || !origin) { // !origin allows same-origin requests
            callback(null, true);
        } else {
            console.warn(`CORS blocked HTTP request from origin: ${origin}`);
            callback(new Error('Not allowed by CORS for HTTP requests'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

// Socket.IO server setup
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
// Gemini API Configuration - **API KEY DIRECTLY IN CODE (AS REQUESTED)**
// WARNING: This is INSECURE for production. Use Environment Variables.
// -------------------------------------------------------------
const GEMINI_API_KEY = "AIzaSyChJ1ako14uH-vOoPW52edT1RvNCz5R9VU"; // **Your API Key HERE**
const GEMINI_MODEL_ID = "gemini-1.5-flash-latest"; // You can change this to "gemini-1.5-pro-latest" or "gemini-2.5-flash-preview-05-20" if you prefer.

if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_GEMINI_API_KEY") {
    console.error("CRITICAL ERROR: GEMINI_API_KEY is not set or is a placeholder!");
    console.error("Please replace 'YOUR_GEMINI_API_KEY' with your actual key.");
    process.exit(1); // Exit if API key is not found
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Initialize the model
const model = genAI.getGenerativeModel({ model: GEMINI_MODEL_ID });
console.log(`Gemini model initialized: ${GEMINI_MODEL_ID}`);


// -------------------------------------------------------------
// Socket.IO Event Handlers for AI Chat
// -------------------------------------------------------------
io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`);

    socket.on('send_message', async (data) => {
        console.log(`Message received from client ${socket.id}: "${data.message}"`);

        // Acknowledge the user's message back to their own client (optional, but good for UI)
        socket.emit('receive_message', {
            author: 'You',
            message: data.message,
            time: new Date(Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        });

        try {
            const userMessage = data.message;
            
            // Define generation configuration
            const generationConfig = {
                temperature: 0.8,
                maxOutputTokens: 4096, // Use the larger token limit you found works
            };

            // Define safety settings
            const safetySettings = [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
            ];

            // Correctly format the prompt for generateContent
            const result = await model.generateContent({
                contents: [{ parts: [{ text: userMessage }] }],
                generationConfig,
                safetySettings,
            });

            const response = result.response;
            const aiText = response.text(); // Get the generated text

            const aiMessageData = {
                author: 'Gemini AI',
                message: aiText,
                time: new Date(Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            };

            socket.emit('receive_message', aiMessageData);

        } catch (error) {
            console.error('Error communicating with Gemini API:', error);
            let errorMessage = `Oops! An AI error occurred.`;
            if (error.response && error.response.candidates && error.response.candidates.length > 0 && error.response.candidates[0].finishReason === 'SAFETY') {
                errorMessage = `I can't respond to that. It might violate safety guidelines.`;
                console.warn('AI response blocked by safety settings:', error.response.prompt_feedback);
            } else if (error.message.includes('quota')) {
                 errorMessage = `AI is busy or hit a quota limit. Please try again in a minute.`;
            } else {
                 errorMessage = `AI error: ${error.message}. Check backend logs.`;
            }
           
            const errorMessageData = {
                author: 'Gemini AI',
                message: errorMessage,
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
