import React, { useState, memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import remarkGfm from 'remark-gfm';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faEye, faEyeSlash, faChevronDown, faChevronUp, faCode, faXmark, faShieldHalved } from '@fortawesome/free-solid-svg-icons';
import DOMPurify from 'dompurify';
import { Switch } from '../ui/Switch';

interface MessageBubbleProps {
    message: {
        content: string;
        isUser: boolean;
        timestamp: Date;
        isError?: boolean;
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

// New HTMLPreviewModal Component
const HTMLPreviewModal = memo(({ html, onClose }: { html: string; onClose: () => void }) => {
    const [showWarning, setShowWarning] = useState(true);
    const [useSanitized, setUseSanitized] = useState(true);
    const [userChoice, setUserChoice] = useState<'sanitized' | 'trusted' | null>(null);

    const hasScripts = useMemo(() => {
        return /<script[\s\S]*?>[\s\S]*?<\/script>|on\w+\s*=|javascript:/i.test(html);
    }, [html]);

    const sanitizedHTML = useMemo(() => {
        return DOMPurify.sanitize(html);
    }, [html]);

    const handleChoice = (choice: 'sanitized' | 'trusted') => {
        setUserChoice(choice);
        setUseSanitized(choice === 'sanitized');
        setShowWarning(false);
    };

    const handleRecheck = () => {
        setShowWarning(true);
        setUserChoice(null);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
            {showWarning && hasScripts ? (
                // Warning Modal
                <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-4 animate-slide-up">
                    <div className="flex items-center justify-between text-yellow-500 mb-3">
                        <div className="flex items-center space-x-2 min-w-0 flex-shrink">
                            <FontAwesomeIcon icon={faShieldHalved} className="w-4 h-4 flex-shrink-0" />
                            <h3 className="text-base font-medium truncate">Security Warning</h3>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-gray-800 rounded-full flex-shrink-0 ml-2"
                        >
                            <FontAwesomeIcon icon={faXmark} className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <div className="w-full text-gray-300 mb-4 text-xs space-y-2">
                        <p className="whitespace-normal break-words">
                            This HTML may contain scripts that can run in your browser session.
                        </p>
                        <p className="whitespace-normal break-words">
                            An iframe which has both allow-scripts and allow-same-origin for its sandbox attribute can escape its sandboxing.
                        </p>
                        <p className="whitespace-normal break-words text-yellow-500/80">
                            Only proceed if you trust the source of this content.
                        </p>
                    </div>
                    <div className="flex flex-wrap justify-center items-center gap-3">
                        <button
                            onClick={() => handleChoice('sanitized')}
                            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs whitespace-nowrap"
                        >
                            Run Sanitized
                        </button>
                        <button
                            onClick={() => handleChoice('trusted')}
                            className="px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 
                                     text-yellow-500 hover:text-yellow-400 rounded text-xs whitespace-nowrap"
                        >
                            Trust & Run
                        </button>
                    </div>
                </div>
            ) : (
                // Preview Window
                <div className="bg-gray-900 rounded-lg shadow-xl w-full flex flex-col animate-slide-up"
                     style={{ 
                         maxWidth: 'calc(100vw - 4rem)',
                         height: 'calc(100vh - 2rem)'
                     }}>
                    {/* Header */}
                    <div className="flex-none border-b border-gray-700 relative">
                        <button
                            onClick={onClose}
                            className="absolute right-3 top-3 p-1 hover:bg-gray-800 rounded-full"
                        >
                            <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
                        </button>
                        <div className="p-3">
                            <div className="flex flex-wrap items-center gap-3 pr-8">
                                <h3 className="text-sm font-medium">HTML Preview</h3>
                                {hasScripts && (
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <div className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                                            useSanitized 
                                                ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                                                : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-500'
                                        }`}>
                                            <div className="flex items-center space-x-1">
                                                <div className={`w-1 h-1 rounded-full ${
                                                    useSanitized 
                                                        ? 'bg-blue-400'
                                                        : 'bg-yellow-500'
                                                }`} />
                                                <span>
                                                    {useSanitized ? 'Scripts Off' : 'Scripts On'}
                                                </span>
                                            </div>
                                        </div>
                                        {useSanitized && (
                                            <button
                                                onClick={handleRecheck}
                                                className="flex items-center space-x-1 px-1.5 py-0.5 text-[10px] 
                                                         bg-gray-800 hover:bg-gray-700 
                                                         border border-yellow-500/30 hover:border-yellow-500/50
                                                         text-yellow-500 hover:text-yellow-400 
                                                         rounded transition-colors"
                                            >
                                                <FontAwesomeIcon icon={faShieldHalved} className="w-2.5 h-2.5" />
                                                <span>Enable Scripts</span>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 bg-white rounded-b-lg">
                        <iframe
                            srcDoc={useSanitized ? sanitizedHTML : html}
                            className="w-full h-full"
                            sandbox={useSanitized ? "allow-same-origin" : "allow-scripts allow-same-origin"}
                            title="HTML Preview"
                        />
                    </div>
                </div>
            )}
        </div>
    );
});

const CodeBlock = memo(({ inline, className, children, ...props }: any) => {
    const [isCopied, setIsCopied] = useState(false);
    const [showLineNumbers, setShowLineNumbers] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [showHTMLPreview, setShowHTMLPreview] = useState(false);

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
    
    // Extract HTML content
    const htmlContent = useMemo(() => {
        const htmlMatch = /<html[\s\S]*?<\/html>/i.exec(codeText);
        return htmlMatch ? htmlMatch[0] : null;
    }, [codeText]);
    
    // Check if code contains HTML
    const containsHTML = useMemo(() => {
        return htmlContent !== null;
    }, [htmlContent]);

    if (!inline && match) {
        const lines = codeText.split('\n');
        const hasLongCode = lines.length > 25;
        const displayedLines = hasLongCode && !isExpanded ? lines.slice(0, 25).join('\n') : codeText;

        return (
            <>
                <div className="max-w-full overflow-x-auto relative">
                    <SyntaxHighlighter
                        language={match[1]}
                        PreTag="div"
                        className="rounded-md text-xs"
                        style={oneDark}
                        showLineNumbers={showLineNumbers}
                    >
                        {displayedLines}
                    </SyntaxHighlighter>

                    {/* Top Copy Button */}
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

                    {/* Bottom Buttons */}
                    <div className="absolute bottom-2 right-2 flex space-x-1.5">
                        {/* HTML Preview Button */}
                        {containsHTML && (
                            <button
                                className="bg-gray-700/90 hover:bg-gray-600 text-white py-1 px-1.5 rounded text-xs"
                                onClick={() => setShowHTMLPreview(true)}
                            >
                                <FontAwesomeIcon icon={faCode} className="mr-1 text-xs" />
                                <span>HTML Preview</span>
                            </button>
                        )}

                        {/* Line Numbers Toggle Button */}
                        <button
                            className="bg-gray-700/90 hover:bg-gray-600 text-white py-1 px-1.5 rounded text-xs"
                            onClick={() => setShowLineNumbers(!showLineNumbers)}
                            title={showLineNumbers ? "Hide line numbers" : "Show line numbers"}
                        >
                            <FontAwesomeIcon icon={showLineNumbers ? faEyeSlash : faEye} className="mr-1 text-xs" />
                            <span>123</span>
                        </button>

                        {/* Copy Button */}
                        <button
                            className={`${isCopied ? 'bg-green-500' : 'bg-gray-700/90'} ${isCopied ? '' : 'hover:bg-gray-600'} text-white py-1 px-1.5 rounded text-xs`}
                            onClick={() => handleCopyCode(codeText)}
                        >
                            <FontAwesomeIcon icon={faCopy} className="mr-1 text-xs" />
                            <span>{isCopied ? 'Copied!' : 'Copy'}</span>
                        </button>
                    </div>

                    {/* Line count indicator with Show More/Less button when collapsed */}
                    {hasLongCode && (
                        <div className="absolute bottom-14 right-2">
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="flex items-center space-x-1.5 bg-gray-800 hover:bg-gray-700 
                                         text-gray-300 hover:text-gray-200 px-2 py-1 rounded-md 
                                         text-xs border border-gray-600/50 hover:border-gray-500/50
                                         transition-colors shadow-sm"
                            >
                                {!isExpanded && (
                                    <span className="text-gray-400">
                                        {lines.length - 25} more lines
                                    </span>
                                )}
                                <div className="flex items-center space-x-1 text-blue-400">
                                    <FontAwesomeIcon 
                                        icon={isExpanded ? faChevronUp : faChevronDown} 
                                        className="w-3 h-3" 
                                    />
                                    <span>{isExpanded ? 'Show Less' : 'Show More'}</span>
                                </div>
                            </button>
                        </div>
                    )}
                </div>

                {/* HTML Preview Modal */}
                {showHTMLPreview && htmlContent && (
                    <HTMLPreviewModal
                        html={htmlContent}
                        onClose={() => setShowHTMLPreview(false)}
                    />
                )}
            </>
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
                <div className={`self-${message.isUser ? 'end' : 'start'} p-3 rounded-lg text-sm ${
                    message.isUser 
                        ? 'bg-blue-500 text-white' 
                        : message.isError 
                            ? 'bg-orange-500/20 text-orange-200 border border-orange-500/30' 
                            : 'bg-gray-800'
                }`}>
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