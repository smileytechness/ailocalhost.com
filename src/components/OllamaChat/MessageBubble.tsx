import React, { useState, memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import remarkGfm from 'remark-gfm';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

interface MessageBubbleProps {
    message: {
        content: string;
        isUser: boolean;
        timestamp: Date;
        apiSettings?: {
            serverUrl: string;
            model: string;
            temperature: number;
            topP: number;
        };
    };
}

const getDisplayUrl = (url: string): string => {
    try {
        const parsedUrl = new URL(url);
        return parsedUrl.hostname;
    } catch (e) {
        return url.replace(/^https?:\/\//, '') || 'Configure Server';
    }
};

const CodeBlock = memo(({ inline, className, children, ...props }: any) => {
    const [isCopied, setIsCopied] = useState(false);
    const [showLineNumbers, setShowLineNumbers] = useState(false);

    const handleCopyCode = (code: string) => {
        navigator.clipboard.writeText(code).then(() => {
            setIsCopied(true);
            setTimeout(() => {
                setIsCopied(false);
            }, 2000);
        });
    };

    const match = /language-(\w+)/.exec(className || '');
    const codeText = String(children).replace(/\n$/, '');
    
    if (!inline && match) {
        const lines = codeText.split('\n');
        const showBottomButton = lines.length > 20;

        return (
            <div className="max-w-full overflow-x-auto relative">
                <SyntaxHighlighter
                    language={match[1]}
                    PreTag="div"
                    className="rounded-md text-xs"
                    style={oneDark}
                    showLineNumbers={showLineNumbers}
                >
                    {codeText}
                </SyntaxHighlighter>
                <button
                    className={`absolute top-2 right-2 ${isCopied ? 'bg-green-500' : 'bg-gray-700'} ${isCopied ? '' : 'hover:bg-gray-600'} text-xs text-white py-1 px-2 rounded`}
                    onClick={() => handleCopyCode(codeText)}
                >
                    {isCopied ? (
                        <span className="text-xs">Copied!</span>
                    ) : (
                        <>
                            <FontAwesomeIcon icon={faCopy} className="mr-1 text-xs" />
                            <span className="text-xs">Copy</span>
                        </>
                    )}
                </button>

                {showBottomButton && (
                    <div className="absolute bottom-2 right-2 flex space-x-2">
                        <button
                            className="bg-gray-700 hover:bg-gray-600 text-white py-1 px-2 rounded text-xs"
                            onClick={() => setShowLineNumbers(!showLineNumbers)}
                        >
                            {showLineNumbers ? (
                                <>
                                    <FontAwesomeIcon icon={faEyeSlash} className="mr-1 text-xs" />
                                    <span className="text-xs">123</span>
                                </>
                            ) : (
                                <>
                                    <FontAwesomeIcon icon={faEye} className="mr-1 text-xs" />
                                    <span className="text-xs">123</span>
                                </>
                            )}
                        </button>
                        <button
                            className={`${isCopied ? 'bg-green-500' : 'bg-gray-700'} ${isCopied ? '' : 'hover:bg-gray-600'} text-white py-1 px-2 rounded text-xs`}
                            onClick={() => handleCopyCode(codeText)}
                        >
                            {isCopied ? (
                                <span className="text-xs">Copied!</span>
                            ) : (
                                <>
                                    <FontAwesomeIcon icon={faCopy} className="mr-1 text-xs" />
                                    <span className="text-xs">Copy</span>
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <code className="bg-gray-700 px-1 py-0.5 rounded text-xs" {...props}>
            {children}
        </code>
    );
});

const MessageContent = memo(({ content, isUser }: { content: string; isUser: boolean }) => {
    if (isUser) {
        return <div className="break-words">{content}</div>;
    }

    return (
        <div className="prose prose-invert prose-sm max-w-none break-words relative">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    code: CodeBlock
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
});

const MessageMetadata = memo(({ timestamp, apiSettings, isUser }: { 
    timestamp: Date; 
    apiSettings?: MessageBubbleProps['message']['apiSettings']; 
    isUser: boolean 
}) => {
    const formattedTime = useMemo(() => {
        return new Intl.DateTimeFormat('default', {
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
        }).format(timestamp);
    }, [timestamp]);

    return (
        <div className={`text-[10px] mt-1 text-gray-400 flex flex-wrap gap-x-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <span className="whitespace-nowrap font-medium">{formattedTime}</span>
            {isUser && apiSettings && (
                <span className="opacity-75 whitespace-nowrap">
                    {getDisplayUrl(apiSettings.serverUrl)} • {apiSettings.model} • 
                    t:{apiSettings.temperature.toFixed(1)} • p:{apiSettings.topP.toFixed(1)}
                </span>
            )}
        </div>
    );
});

const MessageBubble: React.FC<MessageBubbleProps> = memo(({ message }) => {
    return (
        <div className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex flex-col ${message.isUser ? 'max-w-[85%] md:max-w-[75%]' : 'max-w-[90%] md:max-w-[80%]'}`}>
                <div className={`self-${message.isUser ? 'end' : 'start'} p-3 rounded-lg text-sm ${message.isUser ? 'bg-blue-500 text-white' : 'bg-gray-800'}`}>
                    <MessageContent content={message.content} isUser={message.isUser} />
                </div>
                <MessageMetadata 
                    timestamp={message.timestamp} 
                    apiSettings={message.apiSettings} 
                    isUser={message.isUser} 
                />
            </div>
        </div>
    );
});

MessageBubble.displayName = 'MessageBubble';

export default MessageBubble;