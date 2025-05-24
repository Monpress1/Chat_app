 import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicrophone, faStop, faPaperPlane, faImage, faTimes, faVolumeHigh, faSpeaker } from '@fortawesome/free-solid-svg-icons';

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
    const [imagePreview, setImagePreview] = useState(null);
    const [isSpeaking, setIsSpeaking] = useState(false);

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

            // Add a timestamp if none exists
            if (!data.time) {
                data.time = formatTime(new Date());
            }

            setMessages((prevMessages) => [...prevMessages, data]);

            // If in call mode and AI sends a text message, speak it
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
    }, [imageFile]);


    // Start Listening function
    const startListening = useCallback(() => {
        if (!recognition) {
            const rec = setupRecognition();
            setRecognition(rec);
            currentRecognitionRef.current = rec;
            if (rec) rec.start();
        } else {
            // Stop any existing recognition before starting new one
            if (isListening && currentRecognitionRef.current) {
                currentRecognitionRef.current.stop();
            }
            recognition.start();
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
                // Stop any existing recognition before starting new one
                if (isListening && currentRecognitionRef.current) {
                    currentRecognitionRef.current.stop();
                }
                recognition.start();
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
                socket.emit('send_message', { message: messageToSend, image: imageData, time: formatTime(new Date()) });
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
        socket.emit('send_message', { message: messageToSend, image: imageData, time: formatTime(new Date()) });
        setMessage(''); // Clear input field
        setImageFile(null); // Clear image file
        setImagePreview(null); // Clear image preview

    }, [socket, message, image
