// script.js (UPDATED)

document.addEventListener('DOMContentLoaded', () => {
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const chatOutput = document.getElementById('chat-output');

    // Function to create and add a message bubble
    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        messageDiv.classList.add(sender === 'user' ? 'user-message' : 'system-message');
        
        const p = document.createElement('p');
        p.textContent = text;
        messageDiv.appendChild(p);

        chatOutput.appendChild(messageDiv);

        // Scroll to the bottom of the chat output
        chatOutput.scrollTop = chatOutput.scrollHeight;
    }

    // 1. Auto-resize Textarea based on content
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto'; // Reset height
        userInput.style.height = userInput.scrollHeight + 'px'; // Set new height
    });

    // 2. Handle sending a message (UPDATED FOR EXPRESS SERVER)
    const sendMessage = async () => {
        const userText = userInput.value.trim();

        if (userText) {
            // Add User Message immediately
            addMessage(userText, 'user');

            // Clear input and reset height
            userInput.value = '';
            userInput.style.height = 'auto';
            
            // Disable input while waiting for response
            userInput.disabled = true;
            sendBtn.disabled = true;
            sendBtn.style.opacity = 0.5;

            try {
                // Send message to the Express server's /chat endpoint
                const response = await fetch('/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ message: userText })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                
                // Add Bot Response from Gemini API
                addMessage(data.text, 'bot');

            } catch (error) {
                console.error('Error communicating with server:', error);
                addMessage("🤖 Error: Could not reach the AI server.", 'system');
            } finally {
                // Re-enable input
                userInput.disabled = false;
                sendBtn.disabled = false;
                sendBtn.style.opacity = 1;
                userInput.focus();
            }
        }
    };

    // Attach event listeners
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
});