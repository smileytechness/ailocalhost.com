import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Portal } from './Portal';

interface TooltipProps {
    content: string;
    children: React.ReactNode;
}

// Add a custom CodeBlock component
const CodeBlock: React.FC<{ children: string; className?: string }> = ({ children, className }) => {
    return (
        <div className="my-2">
            <pre className="not-prose bg-gray-800 dark:bg-gray-700 p-2 rounded text-xs overflow-x-auto">
                <code className={className}>{children}</code>
            </pre>
        </div>
    );
};

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
    const [show, setShow] = useState(false);
    const triggerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: 0, left: 0 });

    useEffect(() => {
        if (show && triggerRef.current && tooltipRef.current) {
            const triggerRect = triggerRef.current.getBoundingClientRect();
            const tooltipRect = tooltipRef.current.getBoundingClientRect();
            
            // Calculate position
            let top = triggerRect.bottom + window.scrollY + 8;
            let left = triggerRect.left + window.scrollX + (triggerRect.width / 2);

            // Adjust for right edge overflow
            const maxRight = window.innerWidth - 20; // 20px padding from edge
            const tooltipRight = left + (tooltipRect.width / 2);
            if (tooltipRight > maxRight) {
                left = maxRight - (tooltipRect.width / 2);
            }

            // Adjust for left edge overflow
            const minLeft = 20; // 20px padding from edge
            const tooltipLeft = left - (tooltipRect.width / 2);
            if (tooltipLeft < minLeft) {
                left = (tooltipRect.width / 2) + minLeft;
            }

            setPosition({ top, left });
        }
    }, [show]);

    return (
        <>
            <div
                ref={triggerRef}
                className="relative inline-block"
                onMouseEnter={() => setShow(true)}
                onMouseLeave={() => setShow(false)}
            >
                {children}
            </div>
            {show && (
                <Portal>
                    <div
                        ref={tooltipRef}
                        style={{
                            position: 'absolute',
                            top: position.top,
                            left: position.left,
                            transform: 'translateX(-50%)',
                            maxWidth: '400px',
                            width: 'max-content',
                        }}
                        className="z-[9999] p-3 text-sm bg-gray-900 dark:bg-gray-800 
                                 text-white rounded-lg shadow-lg whitespace-normal"
                    >
                        <div className="prose prose-sm prose-invert max-w-none">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    code({ node, inline, className, children, ...props }) {
                                        if (inline) {
                                            return (
                                                <code className="bg-gray-800 dark:bg-gray-700 px-1 py-0.5 rounded text-xs" {...props}>
                                                    {children}
                                                </code>
                                            );
                                        }
                                        const code = String(children).replace(/\n$/, '');
                                        return <CodeBlock className={className}>{code}</CodeBlock>;
                                    },
                                    p: ({ children }) => (
                                        <p className="mb-2 last:mb-0 break-words">{children}</p>
                                    ),
                                    ul: ({ children }) => (
                                        <ul className="list-disc ml-4 mb-2 space-y-1">{children}</ul>
                                    ),
                                    li: ({ children }) => (
                                        <li className="break-words">{children}</li>
                                    )
                                }}
                            >
                                {content}
                            </ReactMarkdown>
                        </div>
                    </div>
                </Portal>
            )}
        </>
    );
}; 