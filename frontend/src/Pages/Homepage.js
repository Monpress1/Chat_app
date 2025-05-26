<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Legacy Chat</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  <style>

body {
  margin: 0;
  font-family: Arial, sans-serif;
  background: linear-gradient(to bottom right, #000428, #004e92, #8e44ad, #f39c12);
  color: white;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden; /* Prevent body scroll due to animations */
  /* Overall page animation: Background gradient subtle movement */
  background-size: 400% 400%;
  animation: gradientAnimation 15s ease infinite;
}

/* Keyframes for background gradient animation */
@keyframes gradientAnimation {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.status-indicator-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  background-color: #222;
  font-weight: bold;
  gap: 8px;
  /* Initial state for fade-in */
  opacity: 0;
  transform: translateY(-20px);
  animation: fadeInDown 0.8s ease-out forwards 0.2s; /* Apply fade-in after a delay */
}

.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.status-indicator.connecting {
  background-color: orange;
}

.status-indicator.connected {
  background-color: green;
}

.status-indicator.disconnected {
  background-color: red;
}

.chat-container {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  /* Initial state for fade-in */
  opacity: 0;
  transform: translateY(20px);
  animation: fadeInUp 0.8s ease-out forwards 0.4s; /* Apply fade-in after a delay */
}

/* Base style for message wrappers (to control alignment) */
.message-bubble-wrapper {
    display: flex; /* Use flexbox to align bubbles */
    margin-bottom: 8px; /* Gap between messages */
    animation: slideInUp 0.3s ease-out; /* Glide up animation for new messages */
}

/* Styles for sent messages (you) - Align to the right */
.message-bubble-wrapper.you {
    justify-content: flex-end; /* Push to the right */
    flex-direction: row-reverse; /* Put image/meta on the right of content */
    gap: 5px; /* Space between bubble and potential image on its right */
}

.message-bubble-wrapper.you .message-bubble {
    background-color: rgba(0, 123, 255, 0.6); /* Different color for your messages */
    border-bottom-right-radius: 2px; /* Slightly adjust corner for tail effect */
    margin-left: 30%;
      width: 220px;
      
}    

/* Styles for received messages (legacy) - Align to the left */
.message-bubble-wrapper.legacy {
    justify-content: flex-start; /* Push to the left */
    flex-direction: row; /* Default order for legacy messages */
    gap: 5px;
}

.message-bubble-wrapper.legacy .message-bubble {
    background-color: rgba(255, 255, 255, 0.1); /* Original color for legacy messages */
    border-bottom-left-radius: 2px; /* Slightly adjust corner for tail effect */
}

.message-bubble {
    padding: 10px;
    border-radius: 10px;
    /* Dynamic width based on content, but with a max */
    width: fit-content; /* Shrink-wrap content */
    max-width: 70%; /* Prevent it from taking full width */
    word-wrap: break-word;
    position: relative; /* For the time/read button positioning */
    display: flex;
    flex-direction: column;
    /* Optional: subtle shadow for depth */
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

.message-author {
    font-weight: bold;
    margin-bottom: 5px;
    font-size: 0.9em;
    color: rgba(255, 255, 255, 0.7);
}

.message-content {
    margin: 0;
    font-size: 1em;
}

.message-image-container {
    margin-top: 5px; /* Space between text and image if both exist */
    max-width: 100%;
    border-radius: 8px;
    overflow: hidden;
    /* If the image is meant to be separate from the bubble text, adjust margin-top */
}

.message-image {
    max-width: 100%;
    height: auto;
    display: block;
    border-radius: 8px; /* Apply border-radius to the image itself */
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2); /* Optional: shadow for image */
}

/* If the image is in the same bubble as text, apply some specific margins */
.message-bubble .message-image-container {
    margin-top: 8px; /* Space between text and image inside the bubble */
    margin-bottom: 0;
}


.message-meta {
    display: flex;
    justify-content: flex-end; /* Align time to the right within the bubble */
    align-items: center;
    gap: 5px;
    margin-top: 5px;
}

.message-time {
    font-size: 0.75em;
    color: rgba(255, 255, 255, 0.6);
}

.read-message-btn {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    font-size: 0.9em;
    padding: 2px;
    border-radius: 3px;
    transition: all 0.2s ease; /* Smooth hover effect */
}

.read-message-btn:hover {
    background-color: rgba(255, 255, 255, 0.2);
    transform: scale(1.1); /* Subtle grow on hover */
}


.input-container {
  display: flex;
  align-items: center;
  padding: 10px;
  background-color: #111;
  gap: 10px;
  /* Initial state for fade-in */
  opacity: 0;
  transform: translateY(20px);
  animation: fadeInUp 0.8s ease-out forwards 0.6s; /* Apply fade-in after a delay */
}

.input-container input[type="text"] {
  flex: 1;
  padding: 10px;
  border-radius: 5px;
  border: none;
  background-color: rgba(255, 255, 255, 0.9); /* Slightly transparent white */
  color: #333;
  outline: none;
  transition: all 0.3s ease; /* Smooth transition for focus */
}

.input-container input[type="text"]:focus {
  box-shadow: 0 0 0 2px #007bff; /* Highlight on focus */
}

.input-container button,
.input-container label {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 18px;
  padding: 8px; /* Add padding for easier clicking */
  border-radius: 50%; /* Make buttons circular */
  transition: background-color 0.3s ease, transform 0.2s ease;
}

.input-container button:hover,
.input-container label:hover {
  background-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px); /* Lift effect on hover */
}

