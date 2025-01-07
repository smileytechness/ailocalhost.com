import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Portal } from './Portal';

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
  <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline hover:text-blue-300">
    {children}
  </a>
);

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      
      // Calculate center position
      let left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
      let top = triggerRect.top - tooltipRect.height - 10;

      // Adjust if tooltip would go off screen
      if (left < 20) left = 20;
      if (left + tooltipRect.width > window.innerWidth - 20) {
        left = window.innerWidth - tooltipRect.width - 20;
      }
      
      // If tooltip would go above viewport, show it below the trigger
      if (top < 20) {
        top = triggerRect.bottom + 10;
      }

      setPosition({ top, left });
    }
  };

  useEffect(() => {
    if (isVisible) {
      updatePosition();
      // Update position on scroll or resize
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isVisible]);

  const handleClick = () => {
    setIsVisible(!isVisible);
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        setIsVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible]);

  return (
    <>
      <div ref={triggerRef} onClick={handleClick} className="cursor-pointer">
        {children}
      </div>
      {isVisible && (
        <Portal>
          <div
            ref={tooltipRef}
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
            }}
            className="fixed z-[99999] bg-gray-800 text-gray-200 p-4 rounded-lg shadow-lg border border-gray-700 w-[384px] max-w-[calc(100vw-40px)] max-h-[475px] flex flex-col"
          >
            <div className="flex justify-end mb-2 flex-none">
              <button onClick={handleClose} className="text-gray-500 hover:text-gray-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 font-inter text-[13px] leading-relaxed">
              <ReactMarkdown
                components={{
                  code: ({ inline, children }) => (inline ? <InlineCode>{children as string}</InlineCode> : <CodeBlock>{children as string}</CodeBlock>),
                  a: ({ href, children }) => <Link href={href || '#'}>{children}</Link>,
                  h2: ({ children }) => <h2 className="text-[15px] font-bold text-white mb-2">{children}</h2>,
                  p: ({ children }) => <p className="mb-3 text-gray-300 break-words">{children}</p>,
                  ul: ({ children }) => <ul className="mb-3 space-y-2 text-gray-300">{children}</ul>,
                  li: ({ children }) => (
                    <li className="flex gap-2 break-words">
                      <span className="text-gray-500 flex-shrink-0">•</span>
                      <span className="flex-1 min-w-0">{children}</span>
                    </li>
                  ),
                  strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
                }}
              >
                {content}
              </ReactMarkdown>
              <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent mt-4" />
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
