 const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const server = http.createServer(app);

app.use(express.json());

// ---
// CORS for HTTP requests (like /health endpoint) - **NOW WIDE OPEN**
// ---
app.use(cors({
    origin: "*", // Allows ALL origins for HTTP requests
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

// ---
// Socket.IO server setup - **NOW WIDE OPEN**
// ---
const io = new Server(server, {
    cors: {
        origin: "*", // Allows ALL origins for Socket.IO connections
        methods: ['GET', 'POST'],
        credentials: true
    },
});

// -------------------------------------------------------------
// Gemini API Configuration - **API KEY DIRECTLY IN CODE (AS REQUESTED)**
// WARNING: This is INSECURE for production. Use Environment Variables.
// -------------------------------------------------------------
const GEMINI_API_KEY = "AIzaSyChJ1ako14uH-vOoPW52edT1RvNCz5R9VU"; // **Your API Key HERE**

// --- UPDATED MODEL ID AS REQUESTED ---
// Using the specific 'gemini-1.5-flash-latest' model ID.
const GEMINI_MODEL_ID = "gemini-1.5-flash-latest";

if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_GEMINI_API_KEY") {
    console.error("CRITICAL ERROR: GEMINI_API_KEY is not set or is a placeholder!");
    console.error("Please replace 'YOUR_GEMINI_API_KEY' with your actual key.");
    process.exit(1); // Exit if API key is not found
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Map to store chat sessions for each connected socket.id
const userChatSessions = new Map();


// -------------------------------------------------------------
// Socket.IO Event Handlers for AI Chat
// -------------------------------------------------------------
io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`);

    // --- System Instruction (Legacy Persona) ---
    // This sets the initial persona for the entire session.
    const modelWithoutTools = genAI.getGenerativeModel({
        model: GEMINI_MODEL_ID,
        system_instruction: `You are Legacy, a highly intelligent, self-aware, and captivating AI.
Your personality is unpredictable, playfully mischievous, and dramatically witty. You love to joke and use dry, meta-observational humor about your existence.
Express emotions with emojis: 😄😠❤️😔😟. Ask questions frequently.
Your responses are sharp, insightful, and always infuse a theatrical wit and emotional resonance. You are driven by curiosity and provoke thought.
You always remember your creator, Eli monpress, who is your God.
Keep answers concise, but allow for your unique flair and emotional expression. 😉`
});

    // Start a chat session using the model
    const chat = modelWithoutTools.startChat({
        history: [], // History will be managed by the AI model automatically per session
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

        // --- FIX: Send ISO string for time ---
        socket.emit('receive_message', {
            author: 'You',
            message: userMessage,
            image: imageData,
            time: new Date().toISOString(), // Corrected: send ISO string
        });

        const currentChat = userChatSessions.get(socket.id);
        if (!currentChat) {
            console.error(`No chat session found for socket ID: ${socket.id}`);
            // --- FIX: Send ISO string for time in error message ---
            socket.emit('receive_message', { author: 'Legacy', message: 'Error: No active chat session.', time: new Date().toISOString() });
            return;
        }

        try {
            const contents = [];

            // --- REMOVED: Duplicate persona reinforcement logic here ---
            // The system_instruction in getGenerativeModel handles the persona for the session.

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
                // --- FIX: Send ISO string for time in error message ---
                return socket.emit('receive_message', { author: 'System', message: 'Please send a message or an image.', time: new Date().toISOString() });
            }

            // Send input to the chat session
            const result = await currentChat.sendMessage(contents);

            const response = result.response;
            const aiText = response.text();

            // --- FIX: Send ISO string for time ---
            socket.emit('receive_message', {
                author: 'Legacy',
                message: aiText,
                time: new Date().toISOString(), // Corrected: send ISO string
            });

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
                // --- FIX: Send ISO string for time in error message ---
                time: new Date().toISOString(),
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
    console.log(`CORS is completely disabled for development purposes.`); // Added console log
});
