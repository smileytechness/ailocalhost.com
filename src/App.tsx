import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import OllamaChat from './components/OllamaChat';
import LandingPage from './components/LandingPage';

const App: React.FC = () => {
    const [showChat, setShowChat] = useState(false);

    return (
        <ThemeProvider>
            <div className="min-h-screen bg-gray-900 text-gray-200">
                {showChat ? (
                    <OllamaChat
                        onClose={() => setShowChat(false)}
                    />
                ) : (
                    <LandingPage onStartChat={() => setShowChat(true)} />
                )}
            </div>
        </ThemeProvider>
    );
};

export default App;
