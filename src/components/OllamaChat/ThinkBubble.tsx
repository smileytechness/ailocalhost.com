import React, { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ThinkBubbleProps {
    content: string;
    isVisible: boolean;
    isThinking: boolean;
}

const ThinkBubble: React.FC<ThinkBubbleProps> = ({ content, isVisible, isThinking }) => {
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (contentRef.current && isVisible) {
            contentRef.current.scrollTop = contentRef.current.scrollHeight;
        }
    }, [content, isVisible]);

    if (!isVisible) return null;

    return (
        <div className="relative w-full max-w-3xl mx-auto mb-4">
            <div className="bg-gray-800/95 border border-gray-700 rounded-lg shadow-lg 
                          max-w-[90%] mx-auto overflow-hidden">
                <div className="relative p-3 text-xs text-gray-200">
                    <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r 
                                  from-blue-500 to-purple-500 opacity-75
                                  ${isThinking ? 'animate-pulse' : ''}`} />
                    <div className="flex items-center gap-2 mb-1">
                        <div className={`text-[10px] font-medium uppercase tracking-wider 
                                      text-blue-400/90 ${isThinking ? 'animate-pulse' : ''}`}>
                            {isThinking ? (
                                <div className="flex items-center gap-1">
                                    Thinking
                                    <span className="inline-flex">
                                        <span className="animate-[ellipsis_1.5s_0s_infinite]">.</span>
                                        <span className="animate-[ellipsis_1.5s_0.2s_infinite]">.</span>
                                        <span className="animate-[ellipsis_1.5s_0.4s_infinite]">.</span>
                                    </span>
                                </div>
                            ) : 'Thought Process'}
                        </div>
                    </div>
                    <div ref={contentRef} 
                         className="overflow-y-auto max-h-[120px] pr-2 markdown-content 
                                  text-[11px] leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {content}
                        </ReactMarkdown>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(ThinkBubble); 