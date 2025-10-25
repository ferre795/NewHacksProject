// server.js

// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

// Check for the API key
if (!process.env.GEMINI_API_KEY) {
    console.error("Error: GEMINI_API_KEY is not set in the .env file.");
    process.exit(1);
}

// Initialize the GoogleGenAI client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const model = "gemini-2.5-flash"; // A fast and capable model for chat

const app = express();
const PORT = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// 1. Serve Static Files
// This serves your index.html, style.css, and script.js from the root directory
app.use(express.static(path.join(__dirname)));

// 2. Chat API Endpoint
app.post('/chat', async (req, res) => {
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    try {
        console.log(`Received message: ${message}`);
        
        // Call the Gemini API
        const response = await ai.models.generateContent({
            model: model,
            contents: message, // Assuming single turn for simplicity; for multi-turn chat, use `ai.chats`
        });

        const botResponse = response.text;
        
        console.log(`Gemini response: ${botResponse}`);

        // Send the response back to the client
        res.json({ text: botResponse });

    } catch (error) {
        console.error('Gemini API Error:', error);
        res.status(500).json({ error: 'Failed to communicate with the AI model.' });
    }
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Chat endpoint ready at http://localhost:${PORT}/chat`);
});