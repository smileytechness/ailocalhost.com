import React from 'react';

interface LandingPageProps {
    onStartChat: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStartChat }) => {
    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="bg-gray-800 shadow-md fixed top-0 w-full z-50">
                <div className="container mx-auto px-6 py-4 flex items-center justify-between">
                    <h1 className="text-2xl font-bold">
                        ai<span className="text-blue-400">local</span>host.com
                    </h1>
                    <button
                        onClick={onStartChat}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition"
                    >
                        Open Chat
                    </button>
                </div>
            </header>

            {/* Hero Section */}
            <section className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-center pt-16">
                <div className="container mx-auto px-6">
                    <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
                        Chat With Your Locally Hosted AI
                    </h1>
                    <p className="text-lg md:text-xl text-gray-400 mb-6">
                        Instantly chat with your locally hosted LLM server. Experience an AI Chat interface on your own terms.
                        No downloads. No installs. No logins.
                    </p>
                    <button
                        onClick={onStartChat}
                        className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold text-lg rounded-lg transition"
                    >
                        Start Chat
                    </button>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-16 bg-gray-900">
                <div className="container mx-auto px-6">
                    <h2 className="text-3xl font-bold text-center mb-10">Why Choose Our AI Chat?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-gray-800 p-6 rounded-lg shadow-md text-center">
                            <h3 className="text-xl font-bold mb-2">Local First, No Internet Needed</h3>
                            <p className="text-gray-400">
                                Enjoy AI-powered interactions entirely on your local network. No need for an internet connection,
                                ensuring maximum privacy and speed.
                            </p>
                        </div>
                        <div className="bg-gray-800 p-6 rounded-lg shadow-md text-center">
                            <h3 className="text-xl font-bold mb-2">100% Privacy Focused</h3>
                            <p className="text-gray-400">
                                Keep your data secure—everything stays on your device. Our platform never requires accounts,
                                logins, or cloud storage.
                            </p>
                        </div>
                        <div className="bg-gray-800 p-6 rounded-lg shadow-md text-center">
                            <h3 className="text-xl font-bold mb-2">Fully Customizable API Completion</h3>
                            <p className="text-gray-400">
                                Control advanced settings like model choice, temperature, and more. Easily save your configurations
                                to optimize your AI experience.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-700 py-6">
                <div className="container mx-auto px-6 flex justify-between items-center">
                    <p className="text-sm text-gray-400">© 2024 ailocalhost.com</p>
                    <div className="flex space-x-4">
                        <a href="https://itqix.com" className="text-sm text-gray-400 hover:text-gray-300">
                            Developed by ITQIX Technology Group, LLC
                        </a>
                        <a href="https://brand-positive.com" className="text-sm text-gray-400 hover:text-gray-300">
                            Designed by Brand-Positive.com
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage; 
