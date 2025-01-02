import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

interface TooltipProps {
    content: string;
    children: React.ReactNode;
}

const CodeBlock: React.FC<{ children: string }> = ({ children }) => (
    <div className="my-2 px-3 py-2 bg-gray-900 rounded-md border border-gray-700 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap break-all">
        {children}
    </div>
);

const InlineCode: React.FC<{ children: string }> = ({ children }) => (
    <code className="px-1.5 py-0.5 mx-0.5 bg-gray-900 rounded font-mono text-[11px] whitespace-nowrap">
        {children}
    </code>
);

const Link: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
    <a 
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 underline hover:text-blue-300"
    >
        {children}
    </a>
);

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
    const tooltipRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
                setIsVisible(false);
            }
        };

        if (isVisible) {
            document.addEventListener('mousedown', handleClickOutside);
            requestAnimationFrame(updatePosition);
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isVisible]);

    const updatePosition = () => {
        if (!tooltipRef.current || !triggerRef.current) return;

        const triggerRect = triggerRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        let top = triggerRect.bottom + 8;
        let left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);

        left = Math.max(20, left);
        left = Math.min(left, viewportWidth - tooltipRect.width - 20);

        const spaceBelow = viewportHeight - triggerRect.bottom;
        const spaceAbove = triggerRect.top;
        const tooltipHeight = tooltipRect.height;

        if (spaceBelow < tooltipHeight + 8 && spaceAbove > spaceBelow) {
            top = triggerRect.top - tooltipHeight - 8;
        }

        top = Math.max(20, Math.min(top, viewportHeight - tooltipHeight - 20));

        setTooltipPosition({ 
            top: top + window.scrollY, 
            left: left + window.scrollX 
        });
    };

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsVisible(!isVisible);
    };

    return (
        <div className="relative inline-block" ref={triggerRef}>
            <div
                onClick={handleClick}
                className="cursor-pointer"
            >
                {children}
            </div>
            {isVisible && (
                <div 
                    ref={tooltipRef}
                    className="fixed z-[9999]"
                    style={{
                        top: tooltipPosition.top,
                        left: tooltipPosition.left,
                        width: '384px',
                        maxWidth: 'calc(100vw - 40px)'
                    }}
                >
                    <div className="bg-gray-800 text-gray-200 p-4 rounded-lg shadow-lg border border-gray-700">
                        <div 
                            className="overflow-y-auto font-inter text-[13px] leading-relaxed"
                            style={{ maxHeight: 'calc(100vh - 100px)' }}
                        >
                            <ReactMarkdown
                                components={{
                                    code: ({ inline, children }) => 
                                        inline ? (
                                            <InlineCode>{children as string}</InlineCode>
                                        ) : (
                                            <CodeBlock>{children as string}</CodeBlock>
                                        ),
                                    a: ({ href, children }) => <Link href={href || '#'}>{children}</Link>,
                                    h2: ({ children }) => (
                                        <h2 className="text-[15px] font-bold text-white mb-2">
                                            {children}
                                        </h2>
                                    ),
                                    p: ({ children }) => (
                                        <p className="mb-3 text-gray-300 break-words">
                                            {children}
                                        </p>
                                    ),
                                    ul: ({ children }) => (
                                        <ul className="mb-3 space-y-2 text-gray-300">
                                            {children}
                                        </ul>
                                    ),
                                    li: ({ children }) => (
                                        <li className="flex gap-2 break-words">
                                            <span className="text-gray-500 flex-shrink-0">•</span>
                                            <span className="flex-1 min-w-0">{children}</span>
                                        </li>
                                    ),
                                    strong: ({ children }) => (
                                        <strong className="font-bold text-white">
                                            {children}
                                        </strong>
                                    )
                                }}
                            >
                                {content}
                            </ReactMarkdown>
                            <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent mt-4" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}; 