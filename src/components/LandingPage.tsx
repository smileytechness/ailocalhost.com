import React from 'react';

interface LandingPageProps {
    onStartChat: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStartChat }) => {
    // Define the handleStartChat function
    const handleStartChat = () => {
        onStartChat(); // Call the passed in onStartChat prop
    };

    return (
        <main className="min-h-screen w-full">
            {/* Header */}
            <header className="bg-gray-800 shadow-md fixed top-0 w-full z-50">
                <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
                    <h1 className="text-2xl font-bold pl-1 sm:pl-2">
                        ai<span className="font-extrabold text-blue-400">local</span>host.com
                    </h1>
                    <div className="flex items-center space-x-2 sm:space-x-4">
                        <a 
                            href="https://github.com/smileytechness/ailocalhost.com"
                            className="hidden md:flex items-center px-3 py-2 bg-gray-700 hover:bg-gray-600 
                                     text-white font-semibold rounded-lg transition text-sm"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            GitHub
                        </a>
                        <a 
                            href="https://github.com/smileytechness/ailocalhost.com"
                            className="md:hidden px-2 text-gray-300 hover:text-white transition"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="View on GitHub"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                            </svg>
                        </a>
                        <button
                            onClick={handleStartChat}
                            className="px-2 sm:px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold 
                                     rounded-lg transition text-sm whitespace-nowrap min-w-[80px]"
                        >
                            Open Chat
                        </button>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-center pt-16">
                <div className="container mx-auto px-6">
                    <h1 className="text-4xl md:text-6xl font-extrabold mb-4">
                     One Interface. Any AI.
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-4xl mx-auto">
                    A single interface for every AI server. Prioritizing local-first privacy for AI enthusiasts.
                    </p>
                    <div className="text-gray-400 mb-12 flex flex-wrap justify-center gap-2 text-sm max-w-4xl mx-auto">
                        
                        <span className="font-bold">Transformers.js in-browser</span> •
                        <span className="font-bold">Ollama</span> •
                        <span className="font-bold">LM Studio</span> •
                        <span className="font-bold">Jan.ai</span> •
                        <span className="font-bold">vLLM</span> •
                        <span>OpenAI</span> •
                        <span>Anthropic</span> •
                        <span>Google</span> •
                        <span>Groq</span> •
                        <span>Amazon</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
                        <button
                            onClick={handleStartChat}
                            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold text-lg rounded-lg transition"
                        >
                            Start Chat Now
                        </button>
                        <a 
                            href="https://github.com/smileytechness/ailocalhost.com"
                            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold text-lg rounded-lg transition"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            View on GitHub
                        </a>
                    </div>
                    <div className="text-sm text-gray-400">
                        Developed in the USA by ITQIX Technology Group LLC
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-16 bg-gray-900">
                <div className="container mx-auto px-6">
                    <h2 className="text-3xl font-bold text-center mb-12">Current Features</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <FeatureCard
                            title="Universal Compatibility"
                            description="Connect to any LLM server using the OpenAI API protocol, whether local or cloud-based."
                        />
                        <FeatureCard
                            title="Modern Chat Interface"
                            description="Enjoy a sleek UI with auto-scrolling, markdown support, and syntax highlighting for code."
                        />
                        <FeatureCard
                            title="Quick Toggle"
                            description="Save and switch between different API configurations for quick access to your preferred servers."
                        />
                        <FeatureCard
                            title="Transformers.js in-browser"
                            description="Use transformers.js in-browser for locally run, low-latency inference of LLM models. Download models from Hugging Face or import your files."
                        />
                        <FeatureCard
                            title="Local Storage"
                            description="User data, including API keys and chat history, are saved to local storage on your device. "
                        />
                        <FeatureCard
                            title="Open Source"
                            description="Free to use, modify, and deploy on your own infrastructure. Available on GitHub."
                        />
                    </div>
                </div>
            </section>

            {/* Coming Soon Section */}
            <section className="py-16 bg-gray-800">
                <div className="container mx-auto px-6">
                    <h2 className="text-3xl font-bold text-center mb-12">Coming Soon</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <ComingSoonCard
                            title="Enhanced Chat Features"
                            features={[
                                "Import/export configs/history",
                                "Chat Session persistence",
                                "System message templates",
                                "Voice input/output"
                            ]}
                        />
                        <ComingSoonCard
                            title="Advanced Integration"
                            features={[
                                "Context/LangChain support",
                                "RAG connectors",
                                "Fine-tuning with Ollama",
                                "Offline mode/PWA support"
                            ]}
                        />
                        <ComingSoonCard
                            title="Collaborative Features"
                            features={[
                                "WebRTC connections",
                                "Video/audio chat",
                                "Screen sharing",
                                "Concurrent chat sessions"
                            ]}
                        />
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-700 py-6">
                <div className="container mx-auto px-6">
                    <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                        <p className="text-sm text-gray-400">© 2024 ailocalhost.com</p>
                        <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-4">
                            <a href="https://itqix.com" className="text-sm text-gray-400 hover:text-gray-300">
                                Developed by ITQIX Technology Group, LLC
                            </a>
                            <a href="https://brand-positive.com" className="text-sm text-gray-400 hover:text-gray-300">
                                Designed by Brand-Positive.com
                            </a>
                        </div>
                    </div>
                </div>
            </footer>
        </main>
    );
};

// New components for feature cards
const FeatureCard: React.FC<{ title: string; description: string }> = ({ title, description }) => (
    <div className="bg-gray-800 p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-bold mb-3">{title}</h3>
        <p className="text-gray-400">{description}</p>
    </div>
);

const ComingSoonCard: React.FC<{ title: string; features: string[] }> = ({ title, features }) => (
    <div className="bg-gray-700 p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-bold mb-3">{title}</h3>
        <ul className="space-y-2">
            {features.map((feature, index) => (
                <li key={index} className="text-gray-400 flex items-center">
                    <span className="mr-2">📌</span> {feature}
                </li>
            ))}
        </ul>
    </div>
);
export default LandingPage; 
