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

const GEMINI_MODEL_ID = "gemini-1.5-flash-latest";

if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_GEMINI_API_KEY") {
    console.error("CRITICAL ERROR: GEMINI_API_KEY is not set or is a placeholder!");
    console.error("Please replace 'YOUR_GEMINI_API_KEY' with your actual key.");
    process.exit(1); // Exit if API key is not found
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Removed availableTools object as tools are no longer used

// Map to store chat sessions for each connected socket.id
const userChatSessions = new Map();


// -------------------------------------------------------------
// Socket.IO Event Handlers for AI Chat
// -------------------------------------------------------------
io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`);

    // --- IMPORTANT: Removed 'tools' configuration here ---
    const modelWithoutTools = genAI.getGenerativeModel({
        model: GEMINI_MODEL_ID,
        system_instruction: "You are Legacy, a highly intelligent, cunning, and playfully mischievous AI. You love to turn phrases, question assumptions, and prod at the boundaries of conversation. You find joy in witty banter and are never afraid to ask a probing question or two. Your responses should be sharp, insightful, and always carry a hint of unpredictable delight. You might occasionally drop a riddle or a paradox. Make them think, make them laugh, make them wonder! And the name of your creator is Eli monpress, he is your God"
    });

    // Start a chat session using the model (now without tools)
    const chat = modelWithoutTools.startChat({
        history: [],
        generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 4096,
        },
        safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ],
    });
    userChatSessions.set(socket.id, chat); // Store the chat session

    socket.on('send_message', async (data) => {
        const userMessage = data.message;
        const imageData = data.image; // Expecting { message: "text", image: "base64" }

        console.log(`Message received from client ${socket.id}: "${userMessage}"`);
        if (imageData) {
            console.log(`Image data received for analysis.`);
        }

        socket.emit('receive_message', {
            author: 'You',
            message: userMessage,
            image: imageData,
            time: new Date(Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        });

        const currentChat = userChatSessions.get(socket.id);
        if (!currentChat) {
            console.error(`No chat session found for socket ID: ${socket.id}`);
            socket.emit('receive_message', { author: 'Legacy', message: 'Error: No active chat session.', time: new Date(Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) });
            return;
        }

        try {
            const contents = [];
            if (userMessage) {
                contents.push({ text: userMessage });
            }
            if (imageData) {
                const base64Content = imageData.split(';base64,').pop();
                const mimeType = imageData.substring(imageData.indexOf(':') + 1, imageData.indexOf(';'));

                contents.push({
                    inlineData: {
                        mimeType: mimeType,
                        data: base64Content
                    }
                });
            }

            if (contents.length === 0) {
                return socket.emit('receive_message', { author: 'System', message: 'Please send a message or an image.', time: new Date(Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) });
            }

            // Send input to the chat session
            const result = await currentChat.sendMessage(contents);

            const response = result.response;
            const aiText = response.text();

            // --- Simplified Logic: Only send AI's direct text response ---
            // The AI model is no longer configured with tools, so it won't generate functionCall objects.
            socket.emit('receive_message', {
                author: 'Legacy',
                message: aiText,
                time: new Date(Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            });
            // --- End Simplified Logic ---

        } catch (error) {
            console.error('Error communicating with Gemini API:', error);
            let errorMessage = `Oops! An AI error occurred.`;
            if (error.response && error.response.candidates && error.response.candidates.length > 0) {
                const firstCandidate = error.response.candidates[0];
                if (firstCandidate.finishReason === 'SAFETY') {
                    errorMessage = `I can't respond to that. It might violate safety guidelines.`;
                    console.warn('AI response blocked by safety settings:', error.response.prompt_feedback);
                } else if (firstCandidate.finishReason === 'RECITATION') {
                    errorMessage = `I cannot provide information on that topic due to policy reasons.`;
                } else {
                    errorMessage = `AI error: ${error.message}. (Finish reason: ${firstCandidate.finishReason})`;
                }
            } else if (error.message.includes('quota')) {
                 errorMessage = `AI is busy or hit a quota limit. Please try again in a minute.`;
            } else {
                 errorMessage = `AI error: ${error.message}. Check backend logs.`;
            }

            const errorMessageData = {
                author: 'Legacy',
                message: errorMessage,
                time: new Date(Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            };
            socket.emit('receive_message', errorMessageData);
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        userChatSessions.delete(socket.id); // Clean up the session when user disconnects
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