.input-container button:active,
.input-container label:active {
  transform: translateY(0); /* Press effect */
}


.image-preview-container { /* Renamed for clarity and consistency */
  position: fixed;
  bottom: 80px; /* Adjust based on input container height */
  left: 10px;
  background: #222;
  padding: 10px;
  border-radius: 10px;
  z-index: 100;
  display: flex; /* Use flexbox for image and buttons */
  flex-direction: column;
  gap: 10px;
  max-width: 220px; /* Limit preview width */
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  /* Animation for image preview */
  animation: fadeIn 0.3s ease-out;
}

.image-preview-container.hidden {
    display: none;
}

.image-preview-container img {
  max-width: 200px;
  display: block;
  margin: 0 auto; /* Center the image */
  border-radius: 5px;
}

.image-preview-buttons {
    display: flex;
    justify-content: space-around;
    gap: 5px;
}

.image-preview-buttons button {
    padding: 8px 12px;
    border-radius: 5px;
    font-size: 0.9em;
    font-weight: bold;
    transition: background-color 0.3s ease, transform 0.2s ease;
}

.image-preview-buttons #sendImageBtn {
    background-color: #007bff;
    color: white;
}

.image-preview-buttons #sendImageBtn:hover {
    background-color: #0056b3;
    transform: translateY(-2px);
}

.image-preview-buttons #cancelImageBtn {
    background-color: #dc3545;
    color: white;
}

.image-preview-buttons #cancelImageBtn:hover {
    background-color: #c82333;
    transform: translateY(-2px);
}


/* --- Animation Keyframes --- */

