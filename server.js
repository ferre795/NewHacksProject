// server.js (REWORKED)

require('dotenv').config();
const express = require('express');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

// --- Initialization and Error Check ---
if (!process.env.GEMINI_API_KEY) {
    console.error("CRITICAL ERROR: GEMINI_API_KEY is not set in the .env file.");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const model = "gemini-2.5-flash";

const app = express();
const PORT = 3000;

// In-memory storage for chat sessions. Key: sessionId, Value: Chat object
const chatSessions = new Map();

// --- Middleware ---
app.use(express.json());

// Serve Static Files: Ensures index.html, style.css, and script.js are available
app.use(express.static(path.join(__dirname)));

/**
 * Helper function to create a new chat session.
 */
function createNewChatSession() {
    // Generate a simple unique ID for the session (timestamp is reliable)
    const sessionId = Date.now().toString(); 
    
    // Create the Gemini Chat object which maintains history
    const chat = ai.chats.create({ model });
    
    chatSessions.set(sessionId, chat);
    console.log(`[SERVER] New chat session created: ${sessionId}`);
    return sessionId;
}

/**
 * Helper function to retrieve an existing chat session.
 */
function getChatSession(sessionId) {
    return chatSessions.get(sessionId);
}


// --- API Endpoints ---

// 1. Endpoint to create and return a new session ID
app.get('/api/new-session', (req, res) => {
    try {
        const sessionId = createNewChatSession();
        // Immediately respond with the new ID
        res.json({ sessionId: sessionId });
    } catch (error) {
        console.error('[SERVER] Error creating new session:', error);
        res.status(500).json({ error: 'Failed to initialize Gemini chat session.' });
    }
});

// 2. Chat API Endpoint (Handles conversation history)
app.post('/api/chat', async (req, res) => {
    const { sessionId, message } = req.body;

    if (!sessionId || !message) {
        return res.status(400).json({ error: 'Session ID and message are required.' });
    }

    const chat = getChatSession(sessionId);
    if (!chat) {
        return res.status(404).json({ error: `Session ID ${sessionId} not found.` });
    }

    try {
        console.log(`[SERVER:Session ${sessionId}] User: ${message}`);
        
        // Use the chat.sendMessage method to maintain history
        const response = await chat.sendMessage({ message });

        const botResponse = response.text;
        
        console.log(`[SERVER:Session ${sessionId}] Gemini: ${botResponse}`);

        // Send the response back to the client
        res.json({ text: botResponse });

    } catch (error) {
        console.error(`[SERVER:Session ${sessionId}] Gemini API Error:`, error);
        // Provide a clearer error message back to the client
        res.status(500).json({ error: 'Failed to get response from the AI model.' });
    }
});


// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`API endpoints available at /api/...`);
});