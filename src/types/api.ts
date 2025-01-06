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
    timestamp?: string;
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
    http: `**Browser Security Issues**

Your browser is blocking the connection to the AI server for security reasons. This can happen in two ways:

**1. Blocked by Client**
What's happening:
Your browser is blocking access to localhost from a secure website (HTTPS). This happens because browsers restrict secure websites from accessing local resources for security.

How to fix:
• Use your computer's IP address instead of 'localhost'
• Or download the project from GitHub to run it locally

**2. Mixed Content Warning**
What's happening:
You're trying to access a non-secure server (HTTP) from a secure website (HTTPS). Browsers block this by default to protect users.

How to fix:
1. Open Chrome Settings:
   • Go to: \`chrome://flags/#unsafely-treat-insecure-origin-as-secure\`
2. Add your server's full address:
   • Example: \`http://192.168.1.100:11434\`
   • Make sure to include the port number
3. Enable the setting and restart Chrome`,
    
    lan: `**Network Connection Issues**

Your computer cannot reach the AI server. This usually shows up as one of these errors:
• \`net::ERR_CONNECTION_REFUSED\`
• \`net::ERR_ADDRESS_UNREACHABLE\`
• \`net::ERR_CONNECTION_TIMED_OUT\`
• \`404 Not Found\` (Wrong URL endpoint)

**Possible causes:**
• The server isn't configured to accept external connections
• The server isn't running
• The wrong URL or port is being used
• A firewall is blocking the connection
• The API endpoint path is incorrect (404)

**Check the server URL**

* Verify the server URL is correct:
    1. Cloud: \`https://api.____\` 
    2. Local:\`http://ipaddress:11434\`
* Verify the correct endpoint:
   1. \`/v1/chat/completions\`        (Ollama/OpenAI)
   2. \`/openai/v1/chat/completions\` (Groq)





**Ollama on the LAN**

Configure Ollama to be visible to the LAN:

Command line:
   \`export OLLAMA_HOST=0.0.0.0\`

For the Ollama app:
   \`launchctl setenv OLLAMA_HOST "0.0.0.0"\`
   (launchctl sets the default for the application outside the terminal)

**MAC OS Firewall**

Confirm your browser has access to the LAN:
   \`Settings>Privacy & Security>Local Network\``,
    
    cors: `**Server Access Issues**

There are two main types of server access problems:

**1. CORS (Cross-Origin Resource Sharing) Policy:**
What's happening:
The server is blocking requests from this website for security reasons. This is a safety feature that prevents unauthorized websites from accessing the server.

How to fix (for Ollama on Mac):

* Ollama command line:
\`export OLLAMA_ORIGINS=https://ailocalhost.com\`

* For the Ollama app:
\`launchctl setenv OLLAMA_ORIGINS="https://ailocalhost.com"\`
(launchctl sets the default for the application outside the terminal)

**2. Authentication Errors:**
The server rejected your request because of one of these issues:
• Missing API key (Error 401)
• Invalid API key (Error 401)
• Insufficient permissions (Error 403)

How to fix:
For cloud services (OpenAI, Anthropic, Groq, etc.):
• Verify you've entered your API key
• Check if the API key is valid
• Ensure your account has proper permissions

For local servers:
• Check if authentication is required
• Verify your authentication settings`
};
