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
                <div className="container mx-auto px-6 py-4 flex items-center justify-between">
                    <h1 className="text-2xl font-bold">
                        ai<span className="font-extrabold text-blue-400">local</span>host.com
                    </h1>
                    <div className="flex items-center gap-3">
                        <a 
                            href="https://github.com/smileytechness/ailocalhost.com"
                            className="text-gray-300 hover:text-white transition text-sm whitespace-nowrap"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            GitHub
                        </a>
                        <button
                            onClick={handleStartChat}
                            className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition text-sm whitespace-nowrap"
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
                        Chat With Your AI Server
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-4xl mx-auto">
                        One interface for all your AI servers. Local or Cloud.
                    </p>
                    <div className="text-gray-400 mb-12 flex flex-wrap justify-center gap-2 text-sm max-w-4xl mx-auto">
                        <span className="text-gray-300">Works with:</span>&nbsp;
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
                    <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-8">
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
                            title="Multiple Configurations"
                            description="Save and switch between different API configurations for quick access to your preferred servers."
                        />
                        <FeatureCard
                            title="Easy Connection"
                            description="Simple status checks and clear resolution steps for HTTP, LAN, and CORS issues."
                        />
                        <FeatureCard
                            title="Cloud Provider Support"
                            description="Built-in support for API keys and authentication with major cloud providers."
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
                                "Chat history import/export",
                                "Session persistence",
                                "System message templates",
                                "Voice input/output"
                            ]}
                        />
                        <ComingSoonCard
                            title="Advanced Integration"
                            features={[
                                "Context/LangChain support",
                                "RAG connectors",
                                "Simplified fine-tuning",
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
