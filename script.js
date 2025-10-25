// script.js (UPDATED for Streaming)

document.addEventListener('DOMContentLoaded', () => {
    // ... (All variable declarations remain the same) ...
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const chatOutput = document.getElementById('chat-output');
    const chatHistoryList = document.getElementById('chat-history');
    const newChatBtn = document.querySelector('.new-chat-btn');

    let currentSessionId = null;
    let chatData = {}; 
    
    // Global variable to store the element being streamed to
    let currentBotMessageElement = null;

    // --- LocalStorage Functions (Remain the same) ---

    // ... (loadChatsFromStorage, saveChatsToStorage, addMessage, saveMessageToSession, renderChat, createHistoryItem, startAIBrainSession remain the same) ...

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
                                      firstUserMessage.text.substring(0, 20) + (firstUserMessage.text.length > 20 ? '...' : '') : 
                                      `New Chat - ${sessionId.substring(0, 8)}`;
                        createHistoryItem(sessionId, title);
                    });
                    
                    const initialSessionId = storedSessionId && chatData[storedSessionId] ? storedSessionId : Object.keys(chatData)[0];
                    if (initialSessionId) {
                        // The server-side context is reset, but we load the UI history
                        renderChat(initialSessionId);
                    }
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
        }
    }
    
    function addMessage(text, sender, targetOutput = chatOutput) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        messageDiv.classList.add(sender === 'user' ? 'user-message' : 'system-message');
        
        const p = document.createElement('p');
        p.textContent = text;
        messageDiv.appendChild(p);

        targetOutput.appendChild(messageDiv);
        targetOutput.scrollTop = targetOutput.scrollHeight;
        
        // Return the <p> element for streaming if it's a bot message
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

    function renderChat(sessionId) {
        chatOutput.innerHTML = '';
        
        document.querySelectorAll('.history-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.sessionId === sessionId) {
                item.classList.add('active');
            }
        });

        if (chatData[sessionId]) {
            chatData[sessionId].forEach(msg => {
                addMessage(msg.text, msg.sender);
            });
        }
        
        currentSessionId = sessionId;
        saveChatsToStorage();

        userInput.disabled = false;
        sendBtn.disabled = false;
        sendBtn.style.opacity = 1;
        userInput.focus();
    }

    function createHistoryItem(sessionId, title) {
        document.querySelectorAll('.history-item').forEach(item => item.classList.remove('active'));

        const li = document.createElement('li');
        li.classList.add('history-item', 'active');
        li.dataset.sessionId = sessionId;
        li.textContent = title;
        
        li.addEventListener('click', () => {
            renderChat(sessionId);
        });

        chatHistoryList.prepend(li);
        return li;
    }
    
    // Placeholder to keep the function signatures consistent
    const startAIBrainSession = (sessionId) => { /* No server call needed here for this version */ };


    // 1. Start a New Chat Session (No change)
    const startNewChat = async () => {
        try {
            const response = await fetch('/api/new-session');
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server responded with status ${response.status}: ${errorText}`);
            }
            
            const data = await response.json();
            const sessionId = data.sessionId;
            const defaultTitle = `New Chat - ${new Date().toLocaleTimeString()}`;
            
            const welcomeMessage = "Welcome! I'm ready for a new conversation. Ask me anything.";
            chatData[sessionId] = [{ text: welcomeMessage, sender: 'system' }];
            
            createHistoryItem(sessionId, defaultTitle);
            renderChat(sessionId);
            saveChatsToStorage();

        } catch (error) {
            console.error('CRITICAL ERROR: Could not start a new chat session. Check your server console.', error);
            alert(`Error starting new chat: ${error.message}.`);
        }
    };

    // 2. Send Message Handler (UPDATED to handle streaming)
    const sendMessage = async () => {
        const userText = userInput.value.trim();

        if (!userText || !currentSessionId) {
            return;
        }

        // Add User Message (saves to memory, but not yet to the permanent bot history)
        addMessage(userText, 'user');
        saveMessageToSession(currentSessionId, userText, 'user');

        // Prepare Bot Message element (empty string)
        currentBotMessageElement = addMessage('', 'bot');
        let fullBotResponse = '';

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
            saveChatsToStorage();
        }
        
        const decoder = new TextDecoder('utf-8');

        try {
            const response = await fetch('/api/chat', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: currentSessionId, message: userText })
            });

            if (!response.ok) {
                throw new Error(`Server streaming error: Status ${response.status}`);
            }

            // Get the stream reader
            const reader = response.body.getReader();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                // Decode the chunk (it might contain multiple SSE events)
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n\n').filter(line => line.trim() !== '');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const jsonStr = line.substring(6);
                            const data = JSON.parse(jsonStr);
                            
                            if (data.text) {
                                // Append the new text chunk to the element
                                currentBotMessageElement.textContent += data.text;
                                fullBotResponse += data.text;
                                // Auto-scroll to keep the latest text visible
                                chatOutput.scrollTop = chatOutput.scrollHeight;
                            }
                        } catch (e) {
                            console.error('Error parsing SSE data:', e, line);
                        }
                    } else if (line.startsWith('event: done')) {
                        // Stream finished, break the loop
                        break;
                    } else if (line.startsWith('event: error')) {
                         // Handle server-side error event
                         const errorData = JSON.parse(line.substring(6));
                         currentBotMessageElement.textContent += `[ERROR: ${errorData.error}]`;
                         fullBotResponse = 'ERROR: ' + errorData.error;
                         break;
                    }
                }
            }

            // After streaming finishes, save the final, complete response to local history
            if (fullBotResponse) {
                // Remove the initial user message, then add the user and complete bot message
                // This ensures the local memory holds the full exchange.
                chatData[currentSessionId].pop(); // Remove the user message placeholder
                saveMessageToSession(currentSessionId, userText, 'user');
                saveMessageToSession(currentSessionId, fullBotResponse, 'bot');
            }

        } catch (error) {
            console.error('Error during streaming chat:', error);
            // Display error in the chat window
            currentBotMessageElement.textContent = `🤖 Streaming failed: ${error.message}`;
        } finally {
            // Re-enable input
            userInput.disabled = false;
            sendBtn.disabled = false;
            sendBtn.style.opacity = 1;
            userInput.focus();
            currentBotMessageElement = null;
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


    // Main App Init: Load from storage or start a new chat
    chatHistoryList.innerHTML = '';
    const chatsFound = loadChatsFromStorage();
    if (!chatsFound) {
        startNewChat();
    }
});