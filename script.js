// script.js (UPDATED with Individual Chat Deletion)

document.addEventListener('DOMContentLoaded', () => {
    // --- Utility Function for Delay ---
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const TYPE_DELAY_MS = 25; 

    // --- Utility Function for Markdown Rendering ---
    // Uses the 'marked' library (must be included in index.html)
    function renderMarkdown(text) {
        // Use the marked.js function to convert Markdown text to HTML
        return marked.parse(text);
    }

    // --- Variable Declarations ---
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const chatOutput = document.getElementById('chat-output');
    const chatHistoryList = document.getElementById('chat-history');
    const newChatBtn = document.querySelector('.new-chat-btn');
    const removeAllChatsBtn = document.getElementById('remove-all-chats-btn'); 

    let currentSessionId = null;
    let chatData = {}; 
    let currentBotMessageElement = null; // Used for streaming


    // --- Core Functions ---
    // ... loadChatsFromStorage, saveChatsToStorage, addMessage, saveMessageToSession (remain the same) ...

    function loadChatsFromStorage() {
        // ... (implementation remains the same) ...
        const storedData = localStorage.getItem('chatApp_chatData');
        const storedSessionId = localStorage.getItem('chatApp_currentSessionId');

        if (storedData) {
            try {
                chatData = JSON.parse(storedData);
                console.log("Loaded chat data from localStorage.");
                
                if (Object.keys(chatData).length > 0) {
                    // Render history items from newest to oldest
                    Object.keys(chatData).reverse().forEach(sessionId => {
                        const firstUserMessage = chatData[sessionId].find(msg => msg.sender === 'user');
                        const title = firstUserMessage ? 
                                      firstUserMessage.text.substring(0, 30) + (firstUserMessage.text.length > 30 ? '...' : '') : 
                                      `New Chat - ${sessionId.substring(0, 8)}`;
                        createHistoryItem(sessionId, title);
                    });
                    
                    const initialSessionId = storedSessionId && chatData[storedSessionId] ? storedSessionId : Object.keys(chatData)[0];
                    if (initialSessionId) {
                        renderChat(initialSessionId);
                    }
                } else {
                    return false; // No chats found
                }
                return true; 
            } catch (e) {
                console.error("Error parsing chat data from localStorage.", e);
                localStorage.removeItem('chatApp_chatData');
            }
        }
        return false;
    }

    function saveChatsToStorage() {
        localStorage.setItem('chatApp_chatData', JSON.stringify(chatData));
        if (currentSessionId) {
            localStorage.setItem('chatApp_currentSessionId', currentSessionId);
        } else {
            localStorage.removeItem('chatApp_currentSessionId');
        }
    }
    
    function addMessage(text, sender, targetOutput = chatOutput) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        messageDiv.classList.add(sender === 'user' ? 'user-message' : 'system-message');
        
        const p = document.createElement('p');
        p.innerHTML = renderMarkdown(text);
        messageDiv.appendChild(p);
        targetOutput.appendChild(messageDiv);
        targetOutput.scrollTop = targetOutput.scrollHeight;
        
        if (sender === 'bot' && text === '') {
            return p;
        }
    }

    function saveMessageToSession(sessionId, text, sender) {
        if (!chatData[sessionId]) {
            chatData[sessionId] = [];
        }
        chatData[sessionId].push({ text, sender });
        saveChatsToStorage();
    }
    
    // NEW: Function to handle deleting a single chat
    function deleteChat(sessionIdToDelete) {
        if (!confirm("Are you sure you want to delete this chat?")) {
            return;
        }

        // Remove from data object
        delete chatData[sessionIdToDelete];

        // Remove from UI
        const historyItem = document.querySelector(`.history-item[data-session-id="${sessionIdToDelete}"]`);
        if (historyItem) {
            historyItem.remove();
        }

        // If the deleted chat was the active one, select a new one or start fresh
        if (currentSessionId === sessionIdToDelete) {
            currentSessionId = null;
            chatOutput.innerHTML = '';
            
            const remainingSessions = Object.keys(chatData);
            if (remainingSessions.length > 0) {
                // Render the most recent remaining chat
                renderChat(remainingSessions[remainingSessions.length - 1]);
            } else {
                // If no chats are left, start a new one
                startNewChat();
            }
        }
        
        saveChatsToStorage(); // Update localStorage
    }

    function renderChat(sessionId) {
        // Safety check in case the session was deleted
        if (!chatData[sessionId]) {
            console.warn(`Attempted to render a non-existent session: ${sessionId}`);
            // Find the first available chat and render it instead
            const firstAvailableSession = Object.keys(chatData)[0];
            if (firstAvailableSession) {
                renderChat(firstAvailableSession);
            } else {
                startNewChat();
            }
            return;
        }

        chatOutput.innerHTML = '';
        
        document.querySelectorAll('.history-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.sessionId === sessionId) {
                item.classList.add('active');
            }
        });

        chatData[sessionId].forEach(msg => {
            addMessage(msg.text, msg.sender);
        });
        
        currentSessionId = sessionId;
        saveChatsToStorage();

        userInput.disabled = false;
        sendBtn.disabled = false;
        sendBtn.style.opacity = 1;
        userInput.focus();
    }

    // MODIFIED: Added delete button creation
    function createHistoryItem(sessionId, title) {
        const li = document.createElement('li');
        li.classList.add('history-item');
        li.dataset.sessionId = sessionId;
        
        const titleSpan = document.createElement('span');
        titleSpan.classList.add('history-item-title');
        titleSpan.textContent = title;
        
        const deleteBtn = document.createElement('span');
        deleteBtn.classList.add('delete-chat-btn');
        deleteBtn.innerHTML = '&#10005;'; // A simple 'x' character
        
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent the li's click event from firing
            deleteChat(sessionId);
        });

        li.appendChild(titleSpan);
        li.appendChild(deleteBtn);
        
        li.addEventListener('click', () => {
             // Do not render if it's already active
            if (currentSessionId !== sessionId) {
                renderChat(sessionId);
            }
        });

        chatHistoryList.prepend(li); // Add new chats to the top
        return li;
    }
    
    const startNewChat = async () => {
        try {
            const response = await fetch('/api/new-session');
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server responded with status ${response.status}: ${errorText}`);
            }
            
            const data = await response.json();
            const sessionId = data.sessionId;
            const defaultTitle = `New Chat`;
            
            const welcomeMessage = "Welcome! I'm ready for a new conversation. Ask me *anything*.";
            chatData[sessionId] = [{ text: welcomeMessage, sender: 'system' }];
            
            document.querySelectorAll('.history-item').forEach(item => item.classList.remove('active'));

            createHistoryItem(sessionId, defaultTitle);
            renderChat(sessionId);
            saveChatsToStorage();

        } catch (error) {
            console.error('CRITICAL ERROR: Could not start a new chat session. Check your server console.', error);
            alert(`Error starting new chat: ${error.message}.`);
        }
    };
    
    const handleRemoveAllChats = () => {
        if (!confirm("Are you sure you want to remove all chat history? This cannot be undone.")) {
            return;
        }

        localStorage.removeItem('chatApp_chatData');
        localStorage.removeItem('chatApp_currentSessionId');
        
        chatData = {};
        currentSessionId = null;
        
        chatHistoryList.innerHTML = '';
        chatOutput.innerHTML = '';
        
        startNewChat();
    };

    const sendMessage = async () => {
        const userText = userInput.value.trim();
        if (!userText || !currentSessionId) return;

        addMessage(userText, 'user');
        saveMessageToSession(currentSessionId, userText, 'user');

        currentBotMessageElement = addMessage('', 'bot');
        let fullBotResponse = '';

        userInput.value = '';
        userInput.style.height = 'auto';
        userInput.disabled = true;
        sendBtn.disabled = true;
        sendBtn.style.opacity = 0.5;

        const historyItem = document.querySelector(`.history-item[data-session-id="${currentSessionId}"]`);
        const titleSpan = historyItem ? historyItem.querySelector('.history-item-title') : null;
        // Update title only if it's the first user message
        if (titleSpan && titleSpan.textContent === 'New Chat') {
            const newTitle = userText.substring(0, 30) + (userText.length > 30 ? '...' : '');
            titleSpan.textContent = newTitle;
            // No need to save to storage here, message saving already does it
        }
        
        const decoder = new TextDecoder('utf-8');

        try {
            const response = await fetch('/api/chat', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: currentSessionId, message: userText })
            });

            if (!response.ok) throw new Error(`Server streaming error: Status ${response.status}`);
            const reader = response.body.getReader();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n\n').filter(line => line.trim() !== '');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.substring(6));
                            if (data.text) {
                                for (const char of data.text) {
                                    currentBotMessageElement.textContent += char;
                                    fullBotResponse += char;
                                    chatOutput.scrollTop = chatOutput.scrollHeight;
                                    await delay(TYPE_DELAY_MS);
                                }
                            }
                        } catch (e) { console.error('Error parsing SSE data:', e, line); }
                    } else if (line.startsWith('event: done')) break;
                }
            }

            if (fullBotResponse) {
                currentBotMessageElement.innerHTML = renderMarkdown(fullBotResponse);
                chatOutput.scrollTop = chatOutput.scrollHeight;
                saveMessageToSession(currentSessionId, fullBotResponse, 'bot');
            }

        } catch (error) {
            console.error('Error during streaming chat:', error);
            currentBotMessageElement.textContent = `🤖 Streaming failed: ${error.message}`;
        } finally {
            userInput.disabled = false;
            sendBtn.disabled = false;
            sendBtn.style.opacity = 1;
            userInput.focus();
            currentBotMessageElement = null;
        }
    };


    // --- Initialization & Event Listeners ---

    newChatBtn.addEventListener('click', startNewChat);
    sendBtn.addEventListener('click', sendMessage);
    removeAllChatsBtn.addEventListener('click', handleRemoveAllChats); 

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


    // Main App Init: Load from storage or start a new chat
    chatHistoryList.innerHTML = '';
    const chatsFound = loadChatsFromStorage();
    if (!chatsFound) {
        startNewChat();
    }
});