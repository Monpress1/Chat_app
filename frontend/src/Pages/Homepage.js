 import io from 'socket.io-client';
import React, { useState, useEffect } from 'react'; // Import useEffect
import ChatPage3 from './ChatPage3';

// ---------------------------------------------------------------
// IMPORTANT: Confirm this is your correct deployed backend URL.
// If your backend is also on Render, this looks plausible.
const BACKEND_URL = "https://chat-app-lqcw.onrender.com";
// ---------------------------------------------------------------

// Initialize the socket connection outside the component
// This ensures the socket client is created only once
const socket = io.connect(BACKEND_URL);

const Homepage = () => {
  const [username, setUsername] = useState("");
  // We're setting a fixed room ID for simplicity, as per your request
  const [room, setRoom] = useState("public-chat-room"); // Fixed room ID
  const [showChatRoom, setChatRoom] = useState(false);
  const [isConnected, setIsConnected] = useState(false); // New state for connection status

  // useEffect to handle socket connection events
  useEffect(() => {
    // Event listener for successful connection
    socket.on('connect', () => {
      setIsConnected(true);
      console.log("Connected to chat server!");
      // Optionally, you could automatically join the room here
      // if you don't want a "Join" button for the room,
      // but in your current UI, the button handles joining.
    });

    // Event listener for disconnection
    socket.on('disconnect', () => {
      setIsConnected(false);
      setChatRoom(false); // If disconnected, hide chat
      console.log("Disconnected from chat server.");
    });

    // Event listener for connection errors
    socket.on('connect_error', (error) => {
      console.error("Socket connection error:", error);
      setIsConnected(false);
    });

    // Clean up event listeners when the component unmounts
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
    };
  }, []); // Empty dependency array means this runs once on mount and cleans up on unmount

  const joinRoom = (e) => {
    e.preventDefault(); // Prevent default form submission behavior

    // Ensure username is not empty and socket is connected before joining
    if (username.trim() !== "" && isConnected) {
      socket.emit("join_room", room); // 'room' is now the fixed room ID
      setChatRoom(true); // Show the chat component
    } else if (!isConnected) {
      alert("Not connected to the chat server yet. Please wait or check connection.");
    } else {
      alert("Please enter a username.");
    }
  };

  return (
    <div>
      {!showChatRoom ? (
        <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-sm">
            <img className="mx-auto h-10 w-auto" src="https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=600" alt="Your Company" />
            <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">Join Chat</h2>
          </div>

          <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
            <form className="space-y-6" action="#" >
              {/* Connection Status Message */}
              <div className={`text-center text-sm font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isConnected ? "Status: Connected to chat server!" : "Status: Connecting to server..."}
                {!isConnected && <span className="ml-2">Please ensure your backend is live and CORS is configured.</span>}
              </div>

              <div>
                <div className='flex items-center justify-between'>
                  <label htmlFor="name" className="block text-sm font-medium leading-6 text-gray-900">Name</label>
                </div>
                <div className="mt-2">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="text"
                    placeholder='Aman...'
                    onChange={(event) => { setUsername(event.target.value) }}
                    required
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    value={username} // Make it a controlled component
                    onKeyPress={(event) => {
                      if (event.key === "Enter") {
                        joinRoom(event); // Pass the event to prevent default
                      }
                    }}
                  />
                </div>
              </div>

              {/* Room ID input removed as it's now fixed */}
              {/* You could display the fixed room ID if you want: */}
              <div className="text-sm text-gray-600">
                  Joining Room: <span className="font-semibold">{room}</span>
              </div>


              <div>
                <button
                  onClick={joinRoom}
                  disabled={!isConnected || username.trim() === ""} // Disable if not connected or username empty
                  className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Join A Room
                </button>
              </div>

            </form>


          </div>
        </div>
      ) : (
        <ChatPage3 socket={socket} username={username} room={room} />
      )}
    </div>
  )
}

export default Homepage;
