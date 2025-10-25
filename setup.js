// script.js (FINALIZED with Remove All Chats)

document.addEventListener('DOMContentLoaded', () => {
    // --- Variable Declarations ---
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const chatOutput = document.getElementById('chat-output');
    const chatHistoryList = document.getElementById('chat-history');
    const newChatBtn = document.querySelector('.new-chat-btn');
    // NEW BUTTON DECLARATION:
    const removeAllChatsBtn = document.getElementById('remove-all-chats-btn'); 

    let currentSessionId = null;
    let chatData = {}; 
    let currentBotMessageElement = null; // Used for streaming

    // ... (All existing helper functions like addMessage, saveMessageToSession, renderChat, createHistoryItem remain the same) ...

    // --- LocalStorage Functions ---
    
    // ... (loadChatsFromStorage remains the same) ...

    function saveChatsToStorage() {
        localStorage.setItem('chatApp_chatData', JSON.stringify(chatData));
        if (currentSessionId) {
            localStorage.setItem('chatApp_currentSessionId', currentSessionId);
        }
    }
    
    // --- NEW: Remove All Chats Handler ---
    const handleRemoveAllChats = () => {
        if (!confirm("Are you sure you want to remove all chat history? This cannot be undone.")) {
            return;
        }

        // 1. Clear LocalStorage keys
        localStorage.removeItem('chatApp_chatData');
        localStorage.removeItem('chatApp_currentSessionId');
        
        // 2. Clear in-memory state
        chatData = {};
        currentSessionId = null;
        
        // 3. Clear UI
        chatHistoryList.innerHTML = '';
        chatOutput.innerHTML = '';
        
        console.log("All chat history removed.");
        alert("All chat history has been cleared.");

        // 4. Start a new, fresh chat session
        startNewChat();
    };


    // ... (The rest of the Core Logic (startNewChat, sendMessage) remains the same) ...


    // --- Initialization ---

    newChatBtn.addEventListener('click', startNewChat);
    sendBtn.addEventListener('click', sendMessage);
    // NEW: Add listener for the remove button
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