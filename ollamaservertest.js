// Create main chat container
const chatContainer = document.createElement('div');
chatContainer.id = 'chatContainer';
chatContainer.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 400px;
    height: 600px;
    background-color: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    display: flex;
    flex-direction: column;
    z-index: 1000;
    overflow: hidden;
`;

// Create header
const header = document.createElement('div');
header.style.cssText = `
    padding: 15px;
    background-color: #075e54;
    color: white;
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

const title = document.createElement('div');
title.innerText = 'AI Chat';
header.appendChild(title);

const headerButtons = document.createElement('div');
headerButtons.style.cssText = `
    display: flex;
    gap: 10px;
`;

const settingsBtn = document.createElement('button');
settingsBtn.innerHTML = '⚙️';
settingsBtn.style.cssText = `
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    font-size: 20px;
    transition: transform 0.2s;
    &:hover {
        transform: rotate(45deg);
    }
`;

const minimizeBtn = document.createElement('button');
minimizeBtn.innerHTML = '−';
minimizeBtn.style.cssText = `
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    font-size: 20px;
`;

headerButtons.appendChild(settingsBtn);
headerButtons.appendChild(minimizeBtn);
header.appendChild(headerButtons);

// Create messages container
const messagesContainer = document.createElement('div');
messagesContainer.style.cssText = `
    flex: 1;
    overflow-y: auto;
    padding: 15px;
    background-color: #e5ddd5;
`;

// Create input area
const inputArea = document.createElement('div');
inputArea.style.cssText = `
    padding: 15px;
    background-color: #f0f0f0;
    display: flex;
    gap: 10px;
`;

const textInput = document.createElement('input');
textInput.type = 'text';
textInput.placeholder = 'Type a message...';
textInput.style.cssText = `
    flex: 1;
    padding: 10px;
    border: none;
    border-radius: 20px;
    outline: none;
`;

const sendButton = document.createElement('button');
sendButton.innerHTML = '➤';
sendButton.style.cssText = `
    background: #075e54;
    border: none;
    color: white;
    padding: 10px 15px;
    border-radius: 50%;
    cursor: pointer;
    transition: background-color 0.2s;
    &:hover {
        background: #064940;
    }
`;

inputArea.appendChild(textInput);
inputArea.appendChild(sendButton);

// Create settings panel with modern UI
const settingsPanel = document.createElement('div');
settingsPanel.style.cssText = `
    position: absolute;
    top: 0;
    right: -300px;
    width: 300px;
    height: 100%;
    background-color: #ffffff;
    box-shadow: -2px 0 15px rgba(0,0,0,0.15);
    transition: right 0.3s ease;
    padding: 25px;
    overflow-y: auto;
`;

// Settings form with modern UI design
const settingsForm = document.createElement('form');
settingsForm.innerHTML = `
    <h3 style="
        color: #075e54;
        font-size: 1.5em;
        margin-bottom: 25px;
        border-bottom: 2px solid #075e54;
        padding-bottom: 10px;
    ">API Settings</h3>
    
    <div style="margin-bottom: 20px;">
        <label style="
            display: block;
            color: #333;
            margin-bottom: 8px;
            font-weight: 500;
        ">Server URL</label>
        <input type="text" id="serverUrl" value="http://172.16.101.133:11434/v1/chat/completions" style="
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 14px;
            transition: border-color 0.2s;
            &:focus {
                border-color: #075e54;
                outline: none;
            }
        ">
    </div>

    <div style="margin-bottom: 20px;">
        <label style="
            display: block;
            color: #333;
            margin-bottom: 8px;
            font-weight: 500;
        ">Model</label>
        <input type="text" id="model" value="qwen2.5" style="
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 14px;
            transition: border-color 0.2s;
            &:focus {
                border-color: #075e54;
                outline: none;
            }
        ">
    </div>

    <div style="margin-bottom: 20px;">
        <label style="
            display: block;
            color: #333;
            margin-bottom: 8px;
            font-weight: 500;
        ">Temperature</label>
        <div style="display: flex; align-items: center; gap: 10px;">
            <input type="range" id="temperature" min="0" max="1" step="0.1" value="0.7" style="
                flex: 1;
                accent-color: #075e54;
            ">
            <span id="temperatureValue" style="
                min-width: 40px;
                text-align: center;
                padding: 4px 8px;
                background: #f0f0f0;
                border-radius: 4px;
                font-size: 14px;
            ">0.7</span>
        </div>
    </div>

    <div style="margin-bottom: 20px;">
        <label style="
            display: block;
            color: #333;
            margin-bottom: 8px;
            font-weight: 500;
        ">Max Tokens</label>
        <input type="number" id="maxTokens" value="150" style="
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 14px;
            transition: border-color 0.2s;
            &:focus {
                border-color: #075e54;
                outline: none;
            }
        ">
    </div>

    <div style="margin-bottom: 20px;">
        <label style="
            display: block;
            color: #333;
            margin-bottom: 8px;
            font-weight: 500;
        ">Top P</label>
        <div style="display: flex; align-items: center; gap: 10px;">
            <input type="range" id="topP" min="0" max="1" step="0.1" value="0.9" style="
                flex: 1;
                accent-color: #075e54;
            ">
            <span id="topPValue" style="
                min-width: 40px;
                text-align: center;
                padding: 4px 8px;
                background: #f0f0f0;
                border-radius: 4px;
                font-size: 14px;
            ">0.9</span>
        </div>
    </div>

    <div style="margin-bottom: 20px;">
        <label style="
            display: block;
            color: #333;
            margin-bottom: 8px;
            font-weight: 500;
        ">Frequency Penalty</label>
        <div style="display: flex; align-items: center; gap: 10px;">
            <input type="range" id="freqPenalty" min="-2" max="2" step="0.1" value="0" style="
                flex: 1;
                accent-color: #075e54;
            ">
            <span id="freqPenaltyValue" style="
                min-width: 40px;
                text-align: center;
                padding: 4px 8px;
                background: #f0f0f0;
                border-radius: 4px;
                font-size: 14px;
            ">0</span>
        </div>
    </div>

    <div style="margin-bottom: 25px;">
        <label style="
            display: block;
            color: #333;
            margin-bottom: 8px;
            font-weight: 500;
        ">Presence Penalty</label>
        <div style="display: flex; align-items: center; gap: 10px;">
            <input type="range" id="presPenalty" min="-2" max="2" step="0.1" value="0" style="
                flex: 1;
                accent-color: #075e54;
            ">
            <span id="presPenaltyValue" style="
                min-width: 40px;
                text-align: center;
                padding: 4px 8px;
                background: #f0f0f0;
                border-radius: 4px;
                font-size: 14px;
            ">0</span>
        </div>
    </div>

    <button type="button" id="closeSettings" style="
        background: #075e54;
        color: white;
        border: none;
        padding: 12px;
        border-radius: 8px;
        cursor: pointer;
        width: 100%;
        font-size: 16px;
        font-weight: 500;
        transition: background-color 0.2s;
        &:hover {
            background: #064940;
        }
    ">Close Settings</button>
`;

