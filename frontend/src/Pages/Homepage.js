 <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Legacy Chat (Vanilla JS)</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" integrity="sha512-SnH5WK+bZxgPHs44uWIX+LLJAJ9/2PkPKZ5QiAj6Ta86w+fsb2TkcmfRyVX3pBnMFcV7oQPJkl9QevSCWr3W6A==" crossorigin="anonymous" referrerpolicy="no-referrer" />
    <link rel="stylesheet" href="style.css">
</head>
  <style>
  /* Basic Reset & Body Styling */
body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background-color: #f0f2f5; /* Default light background */
}

/* App Container (similar to React's main div) */
.app-container {
    height: 100vh;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    transition: background 0.5s ease-in-out; /* Smooth transition for background */
}

/* Gradient background for call mode */
.app-container.call-mode-active {
    background: linear-gradient(135deg, #0A0A0A, #1A1A2E, #280C4F, #5D238A, #A64E30, #C2700D, #FDBB2D, #0A0A0A);
    background-size: 400% 400%;
    animation: gradientAnimation 15s ease infinite;
}

/* Chat Wrapper (similar to React's flex-col h-full w-full max-w-2xl bg-white shadow-xl rounded-lg) */
.chat-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%; /* Take full height of app-container */
    width: 100%;
    max-width: 48rem; /* Max-width equivalent to max-w-2xl */
    background-color: white;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); /* shadow-xl */
    border-radius: 0.5rem; /* rounded-lg */
    overflow: hidden;
}

/* Chat Header */
.chat-header {
    padding: 1rem;
    background: linear-gradient(to right, #3b82f6, #9333ea); /* from-blue-500 to-purple-600 */
    color: white;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); /* shadow-md */
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.chat-title {
    font-size: 1.25rem; /* text-xl */
    font-weight: bold;
    margin: 0;
}

.voice-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem; /* space-x-2 */
}

.mic-toggle-btn, .exit-voice-btn {
    border: none;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
}

/* Styles for the main microphone button */
.mic-toggle-btn {
    background-color: white;
    color: black;
    padding: 0.75rem; /* p-3 */
    border-radius: 9999px; /* rounded-full */
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); /* shadow-md */
}

.mic-toggle-btn:hover {
    filter: brightness(0.9);
}

.mic-toggle-btn.active-listening {
    animation: pulse 1.5s infinite cubic-bezier(0.4, 0, 0.6, 1); /* animate-pulse */
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: .5; }
}

.mic-toggle-btn.speaking-disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* Styles for the exit voice button */
.exit-voice-btn {
    background: none;
    color: white;
    padding: 0.5rem; /* p-2 */
    border-radius: 9999px; /* rounded-full */
}

.exit-voice-btn:hover {
    background-color: rgba(255, 255, 255, 0.2); /* hover:bg-white/20 */
}

.icon-emoji {
    font-size: 1.25rem; /* text-xl */
}


/* Chat Messages Container */
.chat-messages {
    flex: 1; /* flex-1 */
    padding: 1rem;
    overflow-y-auto;
    background-color: #f9fafb; /* bg-gray-50 */
}

/* Individual Message Styles */
.message-bubble-wrapper {
    display: flex;
    margin-bottom: 0.75rem; /* mb-3 */
}

.message-bubble-wrapper.you {
    justify-content: flex-end; /* justify-end */
}

.message-bubble-wrapper.legacy {
    justify-content: flex-start; /* justify-start */
}

.message-bubble {
    max-width: 75%; /* max-w-[75%] */
    padding: 0.5rem 1rem; /* px-4 py-2 */
    border-radius: 0.5rem; /* rounded-lg */
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); /* shadow-md */
    display: flex;
    flex-direction: column;
}

.message-bubble.you {
    background-color: #3b82f6; /* bg-blue-500 */
    color: white;
    border-bottom-right-radius: 0; /* rounded-br-none */
}

.message-bubble.legacy {
    background-color: #e5e7eb; /* bg-gray-200 */
    color: #374151; /* text-gray-800 */
    border-bottom-left-radius: 0; /* rounded-bl-none */
}

