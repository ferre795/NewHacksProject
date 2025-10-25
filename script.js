// script.js (UPDATED with Typewriter Effect and Markdown Formatting)

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
    // ... loadChatsFromStorage, saveChatsToStorage, saveMessageToSession, 
    // ... renderChat, createHistoryItem, startNewChat, handleRemoveAllChats (remain largely the same) ...

    function loadChatsFromStorage() {
        // ... (implementation remains the same) ...
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
    
    // MODIFIED: Use innerHTML to render Markdown.
    function addMessage(text, sender, targetOutput = chatOutput) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        messageDiv.classList.add(sender === 'user' ? 'user-message' : 'system-message');
        
        const p = document.createElement('p');

        // *** FIX: Use innerHTML for Markdown rendering ***
        p.innerHTML = renderMarkdown(text);

        messageDiv.appendChild(p);

        targetOutput.appendChild(messageDiv);
        targetOutput.scrollTop = targetOutput.scrollHeight;
        
        // Return the <p> element for streaming if it's a bot message
        // NOTE: This initial element will be plain text, but we'll manually render 
        // the full content to HTML in the 'finally' block of sendMessage.
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
            
            // NOTE: The welcome message should also be Markdown if you want formatting.
            const welcomeMessage = "Welcome! I'm ready for a new conversation. Ask me *anything* and I will reply with **formatted** text.";
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
        
        console.log("All chat history removed.");
        alert("All chat history has been cleared.");

        startNewChat();
    };

    // MODIFIED: Streaming Logic with Typewriter Effect and Markdown Finalization
    const sendMessage = async () => {
        const userText = userInput.value.trim();

        if (!userText || !currentSessionId) {
            return;
        }

        // Add User Message (saves to UI and history)
        addMessage(userText, 'user');
        saveMessageToSession(currentSessionId, userText, 'user');

        // Prepare Bot Message element (empty string) for UI streaming
        // NOTE: currentBotMessageElement is the <p> element inside the message div
        currentBotMessageElement = addMessage('', 'bot');
        
        // To handle Markdown properly during streaming, we will stream the raw text 
        // into a temporary element, then render it all to HTML once complete.
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

            const reader = response.body.getReader();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n\n').filter(line => line.trim() !== '');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const jsonStr = line.substring(6);
                            const data = JSON.parse(jsonStr);
                            
                            if (data.text) {
                                // Typewriter Logic (append raw text)
                                for (const char of data.text) {
                                    // *** FIX: Append character to textContent for streaming smoothness ***
                                    currentBotMessageElement.textContent += char;
                                    fullBotResponse += char;
                                    chatOutput.scrollTop = chatOutput.scrollHeight;
                                    await delay(TYPE_DELAY_MS);
                                }
                            }
                        } catch (e) {
                            console.error('Error parsing SSE data:', e, line);
                        }
                    } else if (line.startsWith('event: done')) {
                        break;
                    } else if (line.startsWith('event: error')) {
                         const errorData = JSON.parse(line.substring(6));
                         currentBotMessageElement.textContent += `[ERROR: ${errorData.error}]`;
                         fullBotResponse = 'ERROR: ' + errorData.error;
                         break;
                    }
                }
            }

            if (fullBotResponse) {
                // *** FIX: Render the final collected raw response as Markdown HTML ***
                currentBotMessageElement.innerHTML = renderMarkdown(fullBotResponse);
                chatOutput.scrollTop = chatOutput.scrollHeight; // Scroll one last time
                
                // Save the final, complete raw response (which contains Markdown) to local history
                saveMessageToSession(currentSessionId, fullBotResponse, 'bot');
            }

        } catch (error) {
            console.error('Error during streaming chat:', error);
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