  import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import ScrollToBottom from 'react-scroll-to-bottom';

// ---------------------------------------------------------------
// IMPORTANT: Replace with your actual Render backend URL
// ---------------------------------------------------------------
const BACKEND_URL = 'https://chat-app-lqcw.onrender.com'; // <--- CONFIRM THIS IS YOUR BACKEND URL

// Initialize the socket connection globally to persist across renders
const socket = io.connect(BACKEND_URL);

const ChatWithAI = () => { // Renamed component for clarity
    const [isConnected, setIsConnected] = useState(false); // Track socket connection status
    const [currentMessage, setCurrentMessage] = useState('');
    const [messageList, setMessageList] = useState([]);

    // --- Socket Connection ---
    useEffect(() => {
        socket.on('connect', () => {
            setIsConnected(true);
            console.log('Frontend: Connected to AI chat server!');
            // No need to join a specific room for AI chat
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
            console.log('Frontend: Disconnected from AI chat server.');
        });

        socket.on('connect_error', (error) => {
            console.error('Frontend: Socket connection error:', error);
            setIsConnected(false);
        });

        // Clean up event listeners on component unmount
        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('connect_error');
        };
    }, []); // Empty dependency array, runs once on mount

    // --- Message Receiving ---
    useEffect(() => {
        socket.on('receive_message', (data) => {
            setMessageList((list) => [...list, data]);
        });

        // Clean up receive_message listener
        return () => {
            socket.off('receive_message');
        };
    }, [socket]);

    // --- Send Message Function ---
    const sendMessage = async () => {
        if (currentMessage.trim() !== '' && isConnected) {
            const messageData = {
                message: currentMessage,
                // No 'author' or 'room' needed here if backend assigns them/uses socket.id
                // Backend will interpret this as from the current user
            };

            await socket.emit('send_message', messageData);
            setCurrentMessage(''); // Clear input
        } else if (!isConnected) {
            alert('Not connected to AI chat server. Please wait or check your internet connection.');
        }
    };

    return (
        <div className="h-screen overflow-hidden flex items-center justify-center bg-gray-100 p-4">
            <div className="flex h-full w-full max-w-2xl antialiased text-gray-800 flex-col rounded-2xl bg-white shadow-lg">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-blue-500 to-indigo-600 rounded-t-2xl">
                    <h2 className="text-2xl font-bold text-white flex items-center">
                        <svg className="w-8 h-8 mr-2 text-white" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"></path>
                        </svg>
                        Chat with Gemini AI
                    </h2>
                    <div className={`text-sm font-semibold p-2 rounded-full ${isConnected ? 'bg-green-400 text-white' : 'bg-red-400 text-white'}`}>
                        {isConnected ? 'Connected' : 'Connecting...'}
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
                                            ? 'bg-blue-500 text-white rounded-br-none' // Your messages (blue, right, no bottom-right curve)
                                            : 'bg-gray-200 text-gray-800 rounded-bl-none' // AI messages (gray, left, no bottom-left curve)
                                    }`}>
                                        <div className="text-sm font-semibold mb-1">
                                            {messageContent.author === 'You' ? 'You' : 'Gemini AI'}
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

                {/* Message Input */}
                <div className="p-4 border-t border-gray-200 bg-gray-100 rounded-b-2xl">
                    <div className="flex items-center">
                        <input
                            value={currentMessage}
                            type="text"
                            placeholder={isConnected ? 'Ask Gemini anything...' : 'Connecting...'}
                            className="flex-grow w-full border rounded-xl focus:outline-none focus:border-blue-300 px-4 py-2 mr-2"
                            onChange={(event) => setCurrentMessage(event.target.value)}
                            onKeyPress={(event) => { event.key === 'Enter' && sendMessage(); }}
                            disabled={!isConnected}
                        />
                        <button
                            onClick={sendMessage}
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
                </div>
            </div>
        </div>
    );
};

export default ChatWithAI; // Export with the new name
