import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import remarkGfm from 'remark-gfm';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MessageBubbleProps {
    message: {
        content: string;
        isUser: boolean;
    };
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
    return (
        <div className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-lg ${message.isUser ? 'bg-blue-500 text-white' : 'bg-gray-800'
                }`}>
                {message.isUser ? (
                    <div className="break-words">{message.content}</div>
                ) : (
                    <div className="prose prose-invert max-w-none break-words">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                code({ inline, className, children, ...props }) {
                                    const match = /language-(\w+)/.exec(className || '');
                                    return !inline && match ? (
                                        <div className="max-w-full overflow-x-auto">
                                            <SyntaxHighlighter
                                                language={match[1]}
                                                PreTag="div"
                                                className="rounded-md"
                                                style={oneDark}
                                            >
                                                {String(children).replace(/\n$/, '')}
                                            </SyntaxHighlighter>
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
