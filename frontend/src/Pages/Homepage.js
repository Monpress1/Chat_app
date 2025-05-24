 import React, { useEffect, useRef, useState, useCallback } from "react";
import { Mic, MicOff, X } from "lucide-react"; // Assuming Lucide React icons are installed

export default function VoiceInterface({
  isCallMode,
  setIsCallMode,
  handleSend, // Function to send transcript to parent (ChatWithAI)
  isSpeaking, // Prop: true if AI is currently speaking (from ChatWithAI)
  setIsSpeaking, // Prop: Setter for parent's isSpeaking state (used for cleanup)
}) {
  // State for SpeechRecognition instance (now directly managed)
  const [currentRecognition, setCurrentRecognition] = useState(null);
  // State to track if microphone is actively listening
  const [isListening, setIsListening] = useState(false);

  // --- Speech Recognition Setup ---
  const setupRecognition = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser.");
      console.error("Web Speech API (SpeechRecognition) not found.");
      return null;
    }

    const rec = new SpeechRecognition();
    rec.lang = "en-US";
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
        handleSend(transcript); // Send the transcript to the parent component
      }
    };

    rec.onend = () => {
      setIsListening(false);
      console.log('Voice recognition ended.');
      // If in call mode AND AI is not speaking, attempt to restart listening
      if (isCallMode && !isSpeaking) {
        console.log('Attempting to restart listening after onend...');
        // Add a small delay to prevent rapid re-starts or browser mic release issues
        setTimeout(() => currentRecognition?.start(), 500);
      }
    };

    rec.onerror = (event) => {
      setIsListening(false);
      console.error('Speech recognition error:', event.error);
      // Try to restart if it's not a 'no-speech' error in call mode, and AI isn't speaking
      if (isCallMode && event.error !== 'no-speech' && !isSpeaking) {
        console.log('Attempting to restart listening after error...');
        setTimeout(() => currentRecognition?.start(), 500);
      }
    };

    return rec;
  }, [isCallMode, handleSend, isSpeaking, currentRecognition]); // currentRecognition added for the restart logic in onend/onerror

  // --- Mic Control Functions ---
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


  // --- Toggle Voice Call Mode ---
  const toggleCallMode = () => {
    const newCallMode = !isCallMode;
    setIsCallMode(newCallMode); // Update the parent's call mode state

    if (!newCallMode) { // If turning OFF call mode
      stopListening(); // Ensure mic is stopped
      // Ensure any ongoing speech synthesis is cancelled
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false); // Reset AI speaking state in parent
      setCurrentRecognition(null); // Clear the recognition instance
    }
    // If turning ON, useEffect will handle starting mic automatically
  };

  // --- Automatic Mic Start/Cleanup on Call Mode Change ---
  useEffect(() => {
    if (isCallMode) {
      startListening(); // Automatically start listening when entering call mode
    }

    // Cleanup function when component unmounts or isCallMode changes
    return () => {
      // Ensure mic is stopped and synthesis cancelled on cleanup
      currentRecognition?.stop();
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
      setIsListening(false);
      setIsSpeaking(false);
      setCurrentRecognition(null); // Clear instance on cleanup
    };
  }, [isCallMode, startListening, setIsSpeaking, currentRecognition]);


  return (
    <div className="fixed bottom-0 left-0 w-full z-20 pointer-events-none">
      {isCallMode && (
        <div className="absolute inset-0 flex justify-center items-center pointer-events-auto bg-gradient-to-br from-black/80 via-purple-900/90 to-orange-900/90 backdrop-blur-lg p-8 rounded-t-xl">
          {/* Main mic button in voice chat mode */}
          <button
            className={`bg-white text-black p-4 rounded-full shadow-xl transition-all duration-300 ${
              isListening ? "animate-pulse" : "" // Pulse when actively listening
            } ${isSpeaking ? "opacity-50 cursor-not-allowed" : ""}`} // Dim if AI is speaking
            onClick={isListening ? stopListening : startListening} // Toggles listening
            disabled={isSpeaking} // Disable while AI is speaking
            title={isSpeaking ? "AI is speaking..." : (isListening ? "Stop listening" : "Start listening")}
          >
            {isListening ? <MicOff size={28} /> : <Mic size={28} />}
          </button>

          {/* Button to exit voice mode (top right) */}
          <button
            className="absolute top-4 right-4 text-white p-2 rounded-full hover:bg-white/20 transition"
            onClick={toggleCallMode} // This button directly exits call mode
            title="Exit Voice Mode"
          >
            <X size={24} />
          </button>
        </div>
      )}

      {!isCallMode && (
        <div className="absolute bottom-4 right-4 pointer-events-auto">
          {/* Button to enter voice chat mode (bottom right) */}
          <button
            className="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition"
            onClick={toggleCallMode} // This button directly enters call mode
            title="Enter Voice Mode"
          >
            <Mic size={24} />
          </button>
        </div>
      )}
    </div>
  );
}