/* Glide Up (for individual chat bubbles) */
@keyframes slideInUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Fade In (general purpose for elements appearing) */
@keyframes fadeIn {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

/* Fade In and Down (for status bar) */
@keyframes fadeInDown {
    from {
        opacity: 0;
        transform: translateY(-20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Fade In and Up (for chat container and input container) */
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

  </style>
</head>
<body>
  <div class="status-indicator-container">
    <span id="status-indicator" class="status-indicator connecting"></span>
    <span id="status-text">Connecting...</span>
  </div>
  <div class="chat-container" id="chatContainer"></div>

  <div class="image-preview-container hidden" id="imagePreviewContainer">
    <img id="imagePreview" />
    <div class="image-preview-buttons">
      <button id="sendImageBtn">Send Image</button>
      <button id="cancelImageBtn">Cancel</button>
    </div>
  </div>

  <div class="input-container">
    <input type="text" id="messageInput" placeholder="Type a message..." />
    <button id="sendBtn" title="Send">
      <i class="fas fa-paper-plane"></i>
    </button>
    <label for="imageInput" title="Attach Image">
      <i class="fas fa-image"></i>
    </label>
    <input type="file" id="imageInput" accept="image/*" style="display: none;" />
    <button id="voiceModeBtn" title="Voice Chat">
      <i class="fas fa-microphone"></i>
    </button>
  </div>

    <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
    <script>
        // -------------------------------------------------------------
        // CONFIGURE BACKEND URL
        // IMPORTANT: Replace with your ACTUAL Render backend URL
        // -------------------------------------------------------------
        const BACKEND_URL = "https://chat-app-lqcw.onrender.com"; // <--- CONFIRM THIS IS YOUR RENDER BACKEND URL

        // --- DOM Elements ---
        // Corrected ID references
        const chatContainer = document.getElementById('chatContainer');
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const imageInput = document.getElementById('imageInput'); // Renamed from imageUploadInput
        const imagePreviewContainer = document.getElementById('imagePreviewContainer');
        const imagePreview = document.getElementById('imagePreview');
        const sendImageBtn = document.getElementById('sendImageBtn'); // New button
        const cancelImageBtn = document.getElementById('cancelImageBtn'); // New button
        const voiceModeBtn = document.getElementById('voiceModeBtn');
        const statusIndicator = document.getElementById('status-indicator');
        const statusText = document.getElementById('status-text');


        // --- State Variables ---
        let messages = []; // Array to hold chat messages
        let socket = null;
        let imageFile = null; // Holds the File object for upload
        let imagePreviewURL = null; // Holds the Data URL for image preview

        // --- Local Storage Key ---
        const LOCAL_STORAGE_KEY = 'legacyChatMessages';

        // --- Utility Functions ---
        const formatTime = (isoStringOrDate) => {
            // Ensure isoStringOrDate is a valid Date object or can be converted
            const date = new Date(isoStringOrDate);
            if (isNaN(date.getTime())) { // Check if the date is "Invalid Date"
                return ""; // Or return an empty string, or a default
            }
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        };

        const scrollToBottom = () => {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        };

        const saveMessagesToLocalStorage = () => {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(messages));
        };

        const loadMessagesFromLocalStorage = () => {
            const storedMessages = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (storedMessages) {
                // Ensure 'time' is always a Date object upon loading
                messages = JSON.parse(storedMessages).map(msg => ({ ...msg, time: new Date(msg.time) }));
                renderMessages();
            }
        };

        const updateConnectionStatus = (status) => {
            statusIndicator.className = `status-indicator ${status}`;
            statusText.textContent = status.charAt(0).toUpperCase() + status.slice(1);
        };

        // --- Render Functions (Manual DOM Updates) ---
        const renderMessages = () => {
            chatContainer.innerHTML = ''; // Clear existing messages
            messages.forEach((msg) => {
                const messageWrapper = document.createElement('div');
                // Correctly apply 'you' or 'legacy' class for alignment
                messageWrapper.className = `message-bubble-wrapper ${msg.author === 'You' ? 'you' : 'legacy'}`;

                const messageBubble = document.createElement('div');
                messageBubble.className = `message-bubble`; // Styling for the bubble itself

                const authorParagraph = document.createElement('p');
                authorParagraph.className = 'message-author';
                authorParagraph.textContent = msg.author;
                messageBubble.appendChild(authorParagraph);

                if (msg.message) {
                    const contentParagraph = document.createElement('p');
                    contentParagraph.className = 'message-content';
                    contentParagraph.textContent = msg.message;
                    messageBubble.appendChild(contentParagraph);
                }

                if (msg.image) {
                    const imageDiv = document.createElement('div');
                    imageDiv.className = 'message-image-container';
                    const imgElement = document.createElement('img');
                    imgElement.src = msg.image;
                    imgElement.alt = "User Upload";
                    imgElement.className = 'message-image';
                    imageDiv.appendChild(imgElement);
                    messageBubble.appendChild(imageDiv);
                }

                const metaDiv = document.createElement('div');
                metaDiv.className = 'message-meta';
                const timeParagraph = document.createElement('p');
                timeParagraph.className = 'message-time';
                // Pass the correct Date object to formatTime
                timeParagraph.textContent = formatTime(msg.time);
                metaDiv.appendChild(timeParagraph);

                // Read button for Legacy's messages in text mode
                if (msg.author === 'Legacy' && msg.message) {
                    const readBtn = document.createElement('button');
                    readBtn.className = 'read-message-btn';
                    readBtn.title = "Read Message";
                    readBtn.innerHTML = '<i class="fas fa-volume-high"></i>';
                    readBtn.onclick = () => {
                        if (window.speechSynthesis) {
                            const utterance = new SpeechSynthesisUtterance(msg.message);
                            window.speechSynthesis.speak(utterance);
                        } else {
                            alert("Text-to-speech not supported in this browser.");
                        }
                    };
                    metaDiv.appendChild(readBtn);
                }

                messageBubble.appendChild(metaDiv);
                messageWrapper.appendChild(messageBubble);
                chatContainer.appendChild(messageWrapper);
            });
            scrollToBottom();
        };

        const updateImagePreview = () => {
            if (imagePreviewURL) {
                imagePreview.src = imagePreviewURL;
                imagePreviewContainer.classList.remove('hidden');
            } else {
                imagePreview.src = '';
                imagePreviewContainer.classList.add('hidden');
            }
        };

        // --- Socket.IO Connection and Message Handling ---
        const connectSocket = () => {
            updateConnectionStatus('connecting');
            socket = io(BACKEND_URL, {
                transports: ['websocket', 'polling'] // Ensure good connection options
            });

            socket.on('connect', () => {
                console.log('Connected to backend Socket.IO');
                updateConnectionStatus('connected');
            });

            socket.on('receive_message', (data) => {
                console.log('Received message:', data);
                // Ensure time is a Date object when received from socket
                data.time = new Date(data.time);
                messages.push(data);
                saveMessagesToLocalStorage();
                renderMessages();
            });

            socket.on('disconnect', () => {
                console.log('Disconnected from backend Socket.IO');
                updateConnectionStatus('disconnected');
            });

            socket.on('connect_error', (error) => {
                console.error("Socket.IO connection error:", error.message);
                updateConnectionStatus('disconnected');
            });

            socket.on('reconnect_attempt', () => {
                console.log('Attempting to reconnect...');
                updateConnectionStatus('connecting');
            });

            socket.on('reconnect', () => {
                console.log('Reconnected!');
                updateConnectionStatus('connected');
            });
        };

        // --- Send Message Logic ---
        const sendMessage = async (text, image = null) => {
            if (!socket || socket.disconnected) {
                console.error('Socket not connected. Attempting to reconnect and defer message.');
                connectSocket(); // Try to reconnect
                // Optionally, store message to retry sending after connection
                setTimeout(() => sendMessage(text, image), 1000); // Retry after 1 second
                return;
            }

            const messageToSend = text || messageInput.value;
            if (!messageToSend.trim() && !image) return; // Ensure there's text or an image

            let imageData = null;

            if (image) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    imageData = reader.result;
                    // When sending, explicitly set author as 'You' and include current time
                    socket.emit('send_message', { message: messageToSend, image: imageData, author: 'You', time: new Date() });
                    messageInput.value = '';
                    imageFile = null;
                    imagePreviewURL = null;
                    updateImagePreview(); // Hide preview after sending
                };
                reader.readAsDataURL(image);
            } else {
                // If no image, send just the message, explicitly setting author and time
                socket.emit('send_message', { message: messageToSend, author: 'You', time: new Date() });
                messageInput.value = '';
            }
        };


        // --- Event Listeners ---
        document.addEventListener('DOMContentLoaded', () => {
            loadMessagesFromLocalStorage();
            connectSocket();
        });

        sendBtn.addEventListener('click', () => {
            if (!imageFile) {
                sendMessage(messageInput.value);
            }
            // If imageFile exists, the send logic is handled by sendImageBtn
        });

        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (!imageFile) {
                    sendMessage(messageInput.value);
                }
                // If imageFile exists, the send logic is handled by sendImageBtn
            }
        });

        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                imageFile = file;
                const reader = new FileReader();
                reader.onloadend = () => {
                    imagePreviewURL = reader.result;
                    updateImagePreview();
                };
                reader.readAsDataURL(file);
            }
        });

        sendImageBtn.addEventListener('click', () => {
            if (imageFile) {
                sendMessage(messageInput.value, imageFile);
            }
        });

        cancelImageBtn.addEventListener('click', () => {
            imageFile = null;
            imagePreviewURL = null;
            updateImagePreview();
            imageInput.value = ''; // Clear the file input
        });

        voiceModeBtn.addEventListener('click', () => {
            window.location.href = 'voice_chat.html'; // Navigate to the voice chat page
        });
    </script>
</body>
</html>
