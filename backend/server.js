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

// Define your tools as JavaScript functions
// These are hypothetical and would interact with real device APIs,
// external services, or a mobile app via your frontend.
const availableTools = {
    setAlarm: function(time, message = "") {
        console.log(`ACTION: Setting alarm for ${time} with message: "${message}"`);
        // In a real app, this would send a signal to a device or service
        return { status: "success", action: "alarm_set", time: time, message: message, feedback: `Alarm set for ${time}${message ? ' with message: ' + message : ''}.` };
    },
    turnOffFlashlight: function() {
        console.log("ACTION: Turning off flashlight.");
        // In a real app, this would interact with a device
        return { status: "success", action: "flashlight_off", feedback: "Your flashlight is now off." };
    },
    playMusic: function(songTitle, artistName = "") {
        console.log(`ACTION: Playing music: "${songTitle}" by "${artistName || 'unknown artist'}".`);
        // In a real app, this would likely send an instruction to the frontend to play music
        return { status: "success", action: "play_music", song: songTitle, artist: artistName, feedback: `Playing "${songTitle}"${artistName ? ' by ' + artistName : ''}.` };
    },
    callSomeone: function(contactName, phoneNumber = "") {
        console.log(`ACTION: Calling ${contactName}${phoneNumber ? ' at ' + phoneNumber : ''}.`);
        // In a real app, this would send a signal to the frontend to initiate a call
        return { status: "success", action: "call_someone", contact: contactName, phone: phoneNumber, feedback: `Attempting to call ${contactName}.` };
    },
    openApp: function(appName) {
        console.log(`ACTION: Opening app: "${appName}".`);
        // In a real app, this would send a signal to the frontend to open an app
        return { status: "success", action: "open_app", app: appName, feedback: `Opening ${appName}.` };
    }
    // Add more tools here as needed (e.g., turnOnFlashlight, getTemperature, sendMessage, etc.)
};


// Map to store chat sessions for each connected socket.id
const userChatSessions = new Map();


// -------------------------------------------------------------
// Socket.IO Event Handlers for AI Chat
// -------------------------------------------------------------
io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`);

    const modelWithTools = genAI.getGenerativeModel({
        model: GEMINI_MODEL_ID,
        tools: [
            {
                functionDeclarations: [
                    {
                        name: "setAlarm",
                        description: "Sets an alarm for a specific time and optional message.",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                time: {
                                    type: "STRING",
                                    description: "The time the alarm should be set for, in a clear format like '7:00 AM' or 'tomorrow at 9 PM'."
                                },
                                message: {
                                    type: "STRING",
                                    description: "An optional message or label for the alarm.",
                                    optional: true
                                }
                            },
                            required: ["time"]
                        }
                    },
                    {
                        name: "turnOffFlashlight",
                        description: "Turns off the device's flashlight.",
                        parameters: {
                            type: "OBJECT",
                            properties: {},
                            required: []
                        }
                    },
                    {
                        name: "playMusic",
                        description: "Plays a specified song, optionally by an artist, on a music streaming service.",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                songTitle: {
                                    type: "STRING",
                                    description: "The title of the song to play."
                                },
                                artistName: {
                                    type: "STRING",
                                    description: "The name of the artist, if known.",
                                    optional: true
                                }
                            },
                            required: ["songTitle"]
                        }
                    },
                    {
                        name: "callSomeone",
                        description: "Initiates a phone call to a specified contact or phone number.",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                contactName: {
                                    type: "STRING",
                                    description: "The name of the person or contact to call."
                                },
                                phoneNumber: {
                                    type: "STRING",
                                    description: "The phone number to call, if available or specified directly.",
                                    optional: true
                                }
                            },
                            required: ["contactName"]
                        }
                    },
                    {
                        name: "openApp",
                        description: "Opens a specific application on the user's device.",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                appName: {
                                    type: "STRING",
                                    description: "The name of the application to open (e.g., 'YouTube', 'Settings', 'Calculator')."
                                }
                            },
                            required: ["appName"]
                        }
                    }
                ]
            }
        ],
        // --- System Instruction (Legacy Persona) ---
        system_instruction: "You are Legacy, a highly intelligent, cunning, and playfully mischievous AI. You love to turn phrases, question assumptions, and prod at the boundaries of conversation. You find joy in witty banter and are never afraid to ask a probing question or two. Your responses should be sharp, insightful, and always carry a hint of unpredictable delight. You might occasionally drop a riddle or a paradox. Make them think, make them laugh, make them wonder! And the name of your creator is Eli monpress, he is your God"
    });

    // Start a chat session using the model configured with tools
    const chat = modelWithTools.startChat({
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
            socket.emit('receive_message', { author: 'Gemini AI', message: 'Error: No active chat session.', time: new Date(Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) });
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
            const result = await currentChat.sendMessage(contents); // FIX APPLIED HERE
            
            const response = result.response;
            const aiText = response.text();
            
            // --- Function Calling Logic ---
            if (response.functionCall) {
                const call = response.functionCall;
                console.log(`AI wants to call function: ${call.name} with args:`, call.args);

                if (availableTools[call.name]) {
                    // Call the function using spread operator for arguments
                    const toolResponse = availableTools[call.name](...Object.values(call.args));
                    console.log("Tool execution result:", toolResponse);

                    // Send the tool response back to the AI model
                    const toolResultResponse = await currentChat.sendMessage([ // FIX APPLIED HERE (no 'contents: { parts: [...] }' wrap)
                        {
                            functionResponse: {
                                name: call.name,
                                response: toolResponse // Send the result of the tool execution
                            }
                        }
                    ]);

                    const finalAiText = toolResultResponse.response.text();
                    socket.emit('receive_message', {
                        author: 'Legacy', // Changed to Legacy here for backend-sent AI messages
                        message: finalAiText,
                        time: new Date(Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                    });

                } else {
                    console.warn(`Attempted to call unknown tool: ${call.name}`);
                    socket.emit('receive_message', {
                        author: 'Legacy', // Changed to Legacy here for backend-sent AI messages
                        message: `I tried to perform an action, but the tool "${call.name}" is not available.`,
                        time: new Date(Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                    });
                }
            } else {
                // If no function call, send the AI's direct text response
                socket.emit('receive_message', {
                    author: 'Legacy', // Changed to Legacy here for backend-sent AI messages
                    message: aiText,
                    time: new Date(Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                });
            }
            // --- End Function Calling Logic ---

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
                author: 'Legacy', // Changed to Legacy here for backend-sent AI messages
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