settingsPanel.appendChild(settingsForm);

// Assemble the chat container
chatContainer.appendChild(header);
chatContainer.appendChild(messagesContainer);
chatContainer.appendChild(inputArea);
chatContainer.appendChild(settingsPanel);
document.body.appendChild(chatContainer);

// Minimize functionality
let isMinimized = false;
minimizeBtn.addEventListener('click', () => {
    if (isMinimized) {
        chatContainer.style.height = '600px';
        messagesContainer.style.display = 'block';
        inputArea.style.display = 'flex';
        minimizeBtn.innerHTML = '−';
    } else {
        chatContainer.style.height = '60px';
        messagesContainer.style.display = 'none';
        inputArea.style.display = 'none';
        minimizeBtn.innerHTML = '+';
    }
    isMinimized = !isMinimized;
});

// Settings panel toggle with close button functionality
let isSettingsOpen = false;
settingsBtn.addEventListener('click', () => {
    isSettingsOpen = !isSettingsOpen;
    settingsPanel.style.right = isSettingsOpen ? '0' : '-300px';
});

document.getElementById('closeSettings').addEventListener('click', () => {
    isSettingsOpen = false;
    settingsPanel.style.right = '-300px';
});

// Function to add message to chat
function addMessage(text, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
        max-width: 70%;
        margin: 10px;
        padding: 10px;
        border-radius: 10px;
        ${isUser ? 
            'background-color: #dcf8c6; margin-left: auto;' : 
            'background-color: white; margin-right: auto;'}
    `;
    messageDiv.textContent = text;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Handle sending messages
function sendMessage() {
    const message = textInput.value.trim();
    if (!message) return;

    // Add user message to chat
    addMessage(message, true);

    // Get all current settings
    const currentSettings = {
        url: document.getElementById('serverUrl').value,
        model: document.getElementById('model').value,
        temperature: parseFloat(document.getElementById('temperature').value),
        max_tokens: parseInt(document.getElementById('maxTokens').value),
        top_p: parseFloat(document.getElementById('topP').value),
        frequency_penalty: parseFloat(document.getElementById('freqPenalty').value),
        presence_penalty: parseFloat(document.getElementById('presPenalty').value)
    };

    // Prepare API request with all parameters
    const requestData = {
        model: currentSettings.model,
        messages: [{ role: "user", content: message }],
        max_tokens: currentSettings.max_tokens,
        temperature: currentSettings.temperature,
        top_p: currentSettings.top_p,
        frequency_penalty: currentSettings.frequency_penalty,
        presence_penalty: currentSettings.presence_penalty,
        stream: true
    };

    // Make API call
    fetch(currentSettings.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData)
    })
    .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let responseText = '';

        function readStream() {
            reader.read().then(({done, value}) => {
                if (done) return;

                const chunk = decoder.decode(value, {stream: true});
                const contentMatches = chunk.match(/"content":"(.*?)"/g);
                
                if (contentMatches) {
                    const content = contentMatches.map(match => 
                        match.replace(/"content":"(.*?)"/, '$1')).join(' ');
                    responseText += content;
                    
                    // Update existing message or add new one
                    const lastMessage = messagesContainer.lastElementChild;
                    if (lastMessage && !lastMessage.classList.contains('user-message')) {
                        lastMessage.textContent = responseText;
                    } else {
                        addMessage(responseText, false);
                    }
                }

                readStream();
            });
        }

        readStream();
    })
    .catch(error => {
        console.error("Error:", error);
        addMessage("Error: " + error.message, false);
    });

    textInput.value = '';
}

sendButton.addEventListener('click', sendMessage);
textInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Update all range input displays
['temperature', 'topP', 'freqPenalty', 'presPenalty'].forEach(id => {
    document.getElementById(id).addEventListener('input', (e) => {
        document.getElementById(`${id}Value`).textContent = e.target.value;
    });
});