.message-author {
    font-weight: 600; /* font-semibold */
    font-size: 0.875rem; /* text-sm */
    margin-bottom: 0.25rem; /* mb-1 */
}

.message-content {
    word-wrap: break-word;
    white-space: pre-wrap; /* Preserve formatting if any */
}

.message-image {
    margin-top: 0.5rem; /* mt-2 */
    max-width: 12rem; /* max-w-xs */
    height: auto;
    border-radius: 0.375rem; /* rounded-md */
    border: 1px solid #d1d5db; /* border border-gray-300 */
}

.message-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.25rem; /* mt-1 */
}

.message-time {
    font-size: 0.75rem; /* text-xs */
    opacity: 0.75;
}

.read-message-btn {
    margin-left: 0.5rem; /* ml-2 */
    padding: 0.25rem; /* p-1 */
    border-radius: 9999px; /* rounded-full */
    color: white;
    transition: background-color 0.2s ease;
    border: none;
    cursor: pointer;
    background-color: #a855f7; /* bg-purple-500 */
}

.read-message-btn:hover {
    background-color: #9333ea; /* hover:bg-purple-600 */
}

.read-message-btn:disabled {
    background-color: #9ca3af; /* bg-gray-400 */
    cursor: not-allowed;
}

/* Image Preview */
.image-preview-container {
    position: relative;
    padding: 0.5rem; /* p-2 */
    border-top: 1px solid #e5e7eb; /* border-t border-gray-200 */
    background-color: #f3f4f6; /* bg-gray-100 */
    display: flex;
    align-items: center;
    justify-content: center;
}

.image-preview {
    max-height: 6rem; /* max-h-24 */
    object-fit: contain;
    border-radius: 0.375rem; /* rounded-md */
}

.clear-image-btn {
    position: absolute;
    top: 0.25rem; /* top-1 */
    right: 0.25rem; /* right-1 */
    background-color: #ef4444; /* bg-red-500 */
    color: white;
    border-radius: 9999px; /* rounded-full */
    padding: 0.25rem; /* p-1 */
    font-size: 0.75rem; /* text-xs */
    border: none;
    cursor: pointer;
    transition: background-color 0.2s ease;
}

.clear-image-btn:hover {
    background-color: #dc2626; /* hover:bg-red-600 */
}

/* Message Input Area */
.chat-input-area {
    padding: 1rem;
    border-top: 1px solid #e5e7eb; /* border-t border-gray-200 */
    display: flex;
    align-items: center;
    background-color: white;
}

.upload-image-btn {
    cursor: pointer;
    margin-right: 0.5rem; /* mr-2 */
    padding: 0.75rem; /* p-3 */
    background-color: #e5e7eb; /* bg-gray-200 */
    color: #4b5563; /* text-gray-700 */
    border-radius: 9999px; /* rounded-full */
    transition: background-color 0.2s ease;
    display: flex; /* For FontAwesome icon centering */
    align-items: center;
    justify-content: center;
}

.upload-image-btn:hover {
    background-color: #d1d5db; /* hover:bg-gray-300 */
}

.message-input {
    flex: 1; /* flex-1 */
    padding: 0.75rem; /* p-3 */
    border: 1px solid #d1d5db; /* border border-gray-300 */
    border-radius: 9999px; /* rounded-full */
    margin-right: 0.5rem; /* mr-2 */
    font-size: 1rem;
    outline: none;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.message-input:focus {
    border-color: #3b82f6; /* focus:ring-blue-500 */
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5); /* focus:ring-2 focus:ring-blue-500 */
}

.message-input:disabled {
    background-color: #f9fafb; /* bg-gray-50 */
    cursor: not-allowed;
}

.send-btn {
    border: none;
    cursor: pointer;
    padding: 0.75rem; /* p-3 */
    background-color: #3b82f6; /* bg-blue-500 */
    color: white;
    border-radius: 9999px; /* rounded-full */
    transition: background-color 0.2s ease;
    display: flex; /* For FontAwesome icon centering */
    align-items: center;
    justify-content: center;
}

