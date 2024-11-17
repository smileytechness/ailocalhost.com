// Configuration
let API_BASE_URL = localStorage.getItem('API_BASE_URL') || 'http://localhost:11434'; // Default Ollama port

// UI Elements will be populated on load
let promptInput;
let modelSelect;
let submitButton;
let responseArea;
let serverInput;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Get UI elements
    promptInput = document.getElementById('prompt-input');
    modelSelect = document.getElementById('model-select');
    submitButton = document.getElementById('submit-button');
    responseArea = document.getElementById('response-area');
    serverInput = document.getElementById('server-input');

    // Set initial server URL value
    serverInput.value = API_BASE_URL;

    // Add event listeners
    submitButton.addEventListener('click', generateResponse);
    serverInput.addEventListener('change', updateServerUrl);
    
    // Load available models on startup
    loadAvailableModels();
});

// Update server URL when changed
function updateServerUrl() {
    API_BASE_URL = serverInput.value;
    localStorage.setItem('API_BASE_URL', API_BASE_URL);
    loadAvailableModels(); // Reload models from new server
}

// Fetch available models from Ollama
async function loadAvailableModels() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/tags`);
        const data = await response.json();
        
        // Clear existing options
        modelSelect.innerHTML = '';
        
        // Add models to select dropdown
        data.models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.name;
            option.textContent = model.name;
            modelSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading models:', error);
        responseArea.innerHTML = 'Error connecting to Ollama server. Please ensure it is running.';
    }
}

// Generate response from selected model
async function generateResponse() {
    const prompt = promptInput.value;
    const model = modelSelect.value;
    
    if (!prompt) {
        alert('Please enter a prompt');
        return;
    }

    submitButton.disabled = true;
    responseArea.innerHTML = 'Generating response...';

    try {
        // Use the chat endpoint instead of generate
        const response = await fetch(`${API_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                stream: false,
                options: {
                    temperature: 0.7,
                    num_ctx: 4096,
                    top_p: 0.9,
                    frequency_penalty: 0.0,
                    presence_penalty: 0.0
                }
            })
        });

        const data = await response.json();
        
        // Extract response from message content
        if (data.message && data.message.content) {
            responseArea.innerHTML = data.message.content;
        } else {
            throw new Error('Invalid response format');
        }

    } catch (error) {
        console.error('Error generating response:', error);
        responseArea.innerHTML = 'Error generating response. Please try again.';
    } finally {
        submitButton.disabled = false;
    }
}

// Add this to your index.html:
/*
<div class="chat-interface">
    <div class="server-config">
        <input 
            type="text" 
            id="server-input"
            placeholder="Server URL (e.g. http://localhost:11434)"
            class="server-input"
        />
    </div>

    <select id="model-select">
        <option value="">Loading models...</option>
    </select>
    
    <textarea 
        id="prompt-input"
        placeholder="Enter your prompt here..."
        rows="4"
    ></textarea>
    
    <button id="submit-button" class="action-button">
        Generate Response
    </button>
    
    <div id="response-area" class="response-container">
        Responses will appear here...
    </div>
</div>

Add these styles:
<style>
    .chat-interface {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        max-width: 800px;
        margin: 2rem auto;
        padding: 1rem;
    }
    
    #prompt-input {
        width: 100%;
        padding: 1rem;
        border: 1px solid #ccc;
        border-radius: 6px;
        font-family: inherit;
    }
    
    #model-select {
        padding: 0.5rem;
        border-radius: 6px;
    }
    
    .response-container {
        padding: 1rem;
        background: #f8f9fa;
        border-radius: 6px;
        min-height: 100px;
        white-space: pre-wrap;
    }

    .server-input {
        width: 100%;
        padding: 0.5rem;
        border: 1px solid #ccc;
        border-radius: 6px;
        font-family: inherit;
    }
</style>
*/
