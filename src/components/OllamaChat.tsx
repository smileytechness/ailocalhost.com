import React, { useState, useEffect, useRef } from 'react';
import APISettingsPanel from './OllamaChat/APISettings';
import { APISettings } from '../types/api';
import { loadSavedConfigs, getLastUsedConfig, setLastUsedConfig } from '../utils/configStorage';
import { FiChevronDown, FiMinus, FiX } from 'react-icons/fi';
import MessageBubble from './OllamaChat/MessageBubble';
import StatusIndicator from './OllamaChat/StatusIndicator';

interface OllamaChatProps {
    onClose: () => void;
    onMinimize: () => void;
}

const getDisplayUrl = (url: string): string => {
    try {
        const parsedUrl = new URL(url);
        return parsedUrl.hostname;
    } catch (e) {
        return url.replace(/^https?:\/\//, '') || 'Configure Server';
    }
};

const OllamaChat: React.FC<OllamaChatProps> = ({ onClose, onMinimize }) => {
    const [apiSettings, setApiSettings] = useState<APISettings>(() => {
        const lastUsed = getLastUsedConfig();
        return lastUsed || {
            serverUrl: 'http://localhost:11434/v1/chat/completions',
            model: '',
            apiKey: '',
            temperature: 1.0,
            maxTokens: 500,
            topP: 1.0,
            frequencyPenalty: 0,
            presencePenalty: 0
        };
    });

    const [messages, setMessages] = useState<Array<{ content: string; isUser: boolean }>>([]);
    const [input, setInput] = useState('');
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);
    const [serverStatus, setServerStatus] = useState<'success' | 'error' | 'loading' | 'unchecked'>('unchecked');
    const [autoScroll, setAutoScroll] = useState(true);
    const [wasScrollAtBottom, setWasScrollAtBottom] = useState(true);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isConfigDropdownOpen, setIsConfigDropdownOpen] = useState(false);
    const [savedConfigs, setSavedConfigs] = useState<APISettings[]>([]);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [runImmediateCheck, setRunImmediateCheck] = useState(true);

    useEffect(() => {
        setSavedConfigs(loadSavedConfigs());
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsConfigDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const scrollContainer = messagesContainerRef.current;
        if (scrollContainer) {
            const handleScroll = () => {
                const atBottom = scrollContainer.scrollTop + scrollContainer.offsetHeight === scrollContainer.scrollHeight;
                if (!atBottom && wasScrollAtBottom) {
                    setWasScrollAtBottom(false);
                }
                if (atBottom) {
                    setWasScrollAtBottom(true);
                }
            };
            scrollContainer.addEventListener('scroll', handleScroll);
            return () => scrollContainer.removeEventListener('scroll', handleScroll);
        }
    }, [messagesContainerRef, wasScrollAtBottom]);

    useEffect(() => {
        if (autoScroll && wasScrollAtBottom && messagesContainerRef.current) {
            requestAnimationFrame(() => {
                if (messagesContainerRef.current) {
                    messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
                }
            });
        }
    }, [messages, autoScroll, wasScrollAtBottom]);

    useEffect(() => {
        if (messages.length > 0 && messages[messages.length - 1].isUser) {
            setAutoScroll(true);
            setWasScrollAtBottom(true);
        }
    }, [messages]);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (!mobile) {
                setIsSettingsExpanded(true);
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (runImmediateCheck) {
            setRunImmediateCheck(false);
        }
    }, [runImmediateCheck]);

    const handleSendMessage = async () => {
        if (!input.trim()) return;

        setAutoScroll(true);
        setWasScrollAtBottom(true);

        setMessages(prev => [...prev, { content: input, isUser: true }]);
        const userMessage = input;
        setInput('');

        try {
            const response = await fetch(apiSettings.serverUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiSettings.apiKey}`
                },
                body: JSON.stringify({
                    model: apiSettings.model,
                    messages: [{ role: "user", content: userMessage }],
                    max_tokens: apiSettings.maxTokens,
                    temperature: apiSettings.temperature,
                    top_p: apiSettings.topP,
                    frequency_penalty: apiSettings.frequencyPenalty,
                    presence_penalty: apiSettings.presencePenalty,
                    stream: true
                })
            });

            if (!response.ok) {
                throw new Error(`Error! status: ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No reader available');

            let currentMessage = '';
            let isFirstChunk = true;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = new TextDecoder().decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.trim() === '' || line === 'data: [DONE]') continue;

                    try {
                        const parsed = JSON.parse(line.replace('data: ', ''));
                        if (parsed.choices?.[0]?.delta?.content) {
                            currentMessage += parsed.choices[0].delta.content;
                            
                            setMessages(prev => {
                                const newMessages = [...prev];
                                const lastMessage = newMessages[newMessages.length - 1];

                                if (!lastMessage || lastMessage.isUser) {
                                    if (isFirstChunk) {
                                        setAutoScroll(true);
                                        setWasScrollAtBottom(true);
                                        isFirstChunk = false;
                                    }
                                    newMessages.push({ content: currentMessage, isUser: false });
                                } else {
                                    newMessages[newMessages.length - 1] = {
                                        content: currentMessage,
                                        isUser: false
                                    };
                                }

                                return newMessages;
                            });
                        }
                    } catch (e) {
                        console.error('Error parsing chunk:', e);
                    }
                }
            }
        } catch (error) {
            console.error('Error sending message:', error);
            setMessages(prev => [...prev, {
                content: 'Error: Failed to get response from server',
                isUser: false
            }]);
        }
    };

    const handleApiSettingsChange = (newSettings: APISettings) => {
        setApiSettings(newSettings);
        setLastUsedConfig(newSettings);
    };

    return (
        <div className="fixed inset-0 bg-gray-900 flex flex-col">
            <div className="flex-none border-b border-gray-700">
                <div className="flex items-center justify-between p-4">
                    <div className="flex items-center space-x-4">
                        <h1 className="text-xl font-semibold">AI Chat</h1>
                        <div className={`flex items-center space-x-2 px-3 py-1.5 text-sm 
                                     bg-gray-800 rounded-full hover:bg-gray-700
                                     ${isMobile ? 'cursor-pointer' : 'cursor-default'}`}
                             onClick={(e) => {
                                 if (!dropdownRef.current?.contains(e.target as Node)) {
                                     isMobile && setIsSettingsExpanded(true);
                                 }
                             }}
                        >
                            <span className="truncate max-w-[150px]">
                                {getDisplayUrl(apiSettings.serverUrl)}
                            </span>
                            <StatusIndicator status={serverStatus} />
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsConfigDropdownOpen(!isConfigDropdownOpen);
                                    }}
                                    className="flex items-center space-x-1 p-1 hover:bg-gray-700 rounded-full"
                                >
                                    <FiChevronDown className="w-4 h-4" />
                                </button>
                                {isConfigDropdownOpen && (
                                    <div style={{ right: 'max(16px, calc(100vw - 400px))' }}
                                         className="fixed top-[60px] w-64 
                                                  bg-gray-900 rounded-lg shadow-lg border border-gray-700 
                                                  z-50 max-h-96 overflow-y-auto">
                                        <div className="p-2 space-y-1">
                                            {savedConfigs.map((config, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => {
                                                        handleApiSettingsChange(config);
                                                        setRunImmediateCheck(true);
                                                        setIsConfigDropdownOpen(false);
                                                    }}
                                                    className="w-full text-left px-3 py-2 rounded 
                                                             bg-gray-800 hover:bg-gray-700 text-sm text-gray-200"
                                                >
                                                    <div className="truncate">
                                                        {config.serverUrl}
                                                    </div>
                                                    <div className="text-xs text-gray-400 truncate">
                                                        {config.model || 'No model selected'}
                                                    </div>
                                                </button>
                                            ))}
                                            {savedConfigs.length === 0 && (
                                                <div className="px-3 py-2 text-sm text-gray-400">
                                                    Your saved API configurations will display here for quick toggle between servers.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center">
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-800 rounded-full"
                        >
                            <FiX className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 flex flex-col min-w-0">
                    <div
                        ref={messagesContainerRef}
                        className="flex-1 overflow-y-auto p-4"
                    >
                        <div className="max-w-3xl mx-auto space-y-4">
                            {messages.map((message, index) => (
                                <MessageBubble key={index} message={message} />
                            ))}
                        </div>
                    </div>

                    <div className="flex-none border-t border-gray-700">
                        <div className="max-w-3xl mx-auto p-4">
                            <div className="flex items-center space-x-2">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                    placeholder="Type a message..."
                                    className="flex-1 p-2 bg-gray-800 border border-gray-700 
                                             rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    onClick={handleSendMessage}
                                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 
                                             text-white rounded-lg whitespace-nowrap"
                                >
                                    Send
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="hidden md:block w-96 border-l border-gray-700 flex-none">
                    <APISettingsPanel
                        settings={apiSettings}
                        onSettingsChange={handleApiSettingsChange}
                        isExpanded={true}
                        onExpandedChange={() => {}}
                        onStatusUpdate={setServerStatus}
                        runImmediateCheck={runImmediateCheck}
                    />
                </div>

                {isMobile && (
                    <div className={`fixed inset-0 md:hidden transition-opacity duration-300
                                   ${isSettingsExpanded ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                        <div className="absolute inset-0 bg-gray-900/50" />
                        <div className={`absolute inset-y-0 right-0 w-full max-w-md bg-gray-900 
                                       transform transition-transform duration-300
                                       ${isSettingsExpanded ? 'translate-x-0' : 'translate-x-full'}`}>
                            <APISettingsPanel
                                settings={apiSettings}
                                onSettingsChange={handleApiSettingsChange}
                                isExpanded={isSettingsExpanded}
                                onExpandedChange={setIsSettingsExpanded}
                                onStatusUpdate={setServerStatus}
                                runImmediateCheck={runImmediateCheck}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OllamaChat; 