.send-btn:hover {
    background-color: #2563eb; /* hover:bg-blue-600 */
}

/* Utility classes for toggling visibility */
.hidden {
    display: none !important;
}

  </style>
<body>
    <div id="app-container" class="app-container">
        <style>
            @keyframes gradientAnimation {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
            }
        </style>

        <div class="chat-wrapper">
            <div class="chat-header">
                <h1 class="chat-title">Legacy Chat</h1>
                <div class="voice-controls">
                    <button id="mic-toggle-btn" class="mic-toggle-btn" title="Toggle Voice Mode">
                        <span class="icon-emoji">🎤</span>
                    </button>
                    <button id="exit-voice-btn" class="exit-voice-btn hidden" title="Exit Voice Mode">
                        <span class="icon-emoji">✖️</span>
                    </button>
                </div>
            </div>

            <div id="chat-messages" class="chat-messages">
                </div>

            <div id="image-preview-container" class="image-preview-container hidden">
                <img id="image-preview" src="" alt="Preview" class="image-preview" />
                <button id="clear-image-btn" class="clear-image-btn" title="Remove image">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <div class="chat-input-area">
                <input type="file" accept="image/*" id="image-upload" class="hidden" />
                <label for="image-upload" class="upload-image-btn" title="Upload Image">
                    <i class="fas fa-image"></i>
                </label>

                <input type="text" id="message-input" class="message-input" placeholder="Type your message..." />

                <button id="send-btn" class="send-btn" title="Send Message">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        </div>
    </div>

    <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
    <script>
                 
          // Ensure Socket.IO is loaded before this script
// You'll need to include <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script> in your HTML

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

// --- DOM Elements ---
const appContainer = document.getElementById('app-container');
const chatMessagesContainer = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-btn');
const imageUploadInput = document.getElementById('image-upload');
const imagePreviewContainer = document.getElementById('image-preview-container');
const imagePreview = document.getElementById('image-preview');
const clearImageButton = document.getElementById('clear-image-btn');
const micToggleButton = document.getElementById('mic-toggle-btn');
const exitVoiceButton = document.getElementById('exit-voice-btn'); // New button

// --- State Variables ---
let messages = [];
let socket = null;
let isCallMode = false;
let imageFile = null;
let imagePreviewURL = null;
let isSpeaking = false; // Tracks if AI is currently speaking

let currentRecognition = null;
let isListening = false; // New state to track microphone listening

// --- Utility Functions ---
const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const scrollToBottom = () => {
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
};

