export interface APISettings {
    id?: string;
    name?: string;
    serverUrl: string;
    apiKey: string;
    model: string;
    temperature: number;
    maxTokens: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
}

export const parameterDescriptions = {
    temperature: "Controls randomness in responses. Higher values (0.8) make output more random, lower values (0.2) make it more focused.",
    maxTokens: "Maximum length of response in tokens (roughly 4 characters per token).",
    topP: "Controls diversity via nucleus sampling. Lower values (0.1) make output more focused.",
    frequencyPenalty: "Reduces repetition by lowering probability of words that have already appeared.",
    presencePenalty: "Encourages new topics by increasing probability of less-used words.",
    model: "The name of the model to use for generating responses.",
    apiKey: "Enter your API key for cloud provider (OpenAI, Anthropic, Google, Groq etc."
};

export const serverStatusDescriptions = {
    http: `**BROWSER ERROR**
    MIXED CONTENT error occurs when loading a secure webpage (HTTPS) that tries to access a non-secure server (HTTP).
    
    **How to fix:**
    1. Add your server URL to Chrome's security exceptions:
       \`chrome://flags/#unsafely-treat-insecure-origin-as-secure\`
    2. Restart Chrome after making this change`,
    
    lan: `**NETWORK ISSUE**
    No response from server. This checks if your computer can reach the Ollama server on your network.
    
    **How to fix:**
    1. For Ollama servers, set \`OLLAMA_HOST="0.0.0.0"\`
    2. On macOS, run: \`launchctl setenv OLLAMA_HOST "0.0.0.0"\`
    3. Restart Ollama`,
    
    cors: `**SERVER ISSUE**
    CORS (Cross-Origin Resource Sharing) blocks access. The server needs to allow this website.
    
    **How to fix:**
    Configure your Ollama server:
    - Set \`OLLAMA_ORIGINS\` to include this website's URL (https://ailocalhost.com)`
};
