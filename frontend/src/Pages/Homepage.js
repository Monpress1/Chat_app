import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicrophone, faStop, faPaperPlane, faImage, faTimes, faVolumeHigh } from '@fortawesome/free-solid-svg-icons';

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

const ChatWithAI = () => {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [socket, setSocket] = useState(null);
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState(null);
    const [isCallMode, setIsCallMode] = useState(false); // State to control voice mode
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = null);
    const [isSpeaking, setIsSpeaking] = useState(false); // Tracks if any speech is ongoing

    const chatContainerRef = useRef(null); // Ref for scrolling to bottom
    const currentRecognitionRef = useRef(null); // Ref to hold current recognition instance

    // Function to format timestamp
    const formatTime = (date) => {
        return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    // Auto-scroll to the bottom of the chat
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]); // Scroll whenever messages change

    // Initialize Socket.IO connection
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
            // Clean up recognition on disconnect if needed
            if (currentRecognitionRef.current) {
                currentRecognitionRef.current.stop();
                currentRecognitionRef.current = null;
            }
            setIsListening(false);
            // Ensure any ongoing speech is cancelled
            if (SpeechSynthesis.speaking) {
                SpeechSynthesis.cancel();
            }
            setIsSpeaking(false);
        });

        return () => {
            if (newSocket) {
                newSocket.disconnect();
            }
        };
    }, [isCallMode]); // Re-initialize socket if call mode changes (if needed, or just manage recognition within)


    // Text to Speech (AI Speaking)
    const speakText = useCallback((text) => {
        if (!SpeechSynthesis) {
            console.warn("Speech Synthesis not supported in this browser.");
            return;
        }

        // Stop any ongoing speech before starting a new one
        if (SpeechSynthesis.speaking) {
            SpeechSynthesis.cancel();
        }

        setIsSpeaking(true);
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0; // Normal speed
        utterance.pitch = 1.0; // Normal pitch

        utterance.onend = () => {
            setIsSpeaking(false);
            if (isCallMode && recognition) {
                // Restart listening after AI finishes speaking in call mode
                startListening();
            }
        };
        utterance.onerror = (event) => {
            console.error('SpeechSynthesisUtterance.onerror', event);
            setIsSpeaking(false);
            if (isCallMode && recognition) {
                startListening(); // Attempt to restart even on error
            }
        };

        SpeechSynthesis.speak(utterance);
    }, [isCallMode, recognition]);


    // Speech Recognition (Mic Listening)
    const setupRecognition = useCallback(() => {
        if (!SpeechRecognition) {
            console.warn("Speech Recognition not supported in this browser.");
            return null;
        }

        const newRecognition = new SpeechRecognition();
        newRecognition.continuous = false; // Only get one result per start
        newRecognition.interimResults = false; // Only final results
        newRecognition.lang = 'en-US'; // Set language

        newRecognition.onstart = () => {
            setIsListening(true);
            console.log('Voice recognition started...');
        };

        newRecognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            console.log('Transcript:', transcript);
            setMessage(transcript); // Set transcript to input field
            // Automatically send message after result
            sendMessage(transcript, imageFile); // Send collected text
        };

        newRecognition.onend = () => {
            console.log('Voice recognition ended.');
            setIsListening(false);
            // Don't auto-restart here in text mode, wait for AI reply in call mode
        };

        newRecognition.onerror = (event) => {
            console.error('Speech recognition error', event);
            setIsListening(false);
            if (isCallMode && event.error !== 'no-speech') {
                // Only try to restart if it's not a 'no-speech' error in call mode
                setTimeout(startListening, 500); // Give a small delay before restarting
            }
        };

        return newRecognition;
    }, [isCallMode, imageFile, sendMessage]);


    // Start Listening function - REFINED LOGIC HERE
    const startListening = useCallback(() => {
        if (!recognition) {
            console.log("Recognition not initialized, setting up and starting.");
            const rec = setupRecognition();
            setRecognition(rec);
            currentRecognitionRef.current = rec;
            if (rec) rec.start();
        } else if (!isListening) { // Only start if not already listening
            console.log("Recognition initialized, but not listening. Starting.");
            recognition.start();
        } else {
            console.log("Already listening, no need to restart.");
        }
    }, [recognition, isListening, setupRecognition]);


    // Stop Listening function
    const stopListening = useCallback(() => {
        if (isListening && currentRecognitionRef.current) {
            currentRecognitionRef.current.stop();
        }
    }, [isListening]);


    // Toggle Call Mode (Voice Chat)
    const toggleCallMode = () => {
        setIsCallMode(prev => !prev);
        if (!isCallMode) { // If turning ON call mode
            // Immediately start listening when entering call mode
            if (!recognition) {
                const rec = setupRecognition();
                setRecognition(rec);
                currentRecognitionRef.current = rec;
                if (rec) rec.start();
            } else {
                 // Ensure any ongoing recognition is stopped first before starting new one
                if (isListening && currentRecognitionRef.current) {
                    currentRecognitionRef.current.stop();
                }
                recognition.start(); // This should now start if not listening
            }
        } else { // If turning OFF call mode
            stopListening();
            // Stop any ongoing speech synthesis
            if (SpeechSynthesis.speaking) {
                SpeechSynthesis.cancel();
            }
            setIsSpeaking(false);
        }
    };


    // Auto Mic on Load (when component mounts, and in call mode)
    useEffect(() => {
        if (isCallMode) {
            const rec = setupRecognition();
            setRecognition(rec);
            currentRecognitionRef.current = rec; // Store the ref
            if (rec) rec.start(); // Start listening
        }
        // Cleanup function for unmounting
        return () => {
            if (currentRecognitionRef.current) {
                currentRecognitionRef.current.stop();
                currentRecognitionRef.current = null;
            }
            if (SpeechSynthesis.speaking) {
                SpeechSynthesis.cancel();
            }
            setIsListening(false);
            setIsSpeaking(false);
        };
    }, [isCallMode, setupRecognition]); // Depend on isCallMode and setupRecognition


    // Send message to backend
    const sendMessage = useCallback(async (text, image = null) => {
        if (!socket) {
            console.error('Socket not connected');
            return;
        }

        const messageToSend = text || message; // Use passed text if available, else state message
        if (!messageToSend && !image) return; // Don't send empty messages or no image

        let imageData = null;
        if (image) {
            // Convert image file to Base64
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

    }, [socket, message, imageFile]); // Include imageFile in dependencies


    // Handle text input change
    const handleMessageChange = (e) => {
        setMessage(e.target.value);
    };

    // Handle Enter key press
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
                setImagePreview(reader.result);
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
        // Conditional background styling based on isCallMode
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
                    <button
                        onClick={toggleCallMode}
                        className={`p-2 rounded-full text-white transition-all duration-300 ${isCallMode ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
                        title={isCallMode ? 'Exit Voice Mode' : 'Enter Voice Mode'}
                    >
                        <FontAwesomeIcon icon={isCallMode ? faVolumeHigh : faMicrophone} />
                    </button>
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

                    {isCallMode ? (
                        <button
                            onClick={isListening ? stopListening : startListening}
                            className={`flex-shrink-0 p-3 rounded-full text-white transition-all duration-300 ${
                                isListening ? (isSpeaking ? 'bg-orange-500' : 'bg-red-500 hover:bg-red-600') : 'bg-green-500 hover:bg-green-600'
                            } ${isSpeaking ? 'animate-pulse' : ''}`}
                            title={isListening ? (isSpeaking ? 'AI Speaking...' : 'Stop Listening') : 'Start Listening'}
                            disabled={isSpeaking} // Disable mic button while AI is speaking
                        >
                            <FontAwesomeIcon icon={isListening ? faStop : faMicrophone} />
                            {isSpeaking && <span className="ml-2">Speaking...</span>}
                        </button>
                    ) : (
                        <input
                            type="text"
                            value={message}
                            onChange={handleMessageChange}
                            onKeyPress={handleKeyPress}
                            placeholder="Type your message..."
                            className="flex-1 p-3 border border-gray-300 rounded-full mr-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    )}

                    {!isCallMode && ( // Only show send button in text mode
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

export default ChatWithAI;
