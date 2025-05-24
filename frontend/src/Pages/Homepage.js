 import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import ScrollToBottom from 'react-scroll-to-bottom';

// ---------------------------------------------------------------
// IMPORTANT: Replace with your actual Render backend URL
// ---------------------------------------------------------------
const BACKEND_URL = 'https://chat-app-lqcw.onrender.com'; // <--- CONFIRM THIS IS YOUR BACKEND URL

// Initialize the socket connection globally to persist across renders
const socket = io.connect(BACKEND_URL);

const ChatWithAI = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [currentMessage, setCurrentMessage] = useState('');
    const [messageList, setMessageList] = useState(() => {
        try {
            const storedMessages = localStorage.getItem('legacyChatMessages');
            return storedMessages ? JSON.parse(storedMessages) : [];
        } catch (error) {
            console.error("Failed to parse messages from local storage:", error);
            return [];
        }
    });
    const [isCallMode, setIsCallMode] = useState(true);
    const [isListening, setIsListening] = useState(false);
    const [imagePreview, setImagePreview] = useState(null);
    const [imageData, setImageData] = useState(null); // Base64 image data

    const recognitionRef = useRef(null);
    const silenceTimeoutRef = useRef(null);
    const awaitingAiResponseRef = useRef(false); // To track if we're waiting for AI
    const lastUserMessageTimeRef = useRef(null); // To prevent re-adding user message from backend mirror

    // --- LOCAL STORAGE EFFECT: Save messages to localStorage whenever messageList changes ---
    useEffect(() => {
        try {
            localStorage.setItem('legacyChatMessages', JSON.stringify(messageList));
        } catch (error) {
            console.error("Failed to save messages to local storage:", error);
        }
    }, [messageList]);

    // --- Speech Recognition Setup & Control ---
    const startListening = useCallback(() => {
        if (!recognitionRef.current) {
            console.warn("Speech Recognition API not initialized.");
            return;
        }
        if (isConnected && isCallMode && !isListening && !awaitingAiResponseRef.current) {
            try {
                recognitionRef.current.start();
                setIsListening(true);
                console.log('Speech recognition started...');
            } catch (e) {
                // Catch errors like "recognition already started"
                if (e.message !== "recognition already started") {
                    console.error("Error starting speech recognition:", e);
                }
                setIsListening(true); // Still set to true if it's already started
            }
        }
    }, [isConnected, isCallMode, isListening]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
            clearTimeout(silenceTimeoutRef.current);
            console.log('Speech recognition stopped.');
        }
    }, [isListening]);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("Web Speech API not supported in this browser. Voice features will be disabled.");
            setIsCallMode(false);
            return;
        }

        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false; // Set to false for single utterances
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        let interimTranscript = ''; // Use a local variable for building transcript

        recognitionRef.current.onstart = () => {
            setIsListening(true);
            interimTranscript = '';
            console.log('Recognition onstart: Mic is now listening.');
        };

        recognitionRef.current.onresult = (event) => {
            clearTimeout(silenceTimeoutRef.current); // Reset silence timeout on speech
            const last = event.results.length - 1;
            const segment = event.results[last][0].transcript;

            // Only update interimTranscript if continuous is true or handling multiple onresult events
            // For continuous=false, onresult is typically called once with final result
            interimTranscript += segment;

            // Immediately stop listening after getting a result (for single utterance)
            // This is crucial for the turn-taking in smart voice flow
            if (event.results[last].isFinal) {
                stopListening(); // Stop mic as soon as final result is received
                console.log("Recognition onresult: Final result received, mic stopped.");
                if (interimTranscript.trim()) {
                    sendMessage(interimTranscript.trim(), true);
                }
                interimTranscript = ''; // Reset for next utterance
            }
        };

        recognitionRef.current.onend = () => {
            setIsListening(false);
            console.log('Recognition onend: Mic has turned off.');
            // Only restart listening if we're in call mode AND not awaiting AI response
            // AI response handler will restart it if needed
            if (isCallMode && !awaitingAiResponseRef.current) {
                console.log("Recognition onend: Restarting mic after a brief pause.");
                setTimeout(() => { // Small delay to prevent immediate restart issues
                    if (isCallMode && !awaitingAiResponseRef.current) {
                        startListening();
                    }
                }, 500);
            }
        };

        recognitionRef.current.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);
            clearTimeout(silenceTimeoutRef.current);
            if (event.error === 'not-allowed') {
                alert("Microphone access denied. Please enable it in your browser settings to use voice chat.");
                setIsCallMode(false);
            } else if (event.error === 'no-speech') {
                console.log("No speech detected after start, trying again...");
                // Allow it to try again if no speech was detected
                if (isCallMode && !awaitingAiResponseRef.current) {
                    setTimeout(() => {
                        startListening();
                    }, 500);
                }
            } else {
                // For other errors, try to restart if still in call mode and not awaiting AI
                if (isCallMode && !awaitingAiResponseRef.current) {
                    console.log("Recognition onerror: Attempting to restart mic.");
                    setTimeout(() => {
                        startListening();
                    }, 1000);
                }
            }
        };

        // Cleanup on unmount
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
                clearTimeout(silenceTimeoutRef.current);
            }
        };
    }, [isCallMode, isConnected, startListening, stopListening]); // Added dependencies

    // --- Socket Connection & Auto Mic on Load ---
    useEffect(() => {
        socket.on('connect', () => {
            setIsConnected(true);
            console.log('Frontend: Connected to AI chat server!');
            if (isCallMode) {
                startListening(); // Auto mic on load (if in call mode)
            }
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
            console.log('Frontend: Disconnected from AI chat server.');
            stopListening();
        });

        socket.on('connect_error', (error) => {
            console.error('Frontend: Socket connection error:', error);
            setIsConnected(false);
            stopListening();
        });

        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('connect_error');
        };
    }, [isCallMode, startListening, stopListening]);

    // --- Message Receiving & Smart Voice Flow ---
    useEffect(() => {
        socket.on('receive_message', (data) => {
            // FIX: Prevent duplicate user messages.
            // Backend mirrors user messages, so we only add AI messages here
            // or user messages if they haven't been added yet (e.g., from text input)
            if (data.author === 'Legacy') {
                setMessageList((list) => {
                    // Only add if it's not already the very last message (simple duplicate check)
                    if (list.length > 0 && list[list.length - 1].message === data.message && list[list.length - 1].author === data.author) {
                        return list; // Prevent exact duplicate AI message from being added again
                    }
                    return [...list, data];
                });
                awaitingAiResponseRef.current = false; // AI response received
                if (isCallMode) {
                    console.log("AI response received, restarting listening...");
                    startListening(); // Restart mic after AI reply finishes
                }
            } else if (data.author === 'You') {
                // This is a message echoed from the backend.
                // We typically add user messages immediately on the frontend after sending.
                // If you *don't* want the frontend to add the user message locally
                // but wait for the backend mirror, then remove the 'You' message addition
                // from the sendMessage function. For now, this just logs if we get it.
                console.log("Received 'You' message mirror from backend:", data.message);
                // We are relying on the local add in sendMessage for user messages
            }
        });

        return () => {
            socket.off('receive_message');
        };
    }, [socket, isCallMode, startListening]);


    // --- Send Message Function (Modified for voice and image) ---
    const sendMessage = async (messageToSend = currentMessage, isVoice = false) => {
        const message = messageToSend.trim();
        if (!message && !imageData) { // Ensure at least message or image exists
            return;
        }

        if (!isConnected) {
            alert('Not connected to AI chat server. Please wait or check your internet connection.');
            return;
        }

        // Add user message to list immediately on the frontend
        // This is crucial for smooth UX and to prevent duplicates from backend echo
        if (!isVoice || message.length > 0) { // Add voice message only if it's not empty
            setMessageList((list) => {
                const newMessage = {
                    author: 'You',
                    message: message,
                    image: imageData, // Include image in your own message for display
                    time: new Date(Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                };
                return [...list, newMessage];
            });
        }

        // Clear input field and image after sending
        setCurrentMessage('');
        setImagePreview(null);
        setImageData(null);

        const messageData = {
            message: message,
            image: imageData, // Send image data to backend
        };

        awaitingAiResponseRef.current = true; // Set flag when message is sent to AI
        stopListening(); // Stop mic when user sends message (for voice)

        await socket.emit('send_message', messageData);
    };

    // --- Image Upload Handling ---
    const handleImageChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result); // For displaying preview
                setImageData(reader.result);   // Base64 string to send
            };
            reader.readAsDataURL(file);
        } else {
            setImagePreview(null);
            setImageData(null);
        }
    };

    // --- Mode Switching ---
    const toggleMode = () => {
        setIsCallMode(prevMode => {
            const newMode = !prevMode;
            if (newMode) { // Switching to Call Mode
                startListening();
            } else { // Switching to Chat Mode
                stopListening();
                setCurrentMessage(''); // Clear input when switching to text mode
                setImagePreview(null); // Clear image when switching
                setImageData(null);
            }
            return newMode;
        });
    };

    return (
        <div className="h-screen overflow-hidden flex items-center justify-center p-4"
             style={{
                 // 1. Gradient Dark Background
                 background: 'linear-gradient(135deg, #0A0A0A, #1A1A2E, #280C4F, #5D238A, #A64E30, #C2700D, #FDBB2D, #0A0A0A)', // Darker gradient
                 backgroundSize: '400% 400%',
                 animation: 'gradientAnimation 15s ease infinite',
             }}>
            {/* Add Keyframes for gradient animation */}
            <style>
                {`
                @keyframes gradientAnimation {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                `}
            </style>
            <div className="flex h-full w-full max-w-2xl antialiased text-gray-800 flex-col rounded-2xl bg-white shadow-lg">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-blue-500 to-indigo-600 rounded-t-2xl">
                    <h2 className="text-2xl font-bold text-white flex items-center">
                        <svg className="w-8 h-8 mr-2 text-white" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"></path>
                        </svg>
                        Chat with Legacy
                    </h2>
                    <div className="flex items-center space-x-2">
                        <div className={`text-sm font-semibold p-2 rounded-full ${isConnected ? 'bg-green-400 text-white' : 'bg-red-400 text-white'}`}>
                            {isConnected ? 'Connected' : 'Connecting...'}
                        </div>
                        {/* Chat/Call Icon on Top Right */}
                        <button
                            onClick={toggleMode}
                            className="p-2 rounded-full text-white hover:bg-white hover:text-indigo-600 transition duration-300"
                            title={isCallMode ? "Switch to Text Chat" : "Switch to Voice Call"}
                        >
                            {isCallMode ? (
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 6H6v-2h8v2zm4-4H6V7h12v2z"></path>
                                </svg>
                            ) : (
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.2-3c0 2.88-2.39 5.2-5.2 5.2S6.8 13.88 6.8 11H5.2c0 3.18 2.57 5.76 5.8 6.15V21h2.2v-3.85c3.23-.39 5.8-2.97 5.8-6.15h-1.6z"></path>
                                </svg>
                            )}
                        </button>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex flex-col h-full overflow-y-auto p-4 flex-grow">
                    <ScrollToBottom className="h-full w-full">
                        <div className="flex flex-col space-y-4 pb-4"> {/* Added pb-4 for bottom padding */}
                            {messageList.map((messageContent, index) => (
                                <div key={index} className={`flex ${messageContent.author === 'You' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`relative max-w-xs sm:max-w-md md:max-w-lg py-2 px-4 shadow rounded-xl ${
                                        messageContent.author === 'You'
                                            ? 'bg-blue-500 text-white rounded-br-none'
                                            : 'bg-gray-200 text-gray-800 rounded-bl-none'
                                    } font-sans text-base leading-relaxed`}> {/* Cleaner font & leading */}
                                        <div className="text-sm font-semibold mb-1">
                                            {messageContent.author === 'You' ? 'You' : 'Legacy'}
                                        </div>
                                        {messageContent.image && (
                                            <img src={messageContent.image} alt="User Upload" className="max-w-full h-auto rounded-lg mb-2" />
                                        )}
                                        <div className="text-base break-words">{messageContent.message}</div>
                                        <div className="text-xs text-right opacity-75 mt-1">
                                            {messageContent.time}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollToBottom>
                </div>

                {/* Message Input / Microphone Indicator */}
                <div className="p-4 border-t border-gray-200 bg-gray-100 rounded-b-2xl">
                    {isCallMode ? (
                        <div className="flex items-center justify-center h-12">
                            {isConnected && isListening ? (
                                <div className="animate-pulse flex flex-col items-center">
                                    <svg className="w-10 h-10 text-blue-600" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.2-3c0 2.88-2.39 5.2-5.2 5.2S6.8 13.88 6.8 11H5.2c0 3.18 2.57 5.76 5.8 6.15V21h2.2v-3.85c3.23-.39 5.8-2.97 5.8-6.15h-1.6z"></path>
                                    </svg>
                                    <span className="text-gray-600 text-sm mt-1">Listening...</span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center text-gray-500">
                                    <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.2-3c0 2.88-2.39 5.2-5.2 5.2S6.8 13.88 6.8 11H5.2c0 3.18 2.57 5.76 5.8 6.15V21h2.2v-3.85c3.23-.39 5.8-2.97 5.8-6.15h-1.6z"></path>
                                    </svg>
                                    <span className="text-sm mt-1">{isConnected ? 'Tap chat icon to type' : 'Connecting...'}</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center w-full">
                            {/* Image Preview */}
                            {imagePreview && (
                                <div className="mb-2 w-full flex justify-center relative">
                                    <img src={imagePreview} alt="Preview" className="max-w-full max-h-40 rounded-lg shadow-md" />
                                    <button
                                        onClick={() => { setImagePreview(null); setImageData(null); }}
                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs"
                                        title="Remove Image"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            )}

                            <div className="flex items-center w-full">
                                {/* Image Upload Button */}
                                <label htmlFor="image-upload" className="mr-2 cursor-pointer p-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700">
                                    <input
                                        id="image-upload"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageChange}
                                        disabled={!isConnected}
                                    />
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </label>

                                <input
                                    value={currentMessage}
                                    type="text"
                                    placeholder={isConnected ? 'Ask Legacy anything...' : 'Connecting...'}
                                    className="flex-grow w-full border rounded-xl focus:outline-none focus:border-blue-300 px-4 py-2 mr-2"
                                    onChange={(event) => setCurrentMessage(event.target.value)}
                                    onKeyPress={(event) => { event.key === 'Enter' && sendMessage(); }}
                                    disabled={!isConnected}
                                />
                                <button
                                    onClick={() => sendMessage()}
                                    disabled={!isConnected || (!currentMessage.trim() && !imageData)} // Disable if no text and no image
                                    className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 rounded-xl text-white px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out"
                                >
                                    <span>Send</span>
                                    <span className="ml-2">
                                        <svg
                                            className="w-5 h-5 transform rotate-45 -mt-px"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            xmlns="http://www.w3.org/2000/svg"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                                            ></path>
                                        </svg>
                                    </span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatWithAI;
