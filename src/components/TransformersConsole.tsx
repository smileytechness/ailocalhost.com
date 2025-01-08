import React, { useState, useEffect, useRef } from 'react';
import { FiMaximize2, FiMinimize2, FiSend, FiX } from 'react-icons/fi';

export interface LogEntry {
    timestamp: Date;
    type: 'info' | 'error' | 'success' | 'network' | 'command';
    message: string;
    details?: string;
}

interface TransformersConsoleProps {
    onClose: () => void;
    defaultMinimized?: boolean;
    onMinimizedChange?: (minimized: boolean) => void;
}

const TransformersConsole: React.FC<TransformersConsoleProps> = ({ 
    onClose, 
    defaultMinimized = true,
    onMinimizedChange 
}) => {
    const [isMinimized, setIsMinimized] = useState(defaultMinimized);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [command, setCommand] = useState('');
    const consoleEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Subscribe to transformers.js activity events
        const handleLog = (event: CustomEvent<LogEntry>) => {
            setLogs(prev => [...prev, event.detail]);
        };

        window.addEventListener('transformers-log' as any, handleLog);
        return () => {
            window.removeEventListener('transformers-log' as any, handleLog);
        };
    }, []);

    useEffect(() => {
        // Scroll to bottom when new logs are added
        if (consoleEndRef.current) {
            const consoleContainer = consoleEndRef.current.parentElement;
            if (consoleContainer) {
                consoleContainer.scrollTop = consoleContainer.scrollHeight;
            }
        }
    }, [logs]);

    const handleMinimizeToggle = () => {
        const newMinimized = !isMinimized;
        setIsMinimized(newMinimized);
        onMinimizedChange?.(newMinimized);
    };

    const getLogColor = (type: LogEntry['type']) => {
        switch (type) {
            case 'error': return 'text-red-400';
            case 'success': return 'text-green-400';
            case 'network': return 'text-blue-400';
            case 'command': return 'text-yellow-400';
            default: return 'text-gray-300';
        }
    };

    const handleCommand = async () => {
        if (!command.trim()) return;

        // Log the command
        logTransformersActivity({
            type: 'command',
            message: `> ${command}`
        });

        try {
            // Execute the command
            const result = await eval(`(async () => { ${command} })()`);
            
            // Log the result
            if (result !== undefined) {
                logTransformersActivity({
                    type: 'info',
                    message: typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)
                });
            }
        } catch (error) {
            logTransformersActivity({
                type: 'error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }

        setCommand('');
    };

    return (
        <div className="bg-gray-900 rounded-lg border border-gray-700">
            {/* Header */}
            <div className="flex items-center justify-between p-1.5 border-b border-gray-700">
                <h3 className="text-xs font-medium text-gray-200">Transformers.js Console Log</h3>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleMinimizeToggle}
                        className="p-1 hover:bg-gray-700 rounded transition-colors"
                    >
                        {isMinimized ? 
                            <FiMaximize2 className="w-3.5 h-3.5 text-gray-400" /> : 
                            <FiMinimize2 className="w-3.5 h-3.5 text-gray-400" />
                        }
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-700 rounded transition-colors"
                    >
                        <FiX className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                </div>
            </div>

            {/* Console Output */}
            {!isMinimized && (
                <>
                    <div className="h-32 overflow-y-auto p-2 font-mono text-[11px]">
                        {logs.map((log, index) => (
                            <div key={index} className="mb-0.5">
                                <span className="text-gray-500">
                                    [{log.timestamp.toLocaleTimeString()}]
                                </span>{' '}
                                <span className={getLogColor(log.type)}>
                                    {log.message}
                                </span>
                                {log.details && (
                                    <div className="pl-4 text-gray-500">
                                        {log.details}
                                    </div>
                                )}
                            </div>
                        ))}
                        <div ref={consoleEndRef} />
                    </div>

                    {/* Command Input */}
                    <div className="p-1.5 border-t border-gray-700 flex gap-2">
                        <input
                            type="text"
                            value={command}
                            onChange={(e) => setCommand(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCommand()}
                            placeholder="Enter JavaScript command..."
                            className="flex-1 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-[11px] 
                                     text-gray-200 placeholder-gray-500 focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                            onClick={handleCommand}
                            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 
                                     rounded text-[11px] transition-colors flex items-center gap-1"
                        >
                            <FiSend className="w-3 h-3" />
                            Run
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default TransformersConsole;

// Utility function to log transformers.js activity
export const logTransformersActivity = (entry: Omit<LogEntry, 'timestamp'>) => {
    const event = new CustomEvent('transformers-log', {
        detail: {
            ...entry,
            timestamp: new Date()
        }
    });
    window.dispatchEvent(event);
}; 