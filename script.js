document.addEventListener('DOMContentLoaded', () => {
    // --- Utility Function for Delay ---
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const TYPE_DELAY_MS = 25; 
    const NOTIFICATION_DELAY_MS = 5000; // 5 seconds delay for notification

    // --- Utility Function for Markdown Rendering ---
    function renderMarkdown(text) {
        // Assuming 'marked' is loaded globally
        return marked.parse(text);
    }

    // --- NEW: Notification Handlers ---

    /**
     * Requests notification permission from the user.
     * @returns {Promise<string>} 'granted', 'denied', or 'default'.
     */
    function requestNotificationPermission() {
        if (!('Notification' in window)) {
            console.warn("This browser does not support desktop notification.");
            return Promise.resolve('denied');
        }

        if (Notification.permission === 'granted' || Notification.permission === 'denied') {
            return Promise.resolve(Notification.permission);
        }

        return Notification.requestPermission();
    }

    /**
     * Shows a desktop notification for a new bot message.
     * @param {string} title The title of the notification.
     * @param {string} body The body content of the notification.
     */
    function showBotNotification(title, body) {
        // Only show if permission is granted AND the document is hidden (user is on another tab)
        if (Notification.permission === 'granted' && document.hidden) {
            const notification = new Notification(title, {
                body: body,
                icon: 'path/to/your/app/icon.png', // Update this path
                vibrate: [200, 100, 200]
            });
            
            notification.onclick = () => {
                window.focus(); // Bring the chat window to the foreground
            };
            
            // Auto-close after 10 seconds
            setTimeout(() => notification.close(), 10000); 
        }
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
    let currentBotMessageElement = null;

    // --- Core Functions (Loading/Saving/UI) ---
    function loadChatsFromStorage() {
        const storedData = localStorage.getItem('chatApp_chatData');
        const storedSessionId = localStorage.getItem('chatApp_currentSessionId');

        if (storedData) {
            try {
                chatData = JSON.parse(storedData);
                console.log("Loaded chat data from localStorage.");
                
                if (Object.keys(chatData).length > 0) {
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
                    return false;
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
    
    function deleteChat(sessionIdToDelete) {
        if (!confirm("Are you sure you want to delete this chat?")) {
            return;
        }

        delete chatData[sessionIdToDelete];

        const historyItem = document.querySelector(`.history-item[data-session-id="${sessionIdToDelete}"]`);
        if (historyItem) {
            historyItem.remove();
        }

        if (currentSessionId === sessionIdToDelete) {
            currentSessionId = null;
            chatOutput.innerHTML = '';
            
            const remainingSessions = Object.keys(chatData);
            if (remainingSessions.length > 0) {
                renderChat(remainingSessions[remainingSessions.length - 1]);
            } else {
                startNewChat();
            }
        }
        
        saveChatsToStorage();
    }

    function renderChat(sessionId) {
        if (!chatData[sessionId]) {
            console.warn(`Attempted to render a non-existent session: ${sessionId}`);
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

    function createHistoryItem(sessionId, title) {
        const li = document.createElement('li');
        li.classList.add('history-item');
        li.dataset.sessionId = sessionId;
        
        const titleSpan = document.createElement('span');
        titleSpan.classList.add('history-item-title');
        titleSpan.textContent = title;
        
        const deleteBtn = document.createElement('span');
        deleteBtn.classList.add('delete-chat-btn');
        deleteBtn.innerHTML = '&#10005;';
        
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteChat(sessionId);
        });

        li.appendChild(titleSpan);
        li.appendChild(deleteBtn);
        
        li.addEventListener('click', () => {
            if (currentSessionId !== sessionId) {
                renderChat(sessionId);
            }
        });

        chatHistoryList.prepend(li);
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

    // --- Core Function: sendMessage (UPDATED) ---
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
        if (titleSpan && titleSpan.textContent === 'New Chat') {
            const newTitle = userText.substring(0, 30) + (userText.length > 30 ? '...' : '');
            titleSpan.textContent = newTitle;
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
                
                // --- NEW/UPDATED: Send Notification with 5-second delay ---
                const notificationTitle = `New Message from Gemini`;
                // Strip Markdown/HTML for a clean notification body
                const notificationBody = fullBotResponse.replace(/<[^>]*>?/gm, '').substring(0, 100) + (fullBotResponse.length > 100 ? '...' : ''); 
                
                // Delay the notification
                setTimeout(() => {
                    showBotNotification(notificationTitle, notificationBody);
                }, NOTIFICATION_DELAY_MS);
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

    // --- Event Listeners ---
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

    // Main App Init
    chatHistoryList.innerHTML = '';
    const chatsFound = loadChatsFromStorage();
    if (!chatsFound) {
        startNewChat();
    }
    
    // Request notification permission on load
    requestNotificationPermission();
});