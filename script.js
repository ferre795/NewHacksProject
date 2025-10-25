// script.js (REWORKED)

document.addEventListener('DOMContentLoaded', () => {
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const chatOutput = document.getElementById('chat-output');
    const chatHistoryList = document.getElementById('chat-history');
    const newChatBtn = document.querySelector('.new-chat-btn');

    let currentSessionId = null;
    let chatData = {}; // Stores {sessionId: [{text, sender}, ...]}

    // --- Helper Functions ---

    function addMessage(text, sender, targetOutput = chatOutput) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        messageDiv.classList.add(sender === 'user' ? 'user-message' : 'system-message');
        
        const p = document.createElement('p');
        p.textContent = text;
        messageDiv.appendChild(p);

        targetOutput.appendChild(messageDiv);
        targetOutput.scrollTop = targetOutput.scrollHeight;
    }

    function saveMessageToSession(sessionId, text, sender) {
        if (!chatData[sessionId]) {
            chatData[sessionId] = [];
        }
        chatData[sessionId].push({ text, sender });
    }

    function renderChat(sessionId) {
        // Clear current chat
        chatOutput.innerHTML = '';
        
        // Highlight active session
        document.querySelectorAll('.history-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.sessionId === sessionId) {
                item.classList.add('active');
            }
        });

        // Load messages for the new session
        if (chatData[sessionId]) {
            chatData[sessionId].forEach(msg => {
                addMessage(msg.text, msg.sender);
            });
        }
        
        // Set the current session
        currentSessionId = sessionId;

        // Ensure input area is ready
        userInput.disabled = false;
        sendBtn.disabled = false;
        sendBtn.style.opacity = 1;
        userInput.focus();
    }

    function createHistoryItem(sessionId, title) {
        // Remove 'active' from all others before creating a new one
        document.querySelectorAll('.history-item').forEach(item => item.classList.remove('active'));

        const li = document.createElement('li');
        li.classList.add('history-item', 'active'); // New chat is active by default
        li.dataset.sessionId = sessionId;
        li.textContent = title;
        
        // Click event to switch chats
        li.addEventListener('click', () => renderChat(sessionId));

        chatHistoryList.prepend(li);
        return li;
    }

    // --- Core Logic ---

    // 1. Start a New Chat Session - Endpoint: /api/new-session
    const startNewChat = async () => {
        try {
            // Updated endpoint to /api/new-session
            const response = await fetch('/api/new-session');
            
            if (!response.ok) {
                // If status is not 200-299, throw error with status
                const errorText = await response.text();
                throw new Error(`Server responded with status ${response.status}: ${errorText}`);
            }
            
            const data = await response.json();
            const sessionId = data.sessionId;
            const defaultTitle = `New Chat - ${new Date().toLocaleTimeString()}`;
            
            // Initialize storage and starting message
            const welcomeMessage = "Welcome! I'm ready for a new conversation. Ask me anything.";
            chatData[sessionId] = [{ text: welcomeMessage, sender: 'system' }];
            
            // Update UI
            createHistoryItem(sessionId, defaultTitle);
            renderChat(sessionId);

        } catch (error) {
            console.error('CRITICAL ERROR: Could not start a new chat session. Check your server console.', error);
            alert(`Error starting new chat: ${error.message}. Is your Express server running on port ${window.location.port || 3000}?`);
        }
    };

    // 2. Send Message Handler - Endpoint: /api/chat
    const sendMessage = async () => {
        const userText = userInput.value.trim();

        if (!userText || !currentSessionId) {
            return;
        }

        // Add User Message and save
        addMessage(userText, 'user');
        saveMessageToSession(currentSessionId, userText, 'user');

        // Clear input and disable UI
        userInput.value = '';
        userInput.style.height = 'auto';
        userInput.disabled = true;
        sendBtn.disabled = true;
        sendBtn.style.opacity = 0.5;

        // Update History Item Title on first message
        const historyItem = document.querySelector(`.history-item[data-session-id="${currentSessionId}"]`);
        if (historyItem && historyItem.textContent.startsWith('New Chat')) {
            historyItem.textContent = userText.substring(0, 20) + (userText.length > 20 ? '...' : '');
        }

        try {
            // Send message to the Express server with the session ID
            const response = await fetch('/api/chat', { // Updated endpoint to /api/chat
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: currentSessionId, message: userText })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Server error: Status ${response.status}`);
            }

            const data = await response.json();
            
            // Add Bot Response and save
            addMessage(data.text, 'bot');
            saveMessageToSession(currentSessionId, data.text, 'bot');

        } catch (error) {
            console.error('Error communicating with AI:', error);
            addMessage(`🤖 Server Error: ${error.message}. Please check console.`, 'system');
        } finally {
            // Re-enable input
            userInput.disabled = false;
            sendBtn.disabled = false;
            sendBtn.style.opacity = 1;
            userInput.focus();
        }
    };

    // --- Initialization ---

    newChatBtn.addEventListener('click', startNewChat);
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto'; 
        userInput.style.height = userInput.scrollHeight + 'px';
    });


    // Start by clearing any placeholder and initializing the first chat
    chatHistoryList.innerHTML = '';
    startNewChat();
});