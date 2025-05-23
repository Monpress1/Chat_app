 import React, { useState, useEffect, useRef } from 'react'; // Added useRef
import io from 'socket.io-client';
import ScrollToBottom from 'react-scroll-to-bottom'; // For auto-scrolling chat

// ---------------------------------------------------------------
// IMPORTANT: Confirm this is your correct deployed backend URL.
// If your backend is also on Render, this looks plausible.
const BACKEND_URL = "https://chat-app-lqcw.onrender.com";
// ---------------------------------------------------------------

// Define a fixed room ID for everyone
const FIXED_CHAT_ROOM_ID = "public-global-chat";

// Initialize the socket connection globally to persist
// This ensures the socket client is created only once
const socket = io.connect(BACKEND_URL);

const ChatApp = () => { // Renamed from Homepage to better reflect its role
    const [username, setUsername] = useState("");
    const [isConnected, setIsConnected] = useState(false); // Track socket connection status
    const [currentMessage, setCurrentMessage] = useState("");
    const [messageList, setMessageList] = useState([]);

    // Use a ref for the username input if you want to focus it on load
    const usernameInputRef = useRef(null);

    // --- Username Generation ---
    useEffect(() => {
        // Generate a simple random username
        const generatedUsername = `Guest-${Math.floor(Math.random() * 10000)}`;
        setUsername(generatedUsername);
        // Focus the message input after generation, if it were there
        // Or if you want to allow changing username later, focus here
    }, []); // Runs once on component mount

    // --- Socket Connection & Room Joining ---
    useEffect(() => {
        // Event listener for successful connection
        socket.on('connect', () => {
            setIsConnected(true);
            console.log(`Connected to chat server as ${username}!`);
            // Automatically join the fixed room once connected and username is set
            if (username) { // Ensure username is not empty before joining
                socket.emit("join_room", FIXED_CHAT_ROOM_ID);
                console.log(`${username} joined room: ${FIXED_CHAT_ROOM_ID}`);
            }
        });

        // Event listener for disconnection
        socket.on('disconnect', () => {
            setIsConnected(false);
            console.log("Disconnected from chat server.");
        });

        // Event listener for connection errors
        socket.on('connect_error', (error) => {
            console.error("Socket connection error:", error);
            setIsConnected(false);
        });

        // This listener will only run if username changes after initial connect
        // This handles the case where username is generated *after* socket connects
        // It's safer to have socket.emit("join_room") logic tied to both,
        // either in 'connect' handler with a username check, or after username is set.
        if (isConnected && username) {
             socket.emit("join_room", FIXED_CHAT_ROOM_ID);
             console.log(`${username} (re)joined room: ${FIXED_CHAT_ROOM_ID}`);
        }


        // Clean up event listeners when the component unmounts
        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('connect_error');
        };
    }, [username, isConnected]); // Re-run if username or connection status changes

    // --- Message Receiving ---
    useEffect(() => {
        socket.on("receive_message", (data) => {
            setMessageList((list) => [...list, data]);
        });

        // Clean up receive_message listener
        return () => {
            socket.off('receive_message');
        };
    }, [socket]); // Depends on socket instance

    // --- Send Message Function ---
    const sendMessage = async () => {
        if (currentMessage.trim() !== "" && isConnected) { // Ensure message not empty and connected
            const messageData = {
                room: FIXED_CHAT_ROOM_ID,
                author: username,
                message: currentMessage,
                time:
                    new Date(Date.now()).getHours() +
                    ":" +
                    String(new Date(Date.now()).getMinutes()).padStart(2, '0'), // Format minutes with leading zero
            };

            await socket.emit("send_message", messageData);
            setMessageList((list) => [...list, messageData]); // Add own message to list
            setCurrentMessage(""); // Clear input
        } else if (!isConnected) {
            alert("Not connected to chat server. Please wait or check connection.");
        }
    };

    // --- Main Render ---
    return (
        <div className="h-screen overflow-hidden flex items-center justify-center bg-gray-100">
            <div className="flex h-full w-full antialiased text-gray-800">
                <div className="flex flex-col flex-auto h-full p-6">
                    <div
                        className="flex flex-col flex-auto flex-shrink-0 rounded-2xl bg-white h-full p-4 shadow-lg"
                    >
                        {/* Header with Connection Status */}
                        <div className="mb-4 p-2 border-b border-gray-200 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800">
                                Global Chat ({FIXED_CHAT_ROOM_ID})
                            </h2>
                            <div className={`text-sm font-semibold ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                                {isConnected ? "Status: Connected" : "Status: Connecting..."}
                                {!isConnected && <span className="ml-2 text-gray-500 text-xs">
                                    (Checking backend and CORS)
                                </span>}
                            </div>
                            <div className="text-sm text-gray-600">
                                You are: <span className="font-semibold">{username}</span>
                            </div>
                        </div>

                        {/* Chat Messages Area */}
                        <div className="flex flex-col h-full overflow-x-auto mb-4">
                            <div className="flex flex-col h-full">
                                <ScrollToBottom className="h-full w-full">
                                    <div className="grid grid-cols-12 gap-y-2 px-2">
                                        {messageList.map((messageContent, index) => (
                                            <div key={index} className={`col-start-1 col-end-13 p-1 rounded-lg ${messageContent.author === username ? 'text-right' : 'text-left'}`}>
                                                <div className={`inline-flex flex-col ${messageContent.author === username ? 'items-end' : 'items-start'}`}>
                                                    <div className={`relative ${messageContent.author === username ? 'bg-indigo-100' : 'bg-gray-200'} py-2 px-4 shadow rounded-xl`}>
                                                        <div className="text-sm">{messageContent.message}</div>
                                                    </div>
                                                    <div className={`flex gap-1 mt-1 text-xs text-gray-500 ${messageContent.author === username ? 'flex-row-reverse' : 'flex-row'}`}>
                                                        <div className="font-semibold">{messageContent.author}</div>
                                                        <div>{messageContent.time}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollToBottom>
                            </div>
                        </div>

                        {/* Message Input */}
                        <div
                            className="flex flex-row items-center h-16 rounded-xl bg-gray-100 w-full px-4 mt-auto" // Added mt-auto to push to bottom
                        >
                            <div className="flex-grow ml-4">
                                <div className="relative w-full">
                                    <input
                                        value={currentMessage}
                                        type="text"
                                        placeholder="Type your message here..."
                                        className="flex w-full border rounded-xl focus:outline-none focus:border-indigo-300 pl-4 h-10"
                                        onChange={(event) => { setCurrentMessage(event.target.value) }}
                                        onKeyPress={(event) => { event.key === "Enter" && sendMessage(); }}
                                        disabled={!isConnected} // Disable input if not connected
                                    />
                                </div>
                            </div>
                            <div className="ml-4">
                                <button
                                    onClick={sendMessage}
                                    disabled={!isConnected || currentMessage.trim() === ""} // Disable if not connected or message empty
                                    className="flex items-center justify-center bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white px-4 py-2 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span>Send</span>
                                    <span className="ml-2">
                                        <svg
                                            className="w-4 h-4 transform rotate-45 -mt-px"
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
            </div>
        </div>
    );
}

export default ChatApp; // Export this as your main component
