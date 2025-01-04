import React, { useState } from 'react';
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
    };
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
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

    return (
        <div className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-lg ${message.isUser ? 'bg-blue-500 text-white' : 'bg-gray-800'
                }`}>
                {message.isUser ? (
                    <div className="break-words">{message.content}</div>
                ) : (
                    <div className="prose prose-invert max-w-none break-words relative">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                code({ inline, className, children, ...props }) {
                                    const match = /language-(\w+)/.exec(className || '');
                                    const codeText = String(children).replace(/\n$/, '');
                                    const lines = codeText.split('\n');
                                    const showBottomButton = lines.length > 20;

                                    return !inline && match ? (
                                        <div className="max-w-full overflow-x-auto relative">
<SyntaxHighlighter
    language={match[1]}
    PreTag="div"
    className="rounded-md"
    style={{
        ...oneDark,
        '& .LineNumbers': {
            'fontSize': '10px',
            'fontStyle': 'normal',
            'paddingLeft': '-2px',
        },
    }}
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
                                    ) : (
                                        <code className="bg-gray-700 px-1 py-0.5 rounded" {...props}>
                                            {children}
                                        </code>
                                    );
                                }
                            }}
                        >
                            {message.content}
                        </ReactMarkdown>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MessageBubble;