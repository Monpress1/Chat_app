import React, { useState, useEffect, useRef } from 'react';
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
    // --- LOCAL STORAGE ADDITION ---
    // Initialize messageList from localStorage or with an empty array
    const [messageList, setMessageList] = useState(() => {
        try {
            const storedMessages = localStorage.getItem('legacyChatMessages');
            return storedMessages ? JSON.parse(storedMessages) : [];
        } catch (error) {
            console.error("Failed to parse messages from local storage:", error);
            return []; // Return empty array if parsing fails
        }
    });
    // --- END LOCAL STORAGE ADDITION ---
    const [isCallMode, setIsCallMode] = useState(true);
    const [isListening, setIsListening] = useState(false);

    const recognitionRef = useRef(null);
    const silenceTimeoutRef = useRef(null);

    // --- LOCAL STORAGE EFFECT: Save messages to localStorage whenever messageList changes ---
    useEffect(() => {
        try {
            localStorage.setItem('legacyChatMessages', JSON.stringify(messageList));
        } catch (error) {
            console.error("Failed to save messages to local storage:", error);
        }
    }, [messageList]); // Dependency array: runs whenever messageList changes
    // --- END LOCAL STORAGE EFFECT ---

    // --- Speech Recognition Setup ---
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("Web Speech API not supported in this browser. Voice features will be disabled.");
            setIsCallMode(false);
            return;
        }

        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        let transcript = '';

        recognitionRef.current.onstart = () => {
            console.log('Speech recognition started...');
            setIsListening(true);
            transcript = '';
        };

        recognitionRef.current.onresult = (event) => {
            clearTimeout(silenceTimeoutRef.current);
            const last = event.results.length - 1;
            const newPartialTranscript = event.results[last][0].transcript;
            transcript += newPartialTranscript + " ";
            console.log("Current transcript:", transcript);

            silenceTimeoutRef.current = setTimeout(() => {
                console.log("Silence detected, sending message...");
                stopListeningAndSendMessage(transcript.trim());
                transcript = '';
            }, 1500); // Adjust this silence duration
        };

        recognitionRef.current.onend = () => {
            console.log('Speech recognition ended.');
            setIsListening(false);
            if (isCallMode) {
                setTimeout(() => {
                    if (isCallMode && !isListening) {
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
                console.log("No speech detected, continuing listening...");
            } else {
                if (isCallMode) {
                    setTimeout(() => {
                        if (isCallMode && !isListening) {
                            startListening();
                        }
                    }, 1000);
                }
            }
        };

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
                clearTimeout(silenceTimeoutRef.current);
            }
        };
    }, [isCallMode]);

    // --- Functions to start/stop listening ---
    const startListening = () => {
        if (recognitionRef.current && !isListening && isConnected && isCallMode) {
            try {
                recognitionRef.current.start();
            } catch (e) {
                console.error("Error starting speech recognition:", e);
                setIsListening(false);
            }
        }
    };

    const stopListening = () => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
            clearTimeout(silenceTimeoutRef.current);
        }
    };

    const stopListeningAndSendMessage = (text) => {
        if (text) {
            sendMessage(text, true);
        }
        stopListening();
    };

    // --- Socket Connection ---
    useEffect(() => {
        socket.on('connect', () => {
            setIsConnected(true);
            console.log('Frontend: Connected to AI chat server!');
            if (isCallMode) {
                startListening();
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
    }, [isCallMode]);

    // --- Message Receiving ---
    useEffect(() => {
        socket.on('receive_message', (data) => {
            setMessageList((list) => [...list, data]);
            if (isCallMode && data.author === 'Legacy') {
                console.log("Legacy finished speaking, restarting listening...");
                startListening();
            }
        });

        return () => {
            socket.off('receive_message');
        };
    }, [socket, isCallMode]);

    // --- Send Message Function (Modified for voice) ---
    const sendMessage = async (messageToSend = currentMessage, isVoice = false) => {
        const message = messageToSend.trim();
        if (message !== '' && isConnected) {
            const messageData = {
                message: message,
            };

            await socket.emit('send_message', messageData);
            if (!isVoice) {
                setCurrentMessage('');
                setMessageList((list) => [...list, {
                    author: 'You',
                    message: message,
                    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                }]);
            }
        } else if (!isConnected) {
            alert('Not connected to AI chat server. Please wait or check your internet connection.');
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
            }
            return newMode;
        });
    };


    return (
        <div className="h-screen overflow-hidden flex items-center justify-center p-4"
             style={{
                 background: 'linear-gradient(135deg, #1a2a6c, #b21f1f, #fdbb2d)',
             }}>
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
                        <div className="flex flex-col space-y-4">
                            {messageList.map((messageContent, index) => (
                                <div key={index} className={`flex ${messageContent.author === 'You' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`relative max-w-xs sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl py-2 px-4 shadow rounded-xl ${
                                        messageContent.author === 'You'
                                            ? 'bg-blue-500 text-white rounded-br-none'
                                            : 'bg-gray-200 text-gray-800 rounded-bl-none'
                                    }`}>
                                        <div className="text-sm font-semibold mb-1">
                                            {messageContent.author === 'You' ? 'You' : 'Legacy'}
                                        </div>
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
                        <div className="flex items-center">
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
                                disabled={!isConnected || currentMessage.trim() === ''}
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
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatWithAI;
