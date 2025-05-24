 import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faImage, faTimes, faVolumeHigh } from '@fortawesome/free-solid-svg-icons';

// -------------------------------------------------------------
// CONFIGURE BACKEND URL
// IMPORTANT: Replace with your ACTUAL Render backend URL
// -------------------------------------------------------------
const BACKEND_URL = "https://chat-app-backend-eli-monpresss-projects.vercel.app"; // <--- CONFIRM THIS IS YOUR RENDER BACKEND URL

// -------------------------------------------------------------
// Voice Recognition & Synthesis Setup (Web Speech API)
// -------------------------------------------------------------
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const SpeechSynthesis = window.speechSynthesis;

// Rename the component to Homepage as per your App.js usage
const Homepage = () => {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [socket, setSocket] = useState(null);
    const [isCallMode, setIsCallMode] = useState(false); // Controls voice/text mode
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [isSpeaking, setIsSpeaking] = useState(false); // Tracks if AI is currently speaking

    // Voice Interface specific states (now integrated)
    const [currentRecognition, setCurrentRecognition] = useState(null);
    const [isListening, setIsListening] = useState(false); // New state to track microphone listening

    const chatContainerRef = useRef(null); // Ref for auto-scrolling chat

    // --- Utility Functions ---
    // Function to format timestamp for messages
    const formatTime = (date) => {
        return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    // Auto-scroll to the bottom of the chat whenever messages change
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    // --- Socket.IO Connection and Message Handling ---
    useEffect(() => {
        const newSocket = io(BACKEND_URL);
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Connected to backend Socket.IO');
        });

        newSocket.on('receive_message', (data) => {
            console.log('Received message:', data);
            setMessages((prevMessages) => [...prevMessages, data]);

            // If in call mode and AI sends a text message, speak it automatically
            if (isCallMode && data.author === 'Legacy' && data.message) {
                speakText(data.message);
            }
        });

        newSocket.on('disconnect', () => {
            console.log('Disconnected from backend Socket.IO');
            // Ensure any ongoing speech is cancelled on disconnect
            if (SpeechSynthesis.speaking) {
                SpeechSynthesis.cancel();
            }
            setIsSpeaking(false);
            // Also stop recognition if active
            currentRecognition?.stop();
            setIsListening(false);
        });

        return () => {
            if (newSocket) {
                newSocket.disconnect();
            }
        };
    }, [isCallMode, currentRecognition]); // isCallMode and currentRecognition as dependencies for useEffect

    // --- Text to Speech (AI Speaking) ---
    const speakText = useCallback((text) => {
        if (!SpeechSynthesis) {
            console.warn("Speech Synthesis not supported in this browser.");
            return;
        }

        // Stop any ongoing speech before starting a new one
        if (SpeechSynthesis.speaking) {
            SpeechSynthesis.cancel();
        }

        setIsSpeaking(true); // Indicate that AI is speaking
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0; // Normal speed
        utterance.pitch = 1.0; // Normal pitch

        utterance.onend = () => {
            setIsSpeaking(false); // Indicate that AI has finished speaking
            // If in call mode, and AI finished speaking, restart user listening
            if (isCallMode && currentRecognition && !isListening) {
                console.log('AI finished speaking, attempting to restart user listening...');
                setTimeout(() => currentRecognition.start(), 500);
            }
        };
        utterance.onerror = (event) => {
            console.error('SpeechSynthesisUtterance.onerror', event);
            setIsSpeaking(false); // Indicate that AI has stopped speaking due to error
            // If in call mode, and AI speaking error, restart user listening
            if (isCallMode && currentRecognition && !isListening) {
                console.log('AI speaking error, attempting to restart user listening...');
                setTimeout(() => currentRecognition.start(), 500);
            }
        };

        SpeechSynthesis.speak(utterance);
    }, [isCallMode, isListening, currentRecognition]);

    // --- Speech Recognition Setup (Integrated) ---
    const setupRecognition = useCallback(() => {
        if (!SpeechRecognition) {
            alert("Speech recognition not supported in this browser.");
            console.error("Web Speech API (SpeechRecognition) not found.");
            return null;
        }

        const rec = new SpeechRecognition();
        rec.lang = 'en-US';
        rec.continuous = false; // Only get one result per start
        rec.interimResults = false; // Only final results

        rec.onstart = () => {
            setIsListening(true);
            console.log('Voice recognition started...');
        };

        rec.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            console.log('Transcript received:', transcript);
            if (transcript.trim() !== "") {
                sendMessage(transcript); // Send the transcript directly
            }
        };

        rec.onend = () => {
            setIsListening(false);
            console.log('Voice recognition ended.');
            // If in call mode AND AI is not speaking, attempt to restart listening
            if (isCallMode && !isSpeaking) {
                console.log('Attempting to restart listening after onend...');
                if (currentRecognition) {
                    setTimeout(() => currentRecognition.start(), 500);
                }
            }
        };

        rec.onerror = (event) => {
            setIsListening(false);
            console.error('Speech recognition error:', event.error);
            // Try to restart if it's not a 'no-speech' error in call mode, and AI isn't speaking
            if (isCallMode && event.error !== 'no-speech' && !isSpeaking) {
                console.log('Attempting to restart listening after error...');
                if (currentRecognition) {
                    setTimeout(() => currentRecognition.start(), 500);
                }
            }
        };

        return rec;
    }, [isCallMode, isSpeaking, currentRecognition, sendMessage]); // Added sendMessage as dependency

    // --- Mic Control Functions (Integrated) ---
    const startListening = useCallback(() => {
        if (!currentRecognition) {
            console.log("No recognition instance, setting up and starting.");
            const rec = setupRecognition();
            if (rec) {
                setCurrentRecognition(rec);
                rec.start();
            }
        } else if (!isListening) { // Only start if not already listening
            console.log("Recognition instance exists, but not listening. Starting.");
            currentRecognition.start();
        } else {
            console.log("Already listening, no need to restart.");
        }
    }, [currentRecognition, isListening, setupRecognition]);


    const stopListening = useCallback(() => {
        if (isListening && currentRecognition) {
            console.log("Stopping listening.");
            currentRecognition.stop();
        }
    }, [isListening, currentRecognition]);

    // --- Toggle Voice Call Mode (Integrated) ---
    const toggleCallMode = () => {
        const newCallMode = !isCallMode;
        setIsCallMode(newCallMode);

        if (!newCallMode) { // If turning OFF call mode
            stopListening(); // Ensure mic is stopped
            // Ensure any ongoing speech synthesis is cancelled
            if (SpeechSynthesis.speaking) {
                SpeechSynthesis.cancel();
            }
            setIsSpeaking(false); // Reset AI speaking state
            setCurrentRecognition(null); // Clear the recognition instance
        }
        // If turning ON, useEffect will handle starting mic automatically
    };

    // --- Automatic Mic Start/Cleanup on Call Mode Change (Integrated) ---
    useEffect(() => {
        console.log("Homepage useEffect (Voice Mode) triggered. isCallMode:", isCallMode); // Changed from ChatWithAI
        if (isCallMode) {
            console.log("isCallMode is true, attempting to start listening...");
            startListening(); // Automatically start listening when entering call mode
        }

        // Cleanup function when component unmounts or isCallMode changes
        return () => {
            console.log("Homepage useEffect (Voice Mode) cleanup. Stopping mic and speech."); // Changed from ChatWithAI
            currentRecognition?.stop(); // Ensure mic is stopped
            if (SpeechSynthesis.speaking) {
                SpeechSynthesis.cancel();
            }
            setIsListening(false);
            setIsSpeaking(false);
            setCurrentRecognition(null); // Clear instance on cleanup
        };
    }, [isCallMode, startListening, isSpeaking, currentRecognition]);


    // --- Send Message Logic ---
    // Function to send messages (text or text with image) to the backend
    const sendMessage = useCallback(async (text, image = null) => {
        if (!socket) {
            console.error('Socket not connected');
            return;
        }

        const messageToSend = text || message; // Use passed text (from voice) or state message (from input)
        if (!messageToSend && !image) return; // Don't send empty messages or no image

        let imageData = null;
        if (image) {
            // Convert image file to Base64 if an image is attached
            const reader = new FileReader();
            reader.readAsDataURL(image);
            reader.onload = () => {
                imageData = reader.result;
                socket.emit('send_message', { message: messageToSend, image: imageData });
                setMessage(''); // Clear input field
                setImageFile(null); // Clear image file
                setImagePreview(null); // Clear image preview
            };
            reader.onerror = (error) => {
                console.error("Error converting image to Base64:", error);
            };
            return; // Exit here, actual emit happens in reader.onload
        }

        // For text-only messages or if image conversion isn't needed
        socket.emit('send_message', { message: messageToSend, image: imageData });
        setMessage(''); // Clear input field
        setImageFile(null); // Clear image file
        setImagePreview(null); // Clear image preview

    }, [socket, message, imageFile]); // Dependencies for sendMessage

    // --- Input & Image Handling ---
    // Handle text input change
    const handleMessageChange = (e) => {
        setMessage(e.target.value);
    };

    // Handle Enter key press to send message
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            sendMessage(message, imageFile);
        }
    };

    // Handle image file selection
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result); // Set image preview
            };
            reader.readAsDataURL(file);
        }
    };

    // Clear selected image
    const clearImage = () => {
        setImageFile(null);
        setImagePreview(null);
    };

    return (
        // Conditional background styling for call mode
        <div className="h-screen overflow-hidden flex items-center justify-center p-4"
             style={isCallMode ? { // Apply gradient ONLY if isCallMode is true
                 background: 'linear-gradient(135deg, #0A0A0A, #1A1A2E, #280C4F, #5D238A, #A64E30, #C2700D, #FDBB2D, #0A0A0A)', // Darker gradient
                 backgroundSize: '400% 400%',
                 animation: 'gradientAnimation 15s ease infinite',
             } : { // Apply a simple light background if isCallMode is false
                 background: '#F0F2F5', // A light grey for contrast in text mode
             }}>
            {/* Keyframes for gradient animation (always present, as it's only active when applied) */}
            <style>
                {`
                @keyframes gradientAnimation {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                `}
            </style>

            <div className="flex flex-col h-full w-full max-w-2xl bg-white shadow-xl rounded-lg overflow-hidden">
                {/* Chat Header */}
                <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md flex items-center justify-between">
                    <h1 className="text-xl font-bold">Legacy Chat</h1>
                    {/* Voice Interface controls (now integrated with text/emoji icons) */}
                    {isCallMode ? (
                        // Mic button in voice chat mode
                        <div className="flex items-center space-x-2">
                            <button
                                className={`bg-white text-black p-3 rounded-full shadow-md transition-all duration-300 ${
                                    isListening ? "animate-pulse" : "" // Pulse when actively listening
                                } ${isSpeaking ? "opacity-50 cursor-not-allowed" : ""}`} // Dim if AI is speaking
                                onClick={isListening ? stopListening : startListening} // Toggles listening
                                disabled={isSpeaking} // Disable while AI is speaking
                                title={isSpeaking ? "AI is speaking..." : (isListening ? "Stop listening" : "Start listening")}
                            >
                                {/* Replaced Mic/MicOff icons with emojis/text */}
                                <span className="text-xl">{isListening ? '🔇' : '🎤'}</span> {/* Muted speaker or Microphone emoji */}
                            </button>
                            {/* Button to exit voice mode */}
                            <button
                                className="text-white p-2 rounded-full hover:bg-white/20 transition"
                                onClick={toggleCallMode} // This button directly exits call mode
                                title="Exit Voice Mode"
                            >
                                {/* Replaced X icon with emoji */}
                                <span className="text-xl">✖️</span> {/* Multiplication X emoji */}
                            </button>
                        </div>
                    ) : (
                        // Button to enter voice chat mode
                        <button
                            className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition"
                            onClick={toggleCallMode} // This button directly enters call mode
                            title="Enter Voice Mode"
                        >
                            {/* Replaced Mic icon with emoji */}
                            <span className="text-xl">🎤</span> {/* Microphone emoji */}
                        </button>
                    )}
                </div>

                {/* Chat Messages Container */}
                <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto bg-gray-50">
                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`flex mb-3 ${msg.author === 'You' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[75%] px-4 py-2 rounded-lg shadow-md ${
                                msg.author === 'You'
                                    ? 'bg-blue-500 text-white rounded-br-none'
                                    : 'bg-gray-200 text-gray-800 rounded-bl-none'
                            } ${msg.author === 'Legacy' && !isCallMode ? 'flex items-center gap-2' : ''}`}> {/* Added flex and gap for Legacy's message bubble */}
                                {msg.message && <p className={msg.author === 'You' ? "font-semibold text-sm mb-1" : "font-semibold text-sm"}>{msg.author}</p>}
                                {msg.message && <p>{msg.message}</p>}
                                {msg.image && (
                                    <div className="mt-2">
                                        <img src={msg.image} alt="User Upload" className="max-w-xs h-auto rounded-md border border-gray-300" />
                                    </div>
                                )}
                                <div className="flex justify-between items-center mt-1">
                                    <p className="text-xs opacity-75">{formatTime(msg.time)}</p>
                                    {/* Read button for Legacy's messages in text mode */}
                                    {msg.author === 'Legacy' && !isCallMode && (
                                        <button
                                            onClick={() => speakText(msg.message)}
                                            className={`ml-2 p-1 rounded-full text-white transition-colors duration-200 ${
                                                isSpeaking ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-500 hover:bg-purple-600'
                                            }`}
                                            title="Read Message"
                                            disabled={isSpeaking}
                                        >
                                            <FontAwesomeIcon icon={faVolumeHigh} className="text-xs" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Image Preview */}
                {imagePreview && (
                    <div className="relative p-2 border-t border-gray-200 bg-gray-100 flex items-center justify-center">
                        <img src={imagePreview} alt="Preview" className="max-h-24 object-contain rounded-md" />
                        <button
                            onClick={clearImage}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs hover:bg-red-600"
                            title="Remove image"
                        >
                            <FontAwesomeIcon icon={faTimes} />
                        </button>
                    </div>
                )}

                {/* Message Input and Controls */}
                <div className="p-4 border-t border-gray-200 flex items-center bg-white">
                    {/* Image Upload Button */}
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                        id="image-upload"
                    />
                    <label htmlFor="image-upload" className="cursor-pointer mr-2 p-3 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition-colors duration-200" title="Upload Image">
                        <FontAwesomeIcon icon={faImage} />
                    </label>

                    {/* Text Input Field */}
                    <input
                        type="text"
                        value={message}
                        onChange={handleMessageChange}
                        onKeyPress={handleKeyPress}
                        placeholder={isCallMode ? "Voice input active..." : "Type your message..."}
                        className="flex-1 p-3 border border-gray-300 rounded-full mr-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isCallMode} // Disable text input in call mode
                    />

                    {/* Send Button (only in text mode) */}
                    {!isCallMode && (
                        <button
                            onClick={() => sendMessage(message, imageFile)}
                            className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors duration-200"
                            title="Send Message"
                        >
                            <FontAwesomeIcon icon={faPaperPlane} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Homepage; // Changed export from ChatWithAI to Homepage
