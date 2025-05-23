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

if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_GEMINI_API_KEY") {
    console.error("CRITICAL ERROR: GEMINI_API_KEY is not set or is a placeholder!");
    console.error("Please replace 'YOUR_GEMINI_API_KEY' with your actual key, or use environment variables.");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// -------------------------------------------------------------
// NEW: Function to list available models for debugging
// -------------------------------------------------------------
async function listAvailableModels() {
    console.log("Attempting to list available Gemini models...");
    try {
        const { models } = await genAI.listModels();
        console.log("--- Available Gemini Models ---");
        if (models && models.length > 0) {
            models.forEach(model => {
                console.log(`Name: ${model.name}`);
                console.log(`  DisplayName: ${model.displayName}`);
                console.log(`  Description: ${model.description}`);
                console.log(`  Supported Generation Methods: ${model.supportedGenerationMethods ? model.supportedGenerationMethods.join(', ') : 'None'}`);
                console.log('---');
            });
            console.log("--- End of Model List ---");

            // Look for models that support 'generateContent'
            const textGenerationModels = models.filter(m => 
                m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')
            );
            if (textGenerationModels.length > 0) {
                console.log("\nRECOMMENDED MODELS FOR TEXT GENERATION:");
                textGenerationModels.forEach(m => console.log(`- ${m.name} (DisplayName: ${m.displayName})`));
            } else {
                console.log("\nNo models found that directly support 'generateContent' with this key/region.");
            }

        } else {
            console.log("No models returned. API key might be invalid or region is unsupported.");
        }
    } catch (error) {
        console.error("ERROR listing models:", error);
    }
}

// Call the function when the server starts
listAvailableModels();

// Initialize the model *after* listing them, so we can use the correct one
// For now, let's keep a placeholder. We'll update this after you get the list.
const model = genAI.getGenerativeModel({ model: "REPLACE_WITH_CORRECT_MODEL_NAME" }); // Placeholder for now


// -------------------------------------------------------------
// Socket.IO Event Handlers - Simplified for AI Chat
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
            // Only try to generate content if the model is correctly initialized
            if (model.modelName === "REPLACE_WITH_CORRECT_MODEL_NAME") {
                 throw new Error("Gemini model not yet set. Please check logs for available models.");
            }

            const prompt = data.message;
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const aiText = response.text();

            const aiMessageData = {
                author: 'Gemini AI',
                message: aiText,
                time: new Date(Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            };

            socket.emit('receive_message', aiMessageData);

        } catch (error) {
            console.error('Error communicating with Gemini API:', error);
            const errorMessageData = {
                author: 'Gemini AI',
                message: `Oops! AI error: ${error.message}. Check backend logs.`, // More descriptive error
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
