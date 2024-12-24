import React, { useState, useEffect, useRef } from 'react';
import APISettingsPanel from './OllamaChat/APISettings';
import { APISettings } from '../types/api';
import { loadSavedConfigs } from '../utils/configStorage';
import { FiMinus, FiX } from 'react-icons/fi';
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
        const saved = loadSavedConfigs();
        return saved[0] || {
            serverUrl: 'http://localhost:11434/v1/chat/completions',
            model: 'qwen2.5',
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
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    }, [messages, autoScroll, wasScrollAtBottom]);

    useEffect(() => {
        if (messages.length > 0 && messages[messages.length - 1].isUser) {
            setAutoScroll(true);
            setWasScrollAtBottom(true);
        }
    }, [messages]);

    const handleSendMessage = async () => {
        setAutoScroll(true); 
        if (!input.trim()) return;

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

    return (
        <div className="fixed inset-0 bg-gray-900 flex flex-col">
            <div className="flex-none border-b border-gray-700">
                <div className="flex items-center justify-between p-4">
                    <div className="flex items-center space-x-4">
                        <h1 className="text-xl font-semibold">AI Chat</h1>
                        <button
                            onClick={() => setIsSettingsExpanded(true)}
                            className="flex items-center space-x-2 px-3 py-1.5 text-sm 
                                     bg-gray-800 rounded-full"
                        >
                            <span className="truncate max-w-[150px]">
                                {getDisplayUrl(apiSettings.serverUrl)}
                            </span>
                            <StatusIndicator status={serverStatus} />
                        </button>
                    </div>

                    <div className="flex items-center space-x-2">
                        <button
                            onClick={onMinimize}
                            className="p-2 hover:bg-gray-800 rounded-full"
                        >
                            <FiMinus className="w-5 h-5" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-800 rounded-full"
                        >
                            <FiX className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex relative overflow-hidden">
                <div className="flex-1 flex flex-col overflow-hidden">
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

                <div className={`absolute inset-y-0 right-0 w-full md:w-[400px] bg-gray-800 
                               shadow-xl transition-transform duration-300 transform
                               ${isSettingsExpanded ? 'translate-x-0' : 'translate-x-full'}
                               border-l border-gray-700`}>
                    <APISettingsPanel
                        settings={apiSettings}
                        onSettingsChange={setApiSettings}
                        isExpanded={isSettingsExpanded}
                        onExpandedChange={setIsSettingsExpanded}
                        onStatusUpdate={setServerStatus}
                    />
                </div>
            </div>
        </div>
    );
};

export default OllamaChat; 
