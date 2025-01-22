import React, { useState, useEffect, useRef, useCallback } from 'react';
import APISettingsPanel from './OllamaChat/APISettings';
import { APISettings } from '../types/api';
import { loadSavedConfigs, getLastUsedConfig, setLastUsedConfig } from '../utils/configStorage';
import { FiChevronDown, FiX, FiClock, FiTrash2, FiEdit, FiChevronLeft, FiChevronRight, FiMessageSquare, FiMoreHorizontal, FiSend } from 'react-icons/fi';
import { FiSettings } from 'react-icons/fi';
import MessageBubble from './OllamaChat/MessageBubble';
import StatusIndicator from './OllamaChat/StatusIndicator';
import { ChatMessage, ChatSession, createNewSession, updateSession, getChatSessions, deleteChatSession, loadSession, clearAllChatSessions, getAutoSavePreference, setAutoSavePreference } from '../utils/chatStorage';
import { Switch } from '../components/ui/Switch';
import EnhancedInput from './OllamaChat/EnhancedInput';
import ImportedFiles from './OllamaChat/ImportedFiles';
import { ImportedFile } from '../utils/fileStorage';
import ThinkBubble from './OllamaChat/ThinkBubble';

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
            temperature: 1.2,
            maxTokens: 8000,
            topP: 1.0,
            frequencyPenalty: 0,
            presencePenalty: 0
        };
    });

    const [messages, setMessages] = useState<ChatMessage[]>([]);
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
    const [isChatServicesOpen, setIsChatServicesOpen] = useState(false);
    const historyDropdownRef = useRef<HTMLDivElement>(null);
    const chatServicesRef = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState('history');
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [autoSave, setAutoSave] = useState(getAutoSavePreference());
    const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
    const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
    const [showSavePrompt, setShowSavePrompt] = useState(false);
    const [pendingAction, setPendingAction] = useState<{
        type: 'new_chat' | 'load_chat';
        sessionId?: string;
    } | null>(null);
    const [activeSlide, setActiveSlide] = useState(0);
    const totalSlides = 2;
    const [isToolsExpanded, setIsToolsExpanded] = useState(false);
    const toolsRef = useRef<HTMLDivElement>(null);
    const [sendChatContext, setSendChatContext] = useState(true);

    const nextSlide = () => setActiveSlide((prev) => (prev + 1) % totalSlides);
    const prevSlide = () => setActiveSlide((prev) => (prev - 1 + totalSlides) % totalSlides);

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
            if (chatServicesRef.current && !chatServicesRef.current.contains(event.target as Node)) {
                setIsChatServicesOpen(false);
            }
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsConfigDropdownOpen(false);
            }
            if (toolsRef.current && !toolsRef.current.contains(event.target as Node)) {
                setIsToolsExpanded(false);
                setIsHistoryDropdownOpen(false);
                setIsChatServicesOpen(false);
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

    const formatChatHistoryForContext = (messages: ChatMessage[]): string => {
        return messages.map(msg => {
            const timestamp = msg.timestamp.toLocaleString();
            const role = msg.isUser ? "User:" : "Your response:";
            return `[${timestamp}] ${role}: ${msg.content}`;
        }).join('\n');
    };

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
            let messageContent = userMessage;
            
            // Append chat history if sendChatContext is enabled
            if (sendChatContext && messages.length > 0) {
                const chatHistory = formatChatHistoryForContext(messages);
                messageContent = `${messageContent}\n\nCONTEXT:\n\n${chatHistory}`;
            }

            const response = await fetch(apiSettings.serverUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiSettings.apiKey}`
                },
                body: JSON.stringify({
                    model: apiSettings.model,
                    messages: [{ role: "user", content: messageContent }],
                    max_tokens: apiSettings.maxTokens,
                    temperature: apiSettings.temperature,
                    top_p: apiSettings.topP,
                    frequency_penalty: apiSettings.frequencyPenalty,
                    presence_penalty: apiSettings.presencePenalty,
                    stream: true
                })
            });

            if (!response.ok) {
                if (response.status === 413) {
                    throw new Error('Error 413: The message payload was too large. This usually means either the chat session history is too big or the max tokens setting is too small for the full context of the message.');
                }
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
                content: error instanceof Error ? error.message : 'Error: Failed to get response from server',
                isUser: false,
                isError: true,
                timestamp: new Date()
            }]);
        }
    };

    const handleApiSettingsChange = (newSettings: APISettings) => {
        setApiSettings(newSettings);
        setLastUsedConfig(newSettings);
    };

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

    useEffect(() => {
        setChatSessions(getChatSessions());
        
        const handleSessionUpdate = () => {
            setChatSessions(getChatSessions());
        };
        
        window.addEventListener('chatSessionsUpdated', handleSessionUpdate);
        return () => {
            window.removeEventListener('chatSessionsUpdated', handleSessionUpdate);
        };
    }, []);

    const startNewChat = () => {
        setMessages([]);
        setCurrentSessionId(null);
    };

    const saveCurrentSession = () => {
        if (messages.length === 0) return;
        
        if (!currentSessionId) {
            const newSession = createNewSession(messages[0]);
            setCurrentSessionId(newSession.id);
            updateSession(newSession.id, messages);
        } else {
            updateSession(currentSessionId, messages);
        }
    };

    const loadChatSession = (sessionId: string) => {
        const session = loadSession(sessionId);
        if (session) {
            setMessages(session.messages);
            setCurrentSessionId(session.id);
            setIsHistoryDropdownOpen(false);
        }
    };

    useEffect(() => {
        if (autoSave && messages.length > 0) {
            saveCurrentSession();
        }
    }, [messages, autoSave]);

    const handleAutoSaveChange = (enabled: boolean) => {
        setAutoSave(enabled);
        setAutoSavePreference(enabled);
    };

    const handleNewChat = () => {
        if (!autoSave && messages.length > 0) {
            setPendingAction({ type: 'new_chat' });
            setShowSavePrompt(true);
        } else {
            startNewChat();
        }
    };

    const handleLoadSession = (sessionId: string) => {
        if (!autoSave && messages.length > 0) {
            setPendingAction({ type: 'load_chat', sessionId });
            setShowSavePrompt(true);
        } else {
            loadChatSession(sessionId);
        }
    };

    const handleSavePromptAction = (shouldSave: boolean) => {
        if (shouldSave) {
            saveCurrentSession();
        }
        
        if (pendingAction?.type === 'new_chat') {
            startNewChat();
        } else if (pendingAction?.type === 'load_chat' && pendingAction.sessionId) {
            loadChatSession(pendingAction.sessionId);
        }
        
        setShowSavePrompt(false);
        setPendingAction(null);
    };

    const handleAppendFileToChat = (file: ImportedFile) => {
        const fileInfo = `[File: ${file.name}]`;
        setInput(prev => prev + (prev ? ' ' : '') + fileInfo);
    };

    // Update the intersection observer effect to only use necessary attributes
    useEffect(() => {
        const scrollContainer = messagesContainerRef.current;
        if (!scrollContainer) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    const messageElement = entry.target;
                    const hasThink = messageElement.getAttribute('data-has-think') === 'true';
                    
                    if (hasThink) {
                        messageElement.classList.toggle('think-visible', entry.isIntersecting);
                    }
                });
            },
            {
                root: scrollContainer,
                threshold: 0.5
            }
        );

        const messageBubbles = scrollContainer.querySelectorAll('[data-has-think]');
        messageBubbles.forEach(bubble => observer.observe(bubble));

        return () => observer.disconnect();
    }, [messages]);

    // Handler for think content updates from MessageBubble
    const handleThinkContent = useCallback((messageId: string, content: string | null, thinking: boolean) => {
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
            if (content) {
                messageElement.setAttribute('data-has-think', 'true');
                messageElement.setAttribute('data-think-content', content);
            } else {
                messageElement.removeAttribute('data-has-think');
                messageElement.removeAttribute('data-think-content');
            }
            messageElement.classList.toggle('thinking', thinking);
        }
    }, []);

    return (
        <div className="fixed inset-0 bg-gray-900 flex flex-col font-chat">
            <div className="flex-none border-b border-gray-700">
                <div className="flex items-center justify-between p-4">
                    <div className="flex items-center space-x-1">
                        <h1 className="text-xl font-semibold">Chat</h1>
                        <div className={`flex items-center space-x-2 px-3 py-1.5 text-sm 
                                     bg-gray-800 rounded-full hover:bg-gray-700
                                     cursor-pointer group`}
                             onClick={() => setIsConfigDropdownOpen(!isConfigDropdownOpen)}
                        >
                            <div className="relative max-w-[140px] md:max-w-[200px]">
                                <span className="block whitespace-nowrap overflow-hidden">
                                    {getDisplayUrl(apiSettings.serverUrl)}
                                </span>
                                <div className="absolute inset-y-0 right-0 w-4 bg-gradient-to-r from-transparent to-gray-800 group-hover:to-gray-700 md:hidden" />
                            </div>
                            <StatusIndicator status={serverStatus} />
                            <FiChevronDown className="w-4 h-4" />
                        </div>
                        <div className="relative" ref={dropdownRef}>
                            {isConfigDropdownOpen && (
                                <div style={{ right: 'max(16px, calc(100vw - 400px))' }}
                                     className="fixed top-[60px] w-72 
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
                        
                        <div className="relative" ref={toolsRef}>
                            <div className="flex items-center justify-end">
                                {/* Regular View */}
                                <div className={`flex items-center min-[394px]:flex hidden`}>
                                    <div className="flex items-center bg-gray-800 rounded-full">
                                        <button
                                            onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}
                                            className="flex items-center space-x-1 px-3.5 py-2 hover:bg-gray-700 rounded-l-full"
                                            title="Settings"
                                        >
                                            <FiSettings className="w-4.5 h-4.5" />
                                        </button>
                                        <div className="w-px h-5 bg-gray-700" />
                                        <button
                                            onClick={() => {
                                                setIsChatServicesOpen(false);
                                                setIsHistoryDropdownOpen(!isHistoryDropdownOpen);
                                            }}
                                            className="flex items-center space-x-1 px-3.5 py-2 hover:bg-gray-700"
                                            title="Chat History"
                                        >
                                            <FiClock className="w-4.5 h-4.5" />
                                        </button>
                                        <div className="w-px h-5 bg-gray-700" />
                                        <button
                                            onClick={() => {
                                                setIsHistoryDropdownOpen(false);
                                                setIsChatServicesOpen(!isChatServicesOpen);
                                            }}
                                            className="flex items-center space-x-1 px-3.5 py-2 hover:bg-gray-700 rounded-r-full"
                                            title="Chat Services"
                                        >
                                            <FiMessageSquare className="w-4.5 h-4.5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Small Screen View */}
                                <div className="relative max-[393px]:block hidden">
                                    <div className="flex items-center justify-end">
                                        <div className="relative">
                                            {isToolsExpanded && (
                                                <div className="absolute right-full">
                                                    <div className="flex items-center bg-gray-800 border border-gray-600 rounded-l-full shadow-lg">
                                                        <button
                                                            onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}
                                                            className="flex items-center space-x-1 px-3.5 py-2 hover:bg-gray-700 rounded-l-full"
                                                            title="Settings"
                                                        >
                                                            <FiSettings className="w-4.5 h-4.5" />
                                                        </button>
                                                        <div className="w-px h-5 bg-gray-600" />
                                                        <button
                                                            onClick={() => {
                                                                setIsChatServicesOpen(false);
                                                                setIsHistoryDropdownOpen(!isHistoryDropdownOpen);
                                                            }}
                                                            className="flex items-center space-x-1 px-3.5 py-2 hover:bg-gray-700"
                                                            title="Chat History"
                                                        >
                                                            <FiClock className="w-4.5 h-4.5" />
                                                        </button>
                                                        <div className="w-px h-5 bg-gray-600" />
                                                        <button
                                                            onClick={() => {
                                                                setIsHistoryDropdownOpen(false);
                                                                setIsChatServicesOpen(!isChatServicesOpen);
                                                            }}
                                                            className="flex items-center space-x-1 px-3.5 py-2 hover:bg-gray-700 rounded-r-full"
                                                            title="Chat Services"
                                                        >
                                                            <FiMessageSquare className="w-4.5 h-4.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                            <button
                                                onClick={() => setIsToolsExpanded(!isToolsExpanded)}
                                                className={`flex items-center space-x-1 px-3.5 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 shadow-lg
                                                          ${isToolsExpanded ? 'rounded-r-full border-l-0' : 'rounded-full'}`}
                                                title="Tools"
                                            >
                                                <FiMoreHorizontal className="w-4.5 h-4.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Dropdowns */}
                            {isHistoryDropdownOpen && (
                                <div style={{ right: 'max(16px, calc(100vw - 400px))' }}
                                     className="fixed top-[60px] w-72 
                                              bg-gray-900 rounded-lg shadow-lg border border-gray-700 
                                              z-[60] max-h-96 overflow-y-auto">
                                    <div className="p-2">
                                        <div className="flex border-b border-gray-700 mb-2">
                                            <button
                                                onClick={() => setActiveTab('history')}
                                                className={`flex-1 px-3 py-2 text-sm font-medium rounded-t-lg
                                                          ${activeTab === 'history' 
                                                            ? 'text-blue-400 border-b-2 border-blue-400' 
                                                            : 'text-gray-400 hover:text-gray-200'}`}
                                            >
                                                Chat History
                                            </button>
                                            <button
                                                onClick={() => setActiveTab('snippets')}
                                                className={`flex-1 px-3 py-2 text-sm font-medium rounded-t-lg
                                                          ${activeTab === 'snippets' 
                                                            ? 'text-blue-400 border-b-2 border-blue-400' 
                                                            : 'text-gray-400 hover:text-gray-200'}`}
                                            >
                                                Imported Files
                                            </button>
                                        </div>

                                        {activeTab === 'history' ? (
                                            <div className="px-2 space-y-1">
                                                <div className="flex items-center justify-between px-2 py-2 mb-2 border-b border-gray-700">
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-sm text-gray-400">
                                                            {autoSave ? 'Auto-save enabled' : 'Auto-save disabled'}
                                                        </span>
                                                        <Switch
                                                            checked={autoSave}
                                                            onCheckedChange={handleAutoSaveChange}
                                                            className="data-[state=checked]:bg-blue-500"
                                                        />
                                                    </div>
                                                </div>
                                                {chatSessions.length > 0 ? (
                                                    <>
                                                        {chatSessions
                                                            .sort((a, b) => b.lastTimestamp.getTime() - a.lastTimestamp.getTime())
                                                            .map((session) => (
                                                            <div key={session.id} className="group relative rounded bg-gray-800 hover:bg-gray-700 transition-colors">
                                                                <div 
                                                                    className="w-full text-left p-2 cursor-pointer"
                                                                    onClick={() => handleLoadSession(session.id)}
                                                                >
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="text-sm text-gray-200 font-medium truncate">
                                                                                {session.name}
                                                                            </div>
                                                                            <div className="flex items-center text-xs text-gray-400 space-x-2">
                                                                                <span>{session.lastTimestamp.toLocaleDateString()} {session.lastTimestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                                <span className="opacity-50">•</span>
                                                                                <span className="font-mono opacity-50">{session.wordCount} words</span>
                                                                            </div>
                                                                        </div>
                                                                        <button 
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                deleteChatSession(session.id);
                                                                            }}
                                                                            className="p-1.5 text-gray-500 hover:text-red-400 
                                                                                     hover:bg-red-400/10 rounded transition-all"
                                                                            title="Delete chat"
                                                                        >
                                                                            <FiTrash2 className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        <div className="mt-4 px-2">
                                                            <button
                                                                onClick={() => setShowClearAllConfirm(true)}
                                                                className="w-full px-3 py-2 text-sm text-red-400 hover:text-red-300 
                                                                         bg-red-400/10 hover:bg-red-400/20 
                                                                         rounded transition-colors"
                                                            >
                                                                Clear All Chat History
                                                            </button>
                                                        </div>
                                                        
                                                        {showClearAllConfirm && (
                                                            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                                                                <div className="bg-gray-900 p-6 rounded-lg shadow-xl border border-gray-700 max-w-sm w-full mx-4">
                                                                    <h3 className="text-lg font-medium mb-4">Clear All Chat History?</h3>
                                                                    <p className="text-sm text-gray-400 mb-6">
                                                                        Are you sure you want to delete all your chat history? This action cannot be undone.
                                                                    </p>
                                                                    <div className="flex justify-end space-x-3">
                                                                        <button
                                                                            onClick={() => setShowClearAllConfirm(false)}
                                                                            className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 rounded"
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                        <button
                                                                            onClick={() => {
                                                                                clearAllChatSessions();
                                                                                setShowClearAllConfirm(false);
                                                                            }}
                                                                            className="px-4 py-2 text-sm bg-red-500/20 hover:bg-red-500/30 
                                                                                     text-red-400 hover:text-red-300 rounded"
                                                                        >
                                                                            Yes, Delete All
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div className="px-3 py-2 text-sm text-gray-400">
                                                        No saved chat sessions yet.
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="px-2 space-y-1">
                                                <ImportedFiles onAppendToChat={handleAppendFileToChat} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            {isChatServicesOpen && (
                                <div style={{ right: 'max(16px, calc(100vw - 400px))' }}
                                     className="fixed top-[60px] w-72 
                                              bg-gray-900 rounded-lg shadow-lg border border-gray-700 
                                              z-[60] max-h-96 overflow-y-auto">
                                    <div className="p-2">
                                        <div className="text-sm font-medium text-gray-200 px-2 py-1 mb-1">
                                            Chat Services
                                        </div>
                                        <div className="space-y-2">
                                            <div className="p-2 rounded bg-gray-800 hover:bg-gray-750">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className="text-sm text-gray-200">Send Chat Context</div>
                                                        <div className="text-xs text-gray-400">
                                                            Append the chat history to each message sent in order to provide the context for the LLM.
                                                        </div>
                                                    </div>
                                                    <Switch
                                                        checked={sendChatContext}
                                                        onCheckedChange={setSendChatContext}
                                                        className="data-[state=checked]:bg-blue-500"
                                                    />
                                                </div>
                                            </div>
                                            <div className="mt-2 p-2 text-xs bg-yellow-500/10 border border-yellow-500/20 rounded">
                                                <div className="font-medium text-yellow-200">Under Construction</div>
                                                <div className="mt-1 text-yellow-100/70">
                                                    Additional chat services configuration including LangChain integration, chat modes, and other AI service settings will be available here soon.
                                                </div>
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
                        className="flex-1 overflow-y-auto overscroll-y-contain"
                    >
                        <div className="max-w-3xl mx-auto p-4 pb-24 space-y-4">
                            {messages.length === 0 ? (
                                <div className="h-full flex items-center justify-center min-h-[60vh]">
                                    <div className="max-w-sm w-full text-left space-y-8">
                                        {/* Time and Date Section */}
                                        <div className="text-left space-y-1 pt-8 pb-6 px-2">
                                            <div className="text-2xl text-gray-300/90 font-light tracking-wide">
                                                {new Date().toLocaleString(undefined, { 
                                                    weekday: 'long',
                                                    month: 'long',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </div>
                                            <div className="text-base text-gray-500/80 font-light tracking-wider pl-0.5">
                                                {new Date().toLocaleString(undefined, { 
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    hour12: true
                                                }).toLowerCase()}
                                            </div>
                                        </div>

                                        {/* Carousel Section */}
                                        <div className="relative group">
                                            {/* Carousel Content */}
                                            <div className="overflow-hidden rounded-lg">
                                                <div className="transition-transform duration-300 ease-in-out flex"
                                                     style={{ transform: `translateX(-${activeSlide * 100}%)` }}>
                                                    {/* Privacy Slide */}
                                                    <div className="min-w-full p-4 bg-gray-800/20 rounded-lg 
                                                                  group-hover:bg-gray-800/40 transition-colors duration-200">
                                                        <div className="flex flex-col justify-center">
                                                            <div className="space-y-3 text-gray-500/60 group-hover:text-gray-400/90 mx-auto max-w-[320px] w-full">
                                                                <div className="animate-fade-in">
                                                                    <h3 className="text-base font-medium mb-2">Welcome to ailocalhost.com</h3>
                                                                    <div className="space-y-2">
                                                                        <p className="text-sm leading-relaxed animate-slide-up" style={{ animationDelay: '0.2s' }}>
                                                                            A privacy-first AI chat interface where you control where your data goes.
                                                                        </p>
                                                                        <p className="text-sm leading-relaxed animate-slide-up" style={{ animationDelay: '0.4s' }}>
                                                                            Your API configurations, user settings, and chat history are saved to your browser's local storage.
                                                                        </p>
                                                                        <p className="text-xs animate-slide-up" style={{ animationDelay: '0.6s' }}>
                                                                            ailocalhost.com serves you the chat interface. You control the rest.
                                                                        </p>
                                                                        <p className="text-xs animate-slide-up" style={{ animationDelay: '0.8s' }}>
                                                                            Want to run ailocalhost on your own machine?{' '}
                                                                            <a href="https://github.com/smileytechness/ailocalhost.com" 
                                                                               target="_blank" 
                                                                               rel="noopener noreferrer" 
                                                                               className="text-blue-400/50 hover:text-blue-400/80">
                                                                                Download from GitHub
                                                                            </a>
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Setup Instructions Slide */}
                                                    <div className="min-w-full p-4 bg-gray-800/20 rounded-lg
                                                                  group-hover:bg-gray-800/40 transition-colors duration-200">
                                                        <div className="overflow-y-auto scrollbar-none" style={{ maxHeight: '280px' }}>
                                                            <div className="space-y-2 text-gray-500/60 group-hover:text-gray-400/90 mx-auto max-w-[320px] w-full">
                                                                <h3 className="text-sm font-medium mb-2 sticky top-0 bg-gray-800/20 py-2 -mt-2 -mx-4 px-4">Setup your own AI Server</h3>
                                                                <div className="space-y-1.5 text-xs">
                                                                    <div className="text-gray-400/80 font-medium mt-1">1. Install Ollama</div>
                                                                    <div className="pl-2">
                                                                        • Download from <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" className="text-blue-400/50 hover:text-blue-400/80">ollama.com</a>
                                                                        • Install and start the app
                                                                    </div>

                                                                    <div className="text-gray-400/80 font-medium mt-2">2. Configure Ollama</div>
                                                                    <div className="pl-2">
                                                                        • Open terminal and run:<br/>
                                                                        <code className="block bg-gray-800/30 px-1 py-0.5 rounded text-gray-400/80">ollama pull llama3.2</code>
                                                                        • Set environment variables:<br/>
                                                                        <code className="block bg-gray-800/30 px-1 py-0.5 rounded text-gray-400/80">export OLLAMA_HOST=0.0.0.0</code>
                                                                        <code className="block bg-gray-800/30 px-1 py-0.5 rounded text-gray-400/80">export OLLAMA_ORIGINS=https://ailocalhost.com</code>
                                                                        • Start the server:<br/>
                                                                        <code className="block bg-gray-800/30 px-1 py-0.5 rounded text-gray-400/80">ollama serve</code>
                                                                    </div>

                                                                    <div className="text-gray-400/80 font-medium mt-2">3. Find Your IP Address</div>
                                                                    <div className="pl-2">
                                                                        • Mac/Linux: <code className="bg-gray-800/30 px-1 py-0.5 rounded text-gray-400/80">ifconfig | grep "inet "</code><br/>
                                                                        • Windows: <code className="bg-gray-800/30 px-1 py-0.5 rounded text-gray-400/80">ipconfig</code>
                                                                    </div>

                                                                    <div className="text-gray-400/80 font-medium mt-2">4. Connect in Browser</div>
                                                                    <div className="pl-2">
                                                                        • Click the settings icon above ⚙️<br/>
                                                                        • Enter your Server URL:<br/>
                                                                        <code className="block bg-gray-800/30 px-1 py-0.5 rounded text-gray-400/80">http://YOUR_IP:11434/v1/chat/completions</code>
                                                                        <div className="text-gray-500/80 text-[10px] mt-0.5">Replace YOUR_IP with the IP address from step 3</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Navigation Controls */}
                                            <div className="flex items-center justify-center mt-4 space-x-4">
                                                <button 
                                                    onClick={prevSlide}
                                                    className="p-2 rounded-full bg-gray-800/90 hover:bg-gray-700
                                                            text-gray-400 hover:text-gray-300 transition-all
                                                            shadow-lg group-hover:scale-110"
                                                >
                                                    <FiChevronLeft className="w-4 h-4" />
                                                </button>

                                                {/* Dot Navigation */}
                                                <div className="flex justify-center space-x-1.5">
                                                    {[...Array(totalSlides)].map((_, index) => (
                                                        <button
                                                            key={index}
                                                            onClick={() => setActiveSlide(index)}
                                                            className={`w-1.5 h-1.5 rounded-full transition-all
                                                                      ${index === activeSlide 
                                                                        ? 'bg-blue-400/80 w-3' 
                                                                        : 'bg-gray-600/50 hover:bg-gray-500/50'}`}
                                                        />
                                                    ))}
                                                </div>

                                                <button 
                                                    onClick={nextSlide}
                                                    className="p-2 rounded-full bg-gray-800/90 hover:bg-gray-700
                                                            text-gray-400 hover:text-gray-300 transition-all
                                                            shadow-lg group-hover:scale-110"
                                                >
                                                    <FiChevronRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {messages.map((message, index) => (
                                        <div key={index} 
                                             data-message-id={`message-${index}`}
                                             className="space-y-2">
                                            {!message.isUser && (
                                                <ThinkBubble 
                                                    content={(() => {
                                                        const thinkStart = message.content.indexOf('<think>');
                                                        if (thinkStart === -1) return '';
                                                        
                                                        const thinkEnd = message.content.indexOf('</think>', thinkStart);
                                                        if (thinkEnd === -1) {
                                                            // Streaming case: show all content after <think>
                                                            return message.content.slice(thinkStart + 7);
                                                        }
                                                        
                                                        // Completed think tag case
                                                        return message.content.slice(thinkStart + 7, thinkEnd);
                                                    })()}
                                                    isVisible={message.content.includes('<think>')}
                                                    isThinking={message.content.includes('<think>') && !message.content.includes('</think>')}
                                                />
                                            )}
                                            <MessageBubble 
                                                message={message} 
                                                onThinkContent={(content, thinking) => 
                                                    handleThinkContent(`message-${index}`, content, thinking)
                                                }
                                            />
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>

                    <div className="fixed bottom-0 left-0 right-0 p-4">
                        <div className={`max-w-3xl mx-auto ${isSettingsExpanded ? 'md:mr-96' : ''}`}>
                            {messages.length > 0 && (
                                <div className="flex justify-end mb-2">
                                    <button
                                        onClick={handleNewChat}
                                        className="flex items-center space-x-2 px-4 py-2 text-sm 
                                                 bg-gray-900/90 hover:bg-gray-800/90 
                                                 border border-gray-700/50 hover:border-gray-600
                                                 rounded-full shadow-lg backdrop-blur-sm
                                                 transition-all duration-200"
                                        title="Start new chat"
                                    >
                                        <FiEdit className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                            <div className="flex items-center space-x-2">
                                <div className="flex-1 flex items-center bg-gray-900/90 rounded-lg border border-gray-700">
                                    <EnhancedInput
                                        value={input}
                                        onChange={setInput}
                                        onSend={handleSendMessage}
                                        className="flex-1 border-none bg-transparent focus:ring-0"
                                    />
                                    <div className="flex items-center pr-1.5">
                                        <div className="h-5 w-px bg-gray-700/50"></div>
                                        <button
                                            onClick={handleSendMessage}
                                            className="ml-2 w-7 h-7 flex items-center justify-center text-gray-400 
                                                     bg-blue-500/10 hover:bg-blue-500/20 hover:text-blue-400 
                                                     rounded-full transition-all"
                                        >
                                            <FiSend className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Save Prompt Modal */}
                    {showSavePrompt && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                            <div className="bg-gray-900 p-6 rounded-lg shadow-xl border border-gray-700 max-w-sm w-full mx-4">
                                <h3 className="text-lg font-medium mb-4">Save Current Chat?</h3>
                                <p className="text-sm text-gray-400 mb-6">
                                    Would you like to save your current chat before continuing?
                                </p>
                                <div className="flex justify-end space-x-3">
                                    <button
                                        onClick={() => handleSavePromptAction(false)}
                                        className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 rounded"
                                    >
                                        Don't Save
                                    </button>
                                    <button
                                        onClick={() => handleSavePromptAction(true)}
                                        className="px-4 py-2 text-sm bg-blue-500/20 hover:bg-blue-500/30 
                                                 text-blue-400 hover:text-blue-300 rounded"
                                    >
                                        Save Chat
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Desktop API Settings Panel */}
                <div className={`hidden md:block border-l border-gray-700 flex-none fixed right-0 top-[69px] bottom-0 w-96 
                               transform transition-transform duration-300 ease-in-out 
                               ${isSettingsExpanded ? 'translate-x-0' : 'translate-x-full'} bg-gray-900`}>
                    <APISettingsPanel
                        settings={apiSettings}
                        onSettingsChange={handleApiSettingsChange}
                        onExpandedChange={setIsSettingsExpanded}
                        onStatusUpdate={setServerStatus}
                        runImmediateCheck={runImmediateCheck}
                    />
                </div>

                {/* Mobile API Settings Panel */}
                {isMobile && (
                    <div className={`fixed left-0 right-0 top-[69px] bottom-0 md:hidden transition-opacity duration-300 z-50
                                   ${isSettingsExpanded ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                        <div className="absolute right-0 inset-y-0 flex justify-end">
                            <div className={`w-full max-w-[400px] bg-gray-900 
                                          transform transition-transform duration-300 border-l border-gray-700
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
                    </div>
                )}
            </div>
        </div>
    );
};

export default OllamaChat; 
