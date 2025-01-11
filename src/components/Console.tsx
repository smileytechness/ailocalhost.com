import React, { useState, useRef } from 'react';

interface ConsoleProps {
    onClose: () => void;
}

interface ConsoleEntry {
    type: 'input' | 'output' | 'error' | 'info';
    content: unknown;
}

export const Console: React.FC<ConsoleProps> = ({ onClose }) => {
    const [entries, setEntries] = useState<ConsoleEntry[]>([]);
    const [input, setInput] = useState('');
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const outputRef = useRef<HTMLDivElement>(null);

    // Create a custom console object that matches browser console behavior
    const customConsole = {
        log: (...args: unknown[]) => {
            addEntry({ type: 'output', content: args });
        },
        error: (...args: unknown[]) => {
            const formattedArgs = args.map(arg => {
                if (arg instanceof Error) {
                    return arg.stack || arg.message;
                }
                return arg;
            });
            addEntry({ type: 'error', content: formattedArgs });
        },
        info: (...args: unknown[]) => {
            addEntry({ type: 'info', content: args });
        },
        warn: (...args: unknown[]) => {
            addEntry({ type: 'error', content: args });
        },
        clear: () => setEntries([])
    };

    const addEntry = ({ type, content }: ConsoleEntry) => {
        setEntries(prev => [...prev, { type, content }]);
        setTimeout(() => {
            outputRef.current?.scrollTo({
                top: outputRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }, 0);
    };

    const formatOutput = (content: unknown): string => {
        if (typeof content === 'undefined') return 'undefined';
        if (content === null) return 'null';
        if (Array.isArray(content)) {
            return `[${content.map(item => formatOutput(item)).join(', ')}]`;
        }
        if (typeof content === 'object') {
            try {
                return JSON.stringify(content, null, 2);
            } catch {
                return Object.prototype.toString.call(content);
            }
        }
        return String(content);
    };

    const executeCode = async (code: string) => {
        try {
            // Add input to history
            addEntry({ type: 'input', content: code });
            setHistory(prev => [...prev, code]);

            // Create a function context with custom console
            const context = {
                console: customConsole,
                setTimeout,
                clearTimeout,
                setInterval,
                clearInterval,
                fetch,
                window,
                document,
                localStorage,
                sessionStorage,
            };

            // Create and execute the function
            const func = new Function(...Object.keys(context), `
                try {
                    const result = eval(${JSON.stringify(code)});
                    if (result !== undefined) console.log(result);
                    return result;
                } catch (error) {
                    console.error(error);
                }
            `);

            await func(...Object.values(context));
        } catch (error) {
            customConsole.error(error);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (input.trim()) {
                executeCode(input);
                setInput('');
                setHistoryIndex(-1);
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (history.length > 0 && historyIndex < history.length - 1) {
                const newIndex = historyIndex + 1;
                setHistoryIndex(newIndex);
                setInput(history[history.length - 1 - newIndex]);
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex > 0) {
                const newIndex = historyIndex - 1;
                setHistoryIndex(newIndex);
                setInput(history[history.length - 1 - newIndex]);
            } else if (historyIndex === 0) {
                setHistoryIndex(-1);
                setInput('');
            }
        }
    };

    return (
        <div className="h-full flex flex-col bg-gray-950 text-gray-100 font-mono">
            <div className="border-b border-gray-700 p-2 flex justify-between items-center bg-gray-800">
                <h2 className="text-sm font-semibold text-gray-300">JavaScript Console</h2>
                <div className="flex space-x-2">
                    <button
                        onClick={() => customConsole.clear()}
                        className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded"
                    >
                        Clear
                    </button>
                    <button
                        onClick={onClose}
                        className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded"
                    >
                        Close
                    </button>
                </div>
            </div>

            <div ref={outputRef} className="flex-grow overflow-y-auto p-4 space-y-2">
                {entries.map((entry, index) => (
                    <div key={index} className={`font-mono ${entry.type === 'error' ? 'text-red-400' :
                        entry.type === 'info' ? 'text-blue-400' :
                            entry.type === 'input' ? 'text-gray-400' : 'text-gray-100'
                        }`}>
                        {entry.type === 'input' ? (
                            <div className="flex items-center space-x-2">
                                <span className="text-gray-500">{'>'}</span>
                                <pre className="whitespace-pre-wrap">{String(entry.content)}</pre>
                            </div>
                        ) : (
                            <pre className="whitespace-pre-wrap">{String(entry.content)}</pre>
                        )}
                    </div>
                ))}
            </div>

            <div className="border-t border-gray-700 p-4">
                <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type JavaScript code here..."
                    className="w-full min-h-[100px] max-h-[300px] bg-gray-800 text-gray-100 p-2 rounded 
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ resize: 'vertical' }}
                />
            </div>
        </div>
    );
};
