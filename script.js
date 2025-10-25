document.addEventListener('DOMContentLoaded', () => {
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const chatOutput = document.getElementById('chat-output');

    // 1. Auto-resize Textarea based on content
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto'; // Reset height
        userInput.style.height = userInput.scrollHeight + 'px'; // Set new height
    });

    // 2. Handle sending a message
    const sendMessage = () => {
        const userText = userInput.value.trim();

        if (userText) {
            // Add User Message
            addMessage(userText, 'user');

            // Clear input and reset height
            userInput.value = '';
            userInput.style.height = 'auto';

            // Simulate Bot Response after a short delay
            setTimeout(() => {
                const botResponse = `I received your message: "${userText}". This is a simulated response in the ChatGPT visual clone.`;
                addMessage(botResponse, 'bot');
            }, 500);
        }
    };

    // Attach event listeners
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keydown', (e) => {
        // Allow Shift + Enter for new line, use Enter alone to send
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Prevent default new line
            sendMessage();
        }
    });

    // Function to create and add a message bubble
    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        
        // Use different classes for styling (ChatGPT uses a different background for bot messages)
        messageDiv.classList.add(sender === 'user' ? 'user-message' : 'system-message');
        
        // Add content (you'd typically add sender icon/name here too)
        const p = document.createElement('p');
        p.textContent = text;
        messageDiv.appendChild(p);

        chatOutput.appendChild(messageDiv);

        // Scroll to the bottom of the chat output
        chatOutput.scrollTop = chatOutput.scrollHeight;
    }
});