// --- Render Functions (Manual DOM Updates) ---
const renderMessages = () => {
    chatMessagesContainer.innerHTML = ''; // Clear existing messages
    messages.forEach((msg, index) => {
        const messageWrapper = document.createElement('div');
        messageWrapper.className = `message-bubble-wrapper ${msg.author === 'You' ? 'you' : 'legacy'}`;

        const messageBubble = document.createElement('div');
        messageBubble.className = `message-bubble ${msg.author === 'You' ? 'you' : 'legacy'}`;

        if (msg.message) {
            const authorParagraph = document.createElement('p');
            authorParagraph.className = 'message-author';
            authorParagraph.textContent = msg.author;
            messageBubble.appendChild(authorParagraph);

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
        timeParagraph.textContent = formatTime(msg.time);
        metaDiv.appendChild(timeParagraph);

        // Read button for Legacy's messages in text mode
        if (msg.author === 'Legacy' && !isCallMode && msg.message) {
            const readBtn = document.createElement('button');
            readBtn.className = 'read-message-btn';
            readBtn.title = "Read Message";
            readBtn.disabled = isSpeaking;
            readBtn.innerHTML = '<i class="fas fa-volume-high"></i>';
            readBtn.onclick = () => speakText(msg.message);
            metaDiv.appendChild(readBtn);
        }
        messageBubble.appendChild(metaDiv);
        messageWrapper.appendChild(messageBubble);
        chatMessagesContainer.appendChild(messageWrapper);
    });
    scrollToBottom();
};

const updateUIForCallMode = () => {
    // Toggle main app container background class
    if (isCallMode) {
        appContainer.classList.add('call-mode-active');
        messageInput.placeholder = "Voice input active...";
        messageInput.disabled = true;
        sendButton.classList.add('hidden'); // Hide send button in call mode
        micToggleButton.querySelector('.icon-emoji').textContent = '🎤'; // Ensure it's mic icon
        micToggleButton.classList.remove('hidden'); // Ensure mic button is shown
        exitVoiceButton.classList.remove('hidden'); // Show exit voice button
    } else {
        appContainer.classList.remove('call-mode-active');
        messageInput.placeholder = "Type your message...";
        messageInput.disabled = false;
        sendButton.classList.remove('hidden'); // Show send button in text mode
        micToggleButton.querySelector('.icon-emoji').textContent = '🎤'; // Ensure it's mic icon
        micToggleButton.classList.remove('hidden'); // Ensure mic button is shown
        exitVoiceButton.classList.add('hidden'); // Hide exit voice button
    }
    // Update mic button state
    updateMicButtonState();
    // Re-render messages to update read buttons
    renderMessages();
};

const updateMicButtonState = () => {
    if (isCallMode) {
        micToggleButton.disabled = isSpeaking;
        micToggleButton.classList.toggle('active-listening', isListening);
        micToggleButton.classList.toggle('speaking-disabled', isSpeaking);
        micToggleButton.title = isSpeaking ? "AI is speaking..." : (isListening ? "Stop listening" : "Start listening");
        micToggleButton.querySelector('.icon-emoji').textContent = isListening ? '🔇' : '🎤';
    } else {
        // In text mode, mic button just enters voice mode
        micToggleButton.disabled = false;
        micToggleButton.classList.remove('active-listening', 'speaking-disabled');
        micToggleButton.title = "Enter Voice Mode";
        micToggleButton.querySelector('.icon-emoji').textContent = '🎤';
        exitVoiceButton.classList.add('hidden'); // Ensure exit button is hidden
    }
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
    socket = io(BACKEND_URL);

    socket.on('connect', () => {
        console.log('Connected to backend Socket.IO');
    });

    socket.on('receive_message', (data) => {
        console.log('Received message:', data);
        messages.push(data);
        renderMessages(); // Update UI

        // If in call mode and AI sends a text message, speak it automatically
        if (isCallMode && data.author === 'Legacy' && data.message) {
            speakText(data.message);
        }
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from backend Socket.IO');
        // Ensure any ongoing speech is cancelled on disconnect
        if (SpeechSynthesis.speaking) {
            SpeechSynthesis.cancel();
        }
        isSpeaking = false;
        updateMicButtonState();
        // Also stop recognition if active
        currentRecognition?.stop();
        isListening = false;
        updateMicButtonState();
    });
};

// --- Text to Speech (AI Speaking) ---
const speakText = (text) => {
    if (!SpeechSynthesis) {
        console.warn("Speech Synthesis not supported in this browser.");
        return;
    }

    // Stop any ongoing speech before starting a new one
    if (SpeechSynthesis.speaking) {
        SpeechSynthesis.cancel();
    }

    isSpeaking = true; // Indicate that AI is speaking
    updateMicButtonState(); // Update mic button UI
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0; // Normal speed
    utterance.pitch = 1.0; // Normal pitch

    utterance.onend = () => {
        isSpeaking = false; // Indicate that AI has finished speaking
        updateMicButtonState(); // Update mic button UI
        // If in call mode, and AI finished speaking, restart user listening
        if (isCallMode && currentRecognition && !isListening) {
            console.log('AI finished speaking, attempting to restart user listening...');
            setTimeout(() => currentRecognition.start(), 500);
        }
    };
    utterance.onerror = (event) => {
        console.error('SpeechSynthesisUtterance.onerror', event);
        isSpeaking = false; // Indicate that AI has stopped speaking due to error
        updateMicButtonState(); // Update mic button UI
        // If in call mode, and AI speaking error, restart user listening
        if (isCallMode && currentRecognition && !isListening) {
            console.log('AI speaking error, attempting to restart user listening...');
            setTimeout(() => currentRecognition.start(), 500);
        }
    };

    SpeechSynthesis.speak(utterance);
};

// --- Speech Recognition Setup ---
const setupRecognition = () => {
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
        isListening = true;
        updateMicButtonState();
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
        isListening = false;
        updateMicButtonState();
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
        isListening = false;
        updateMicButtonState();
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
};

// --- Mic Control Functions ---
const startListening = () => {
    if (!currentRecognition) {
        console.log("No recognition instance, setting up and starting.");
        const rec = setupRecognition();
        if (rec) {
            currentRecognition = rec;
            rec.start();
        }
    } else if (!isListening) { // Only start if not already listening
        console.log("Recognition instance exists, but not listening. Starting.");
        currentRecognition.start();
    } else {
        console.log("Already listening, no need to restart.");
    }
    updateMicButtonState();
};

const stopListening = () => {
    if (isListening && currentRecognition) {
        console.log("Stopping listening.");
        currentRecognition.stop();
        isListening = false; // Manually update state
        updateMicButtonState();
    }
};

// --- Toggle Voice Call Mode ---
const toggleCallMode = () => {
    isCallMode = !isCallMode;
    updateUIForCallMode();

    if (!isCallMode) { // If turning OFF call mode
        stopListening(); // Ensure mic is stopped
        // Ensure any ongoing speech synthesis is cancelled
        if (SpeechSynthesis.speaking) {
            SpeechSynthesis.cancel();
        }
        isSpeaking = false; // Reset AI speaking state
        updateMicButtonState();
        currentRecognition = null; // Clear the recognition instance
    } else { // If turning ON call mode
        startListening(); // Automatically start listening when entering call mode
    }
};

// --- Send Message Logic ---
const sendMessage = async (text, image = null) => {
    if (!socket) {
        console.error('Socket not connected');
        return;
    }

    const messageToSend = text || messageInput.value;
    if (!messageToSend.trim() && !image) return; // Don't send empty messages or no image

    let imageData = null;
    if (image) {
        const reader = new FileReader();
        reader.readAsDataURL(image);
        reader.onload = () => {
            imageData = reader.result;
            socket.emit('send_message', { message: messageToSend, image: imageData });
            messageInput.value = ''; // Clear input field
            imageFile = null; // Clear image file
            imagePreviewURL = null; // Clear image preview URL
            updateImagePreview(); // Update UI
        };
        reader.onerror = (error) => {
            console.error("Error converting image to Base64:", error);
        };
        return; // Exit here, actual emit happens in reader.onload
    }

    // For text-only messages or if image conversion isn't needed
    socket.emit('send_message', { message: messageToSend, image: imageData });
    messageInput.value = ''; // Clear input field
    imageFile = null; // Clear image file
    imagePreviewURL = null; // Clear image preview URL
    updateImagePreview(); // Update UI
};

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    connectSocket();
    updateUIForCallMode(); // Initialize UI based on isCallMode
});

sendButton.addEventListener('click', () => {
    sendMessage(messageInput.value, imageFile);
});

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !isCallMode) { // Only allow sending via Enter in text mode
        sendMessage(messageInput.value, imageFile);
    }
});

imageUploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        imageFile = file;
        const reader = new FileReader();
        reader.onloadend = () => {
            imagePreviewURL = reader.result; // Set image preview URL
            updateImagePreview(); // Update UI
        };
        reader.readAsDataURL(file);
    }
});

clearImageButton.addEventListener('click', () => {
    imageFile = null;
    imagePreviewURL = null;
    updateImagePreview(); // Update UI
    imageUploadInput.value = ''; // Clear file input
});

micToggleButton.addEventListener('click', () => {
    if (isCallMode) { // If currently in call mode, this button acts as start/stop listening
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    } else { // If not in call mode, this button toggles INTO call mode
        toggleCallMode();
    }
});

exitVoiceButton.addEventListener('click', () => {
    // This button specifically exists to exit voice mode
    if (isCallMode) {
        toggleCallMode();
    }
});

// Initial render
renderMessages();
       
   </script>
</body>
</html>
