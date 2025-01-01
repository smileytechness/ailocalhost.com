import React, { useState } from 'react';
import AppIframe from './AppIframe';
import Settings from './Settings';
import LogoIcon from './LogoIcon';
import { loadApps } from '../utils/localStorage';
import { App } from '../types/app';
import { Console } from './Console';
import OllamaChat from './OllamaChat';

export const HomeScreen: React.FC = () => {
    const [selectedApp, setSelectedApp] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [showConsole, setShowConsole] = useState(false);
    const [showOllamaChat, setShowOllamaChat] = useState(false);
    const apps = loadApps();

    const defaultApps: App[] = [
        { name: 'Settings', url: 'settings' },
        { name: 'Console', url: 'console' },
        { name: 'AI Chat', url: 'ollama-chat' },
        ...apps
    ];

    const handleAppClick = (url: string) => {
        if (url === 'settings') {
            setShowSettings(true);
        } else if (url === 'console') {
            setShowConsole(true);
        } else if (url === 'ollama-chat') {
            setShowOllamaChat(true);
        } else {
            setSelectedApp(url);
        }
    };

    const handleCloseIframe = () => {
        setSelectedApp(null);
        setShowSettings(false);
        setShowConsole(false);
        setShowOllamaChat(false);
    };

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 transition-all duration-300">
            {/* Decorative background elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br 
                               from-primary/5 to-neutral-200 dark:from-primary/10 dark:to-transparent blur-3xl" />
            </div>

            <div className="relative max-w-lg mx-auto px-4 py-8 md:max-w-2xl lg:max-w-4xl">
                <header className="flex items-center justify-between mb-12">
                    <div className="flex flex-col">
                        <h1 className="text-4xl font-bold text-neutral-900 dark:text-white">
                            iFrame OS
                        </h1>
                        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                            {new Date().toLocaleDateString(undefined, {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </p>
                    </div>
                </header>

                <div className="grid grid-cols-4 gap-x-4 gap-y-6 md:gap-6 lg:grid-cols-5">
                    {defaultApps.map((app, index) => (
                        <button
                            key={index}
                            onClick={() => handleAppClick(app.url)}
                            className="group relative flex flex-col items-center p-2
                                     hover:scale-105 transition-all duration-300 ease-out"
                        >
                            <LogoIcon
                                url={app.url}
                                name={app.name}
                                className="w-14 h-14 md:w-16 md:h-16 mb-2 shadow-lg group-hover:shadow-xl 
                                         transition-all duration-300"
                            />
                            <span className="text-xs md:text-sm font-medium text-neutral-600 
                                           dark:text-neutral-400 group-hover:text-neutral-900 
                                           dark:group-hover:text-white text-center max-w-full truncate px-1">
                                {app.name}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Modal Overlay */}
            {(selectedApp || showSettings || showConsole || showOllamaChat) && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-md z-40 animate-fade-in">
                    <div className={`fixed ${selectedApp ? 'inset-0' : 'inset-4 md:inset-12 lg:inset-16'} 
                                  bg-surface-light dark:bg-surface-dark backdrop-blur-xl 
                                  ${selectedApp ? '' : 'rounded-3xl'} 
                                  shadow-2xl overflow-hidden z-50 animate-slide-up`}>
                        {selectedApp && <AppIframe url={selectedApp} onClose={handleCloseIframe} />}
                        {showSettings && <Settings onClose={handleCloseIframe} />}
                        {showConsole && <Console onClose={handleCloseIframe} />}
                        {showOllamaChat && <OllamaChat 
                            onClose={handleCloseIframe} 
                        />}
                    </div>
                </div>
            )}
        </div>
    );
};

export default HomeScreen;
