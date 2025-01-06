import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import APISettingsPanel from './OllamaChat/APISettings';
import { APISettings } from '../types/api';
import { loadSavedConfigs, getLastUsedConfig, setLastUsedConfig } from '../utils/configStorage';
import { FiChevronDown, FiX, FiClock, FiTrash2 } from 'react-icons/fi';
import { FiSettings } from 'react-icons/fi';
import MessageBubble from './OllamaChat/MessageBubble';
import StatusIndicator from './OllamaChat/StatusIndicator';

interface OllamaChatProps {
    onClose: () => void;
}

const getDisplayUrl = (url: string): string => {
    try {
        const parsedUrl = new URL(url);
        return parsedUrl.hostname;
    } catch (e) {
        return url.replace(/^https?:\/\//, '') || 'Configure Server';
    }
};

const OllamaChat: React.FC<OllamaChatProps> = ({ onClose }) => {
    const [apiSettings, setApiSettings] = useState<APISettings>(() => {
        const lastUsed = getLastUsedConfig();
        return lastUsed || {
            serverUrl: 'http://localhost:11434/v1/chat/completions',
            model: 'llama3.2',
            apiKey: '',
            temperature: 0.2,
            maxTokens: 500,
            topP: 0.5,
            frequencyPenalty: 0,
            presencePenalty: 0
        };
    });

    const [messages, setMessages] = useState<Array<{
        content: string;
        isUser: boolean;
        timestamp: Date;
        apiSettings?: {
            serverUrl: string;
            model: string;
            temperature: number;
            topP: number;
        };
    }>>([]);
    const [input, setInput] = useState('');
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);
    const [serverStatus, setServerStatus] = useState<'success' | 'error' | 'loading' | 'unchecked'>('unchecked');
    const [autoScroll, setAutoScroll] = useState(true);
    const [wasScrollAtBottom, setWasScrollAtBottom] = useState(true);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isConfigDropdownOpen, setIsConfigDropdownOpen] = useState(false);
    const [savedConfigs, setSavedConfigs] = useState<APISettings[]>([]);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [runImmediateCheck, setRunImmediateCheck] = useState(true);
    const [isHistoryDropdownOpen, setIsHistoryDropdownOpen] = useState(false);
    const historyDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setSavedConfigs(loadSavedConfigs());
        
        const handleConfigUpdate = () => {
            setSavedConfigs(loadSavedConfigs());
        };
        
        window.addEventListener('savedConfigsUpdated', handleConfigUpdate);
        return () => {
            window.removeEventListener('savedConfigsUpdated', handleConfigUpdate);
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (historyDropdownRef.current && !historyDropdownRef.current.contains(event.target as Node)) {
                setIsHistoryDropdownOpen(false);
            }
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
            if (!mobile && isSettingsExpanded) {
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

    const adjustTextareaHeight = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
        }
    };

    useEffect(() => {
        adjustTextareaHeight();
    }, [input]);

    const handleSendMessage = async () => {
        if (!input.trim()) return;

        setAutoScroll(true);
        setWasScrollAtBottom(true);

        if (textareaRef.current) {
            textareaRef.current.style.height = '42px';
        }

        setMessages(prev => [...prev, {
            content: input,
            isUser: true,
            timestamp: new Date(),
            apiSettings: {
                serverUrl: apiSettings.serverUrl,
                model: apiSettings.model,
                temperature: apiSettings.temperature,
                topP: apiSettings.topP
            }
        }]);
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
                                    newMessages.push({
                                        content: currentMessage,
                                        isUser: false,
                                        timestamp: new Date()
                                    });
                                } else {
                                    newMessages[newMessages.length - 1] = {
                                        content: currentMessage,
                                        isUser: false,
                                        timestamp: lastMessage.timestamp
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
                isUser: false,
                timestamp: new Date()
            }]);
        }
    };

    const handleApiSettingsChange = (newSettings: APISettings) => {
        setApiSettings(newSettings);
        setLastUsedConfig(newSettings);
    };

    // Memoize messages to prevent unnecessary re-renders
    const messageElements = useMemo(() => (
        messages.map((message, index) => (
            <MessageBubble key={`${index}-${message.timestamp.getTime()}`} message={message} />
        ))
    ), [messages]);

    // Debounce input changes to prevent excessive re-renders
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
    }, []);

    // Optimize message container scroll handling
    const handleScroll = useCallback(() => {
        if (!messagesContainerRef.current) return;
        
        const { scrollTop, offsetHeight, scrollHeight } = messagesContainerRef.current;
        const atBottom = Math.abs((scrollTop + offsetHeight) - scrollHeight) < 10;
        
        if (!atBottom && wasScrollAtBottom) {
            setWasScrollAtBottom(false);
        }
        if (atBottom) {
            setWasScrollAtBottom(true);
        }
    }, [wasScrollAtBottom]);

    useEffect(() => {
        const scrollContainer = messagesContainerRef.current;
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', handleScroll);
            return () => scrollContainer.removeEventListener('scroll', handleScroll);
        }
    }, [handleScroll]);

    return (
        <div className="fixed inset-0 bg-gray-900 flex flex-col font-chat">
            <div className="flex-none border-b border-gray-700">
                <div className="flex items-center justify-between p-4">
                    <div className="flex items-center space-x-4">
                        <h1 className="text-xl font-semibold">Chat</h1>
                        <div className={`flex items-center space-x-2 px-3 py-1.5 text-sm 
                                     bg-gray-800 rounded-full hover:bg-gray-700
                                     cursor-pointer`}
                             onClick={(e) => {
                                 if (!dropdownRef.current?.contains(e.target as Node)) {
                                     setIsSettingsExpanded(!isSettingsExpanded);
                                 }
                             }}
                        >
                              <FiSettings className="w-4 h-4" /> {/* Added settings icon here */}
  
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
                                        <div className="p-2">
                                            <div className="text-sm font-medium text-gray-200 px-2 py-1 mb-1">
                                                Saved Configurations
                                            </div>
                                            <div className="space-y-1">
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
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="relative" ref={historyDropdownRef}>
                            <button
                                onClick={() => setIsHistoryDropdownOpen(!isHistoryDropdownOpen)}
                                className="flex items-center space-x-1 px-3.5 py-2 bg-gray-800 hover:bg-gray-700 rounded-full"
                                title="Chat History"
                            >
                                <FiClock className="w-4.5 h-4.5" />
                            </button>
                            {isHistoryDropdownOpen && (
                                <div style={{ right: 'max(16px, calc(100vw - 400px))' }}
                                     className="fixed top-[60px] w-64 
                                              bg-gray-900 rounded-lg shadow-lg border border-gray-700 
                                              z-50 max-h-96 overflow-y-auto">
                                    <div className="p-2">
                                        <div className="text-sm font-medium text-gray-200 px-2 py-1 mb-1">
                                            Chat History
                                        </div>
                                        <div className="px-2 space-y-1">
                                            <div className="group relative rounded bg-gray-800 hover:bg-gray-700 transition-colors">
                                                <div 
                                                    className="w-full text-left p-2 cursor-pointer"
                                                    onClick={() => {
                                                        // Handle chat selection here
                                                        console.log('Chat selected');
                                                    }}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm text-gray-200 font-medium truncate">
                                                                Example Chat Session (Mock)
                                                            </div>
                                                            <div className="flex items-center text-xs text-gray-400 space-x-2">
                                                                <span>Just now</span>
                                                                <span className="opacity-50">•</span>
                                                                <span className="font-mono opacity-50">mock_123</span>
                                                            </div>
                                                        </div>
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                console.log('Delete clicked');
                                                            }}
                                                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-600 rounded transition-opacity"
                                                            title="Delete chat"
                                                        >
                                                            <FiTrash2 className="w-4 h-4 text-gray-400 hover:text-gray-200" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-2 mx-2 p-2 text-xs bg-yellow-500/10 border border-yellow-500/20 rounded">
                                            <div className="font-medium text-yellow-200">Under Construction</div>
                                            <div className="mt-1 text-yellow-100/70">
                                                Chat history functionality is currently being implemented. You'll be able to save, view, and manage your chat sessions here.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
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
                <div className={`flex-1 flex flex-col min-w-0 transition-[padding-right] duration-300 ease-in-out ${isSettingsExpanded ? 'md:pr-96' : ''}`}>
                    <div
                        ref={messagesContainerRef}
                        className="flex-1 overflow-y-auto p-4 pb-24 overscroll-y-contain"
                    >
                        <div className="max-w-3xl mx-auto space-y-4">
                            {messages.length === 0 ? (
                                <div className="h-full flex items-center justify-center min-h-[80vh]">
                                    <div className="max-w-lg w-full text-left space-y-6 text-gray-600">
                                        <div className="text-sm text-gray-500">
                                            Start chatting with AI. Enter your AI server URL to get started.
                                        </div>
                                        
                                        <div className="space-y-2">
                                        <div className="text-sm">
                                                Looking to setup your own AI server?
                                            </div>
                                            <div className="text-sm">
                                                Install Ollama to get started with your very own locally hosted AI.
                                            </div>
                                            <div className="text-sm space-y-1">
                                                <div>1. Install Ollama - <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" className="text-blue-400/80 hover:text-blue-300/80">click here to download</a></div>
                                                <div>2. Open a terminal and run: <code className="bg-gray-800/50 px-1.5 py-0.5 rounded text-gray-400 text-xs">ollama pull llama3.2</code></div>
                                                <div>3. Set: <code className="bg-gray-800/50 px-1.5 py-0.5 rounded text-gray-400 text-xs">export OLLAMA_HOST=0.0.0.0</code> and: <code className="bg-gray-800/50 px-1.5 py-0.5 rounded text-gray-400 text-xs">export OLLAMA_ORIGINS=https://ailocalhost.com</code></div>
                                                <div>4. Find your device IP address and start Ollama: <code className="bg-gray-800/50 px-1.5 py-0.5 rounded text-gray-400 text-xs">ollama serve</code></div>
                                            </div>
                                        </div>

                                        <div className="text-sm">
                                            <div>
                                            You're all set! Open the API settings (next to the drop down above) and enter your host IP address into Server URL like this: <code className="bg-gray-800/50 px-1.5 py-0.5 rounded text-gray-400 text-xs">http://yourip:11434/v1/chat/completions</code>
                                           </div>
                                           <br></br>
                                            <div className="mt-1 text-xs">
                                                See the server status helpers in the API settings console for advanced troubleshooting.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : messageElements}
                        </div>
                    </div>

                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-900 via-gray-900 to-transparent pb-6">
                        <div className="max-w-3xl mx-auto">
                            <div className="flex items-center space-x-2">
                                <textarea
                                    ref={textareaRef}
                                    value={input}
                                    onChange={handleInputChange}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                    placeholder="Type a message..."
                                    rows={1}
                                    style={{
                                        minHeight: '36px',
                                        maxHeight: '200px',
                                        height: 'auto',
                                        resize: 'none'
                                    }}
                                    className="flex-1 p-2 text-sm bg-gray-800 border border-gray-700 
                                             rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                             overscroll-y-contain"
                                />
                                <button
                                    onClick={handleSendMessage}
                                    className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 
                                             text-white text-sm rounded-lg whitespace-nowrap"
                                >
                                    Send
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={`hidden md:block border-l border-gray-700 flex-none fixed right-0 top-[73px] bottom-0 w-96 transform transition-transform duration-300 ease-in-out ${isSettingsExpanded ? 'translate-x-0' : 'translate-x-full'} bg-gray-900`}>
                    <APISettingsPanel
                        settings={apiSettings}
                        onSettingsChange={handleApiSettingsChange}
                        onExpandedChange={setIsSettingsExpanded}
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
