// server.js (UPDATED for Streaming)

require('dotenv').config();
const express = require('express');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');
const { v4: uuidv4 } = require('uuid');

// --- Configuration and Initialization ---

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
app.use(express.static(path.join(__dirname)));

// ... (createNewChatSession and getChatSession helpers remain the same) ...
function createNewChatSession() {
    const sessionId = uuidv4(); 
    const chat = ai.chats.create({ model });
    chatSessions.set(sessionId, chat);
    console.log(`[SERVER] New chat session created: ${sessionId}`);
    return sessionId;
}

function getChatSession(sessionId) {
    return chatSessions.get(sessionId);
}

// 1. Endpoint to create and return a new session ID (no change)
app.get('/api/new-session', (req, res) => {
    try {
        const sessionId = createNewChatSession();
        res.json({ sessionId: sessionId });
    } catch (error) {
        console.error('[SERVER] Error creating new session:', error);
        res.status(500).json({ error: 'Failed to initialize Gemini chat session.' });
    }
});


// 2. Chat API Endpoint (UPDATED to stream using SSE)
app.post('/api/chat', async (req, res) => {
    const { sessionId, message } = req.body;

    if (!sessionId || !message) {
        return res.status(400).json({ error: 'Session ID and message are required.' });
    }

    const chat = getChatSession(sessionId);
    if (!chat) {
        return res.status(404).send('Session ID not found.');
    }

    try {
        // 1. Set headers for streaming (Server-Sent Events)
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no' // Important for preventing proxy buffering
        });
        
        console.log(`[SERVER:Session ${sessionId}] Streaming response for user message: ${message}`);

        // 2. Send user message to the chat object to update its history
        // Note: The history update is done by the SDK behind the scenes before streaming the response.
        const stream = await chat.sendMessageStream({ message });
        
        let fullResponse = '';

        // 3. Loop over the stream chunks and send them as SSE 'data' events
        for await (const chunk of stream) {
            const chunkText = chunk.text;
            if (chunkText) {
                // Send data chunk
                res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
                fullResponse += chunkText;
            }
        }
        
        // 4. Send a final 'done' event and close the connection
        res.write('event: done\n');
        res.write('data: {}\n\n');
        res.end();

        console.log(`[SERVER:Session ${sessionId}] Stream finished. Full response saved to history.`);

    } catch (error) {
        console.error(`[SERVER:Session ${sessionId}] Gemini Streaming Error:`, error);
        
        // Send error as an SSE event before closing
        res.write(`event: error\n`);
        res.write(`data: ${JSON.stringify({ error: 'Failed to stream response from AI.' })}\n\n`);
        res.end();
    }
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});