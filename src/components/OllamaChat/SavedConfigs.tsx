import React, { useState, useRef, useEffect } from 'react';
import { APISettings } from '../../types/api';
import { loadSavedConfigs, deleteConfig } from '../../utils/configStorage';
import { FiTrash2, FiChevronDown } from 'react-icons/fi';

interface SavedConfigsProps {
    onLoadConfig: (config: APISettings) => void;
}

export const SavedConfigs: React.FC<SavedConfigsProps> = ({ onLoadConfig }) => {
    const [configs, setConfigs] = useState<APISettings[]>(loadSavedConfigs());
    const [isExpanded, setIsExpanded] = useState(false);
    const listRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Add event listener for config updates
    useEffect(() => {
        const handleConfigUpdate = () => {
            setConfigs(loadSavedConfigs());
        };

        window.addEventListener('savedConfigsUpdated', handleConfigUpdate);
        return () => window.removeEventListener('savedConfigsUpdated', handleConfigUpdate);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (listRef.current && buttonRef.current && 
                !listRef.current.contains(event.target as Node) && 
                !buttonRef.current.contains(event.target as Node)) {
                setIsExpanded(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleDelete = (id: string) => {
        deleteConfig(id);
        setConfigs(loadSavedConfigs());
    };

    const handleLoadConfig = (config: APISettings) => {
        const loadedConfig = {
            ...config,
            model: config.model || '',
            temperature: config.temperature || 0.7,
            maxTokens: config.maxTokens || 2000,
            topP: config.topP || 1,
            frequencyPenalty: config.frequencyPenalty || 0,
            presencePenalty: config.presencePenalty || 0
        };
        
        onLoadConfig(loadedConfig);
        setIsExpanded(false); // Hide the list after selection
    };

    const getDisplayName = (url: string) => {
        try {
            return new URL(url).hostname;
        } catch {
            return url;
        }
    };

    return (
        <div className="relative flex-1">
            <button
                ref={buttonRef}
                onClick={() => setIsExpanded(!isExpanded)}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm rounded-lg 
                          flex items-center justify-between w-full"
            >
                <div className="flex items-center gap-2">
                    <span>Saved Configurations</span>
                    {configs.length > 0 && (
                        <span className="px-1.5 py-0.5 bg-gray-900 text-xs rounded-full">
                            {configs.length}
                        </span>
                    )}
                </div>
                <FiChevronDown 
                    className={`w-4 h-4 transform transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                    }`}
                />
            </button>

            <div 
                ref={listRef}
                className={`absolute top-full -right-22 mt-2 transform transition-all duration-200 origin-top min-w-[320px] z-50
                           ${isExpanded 
                               ? 'opacity-100 translate-y-0 scale-100' 
                               : 'opacity-0 translate-y-2 scale-95 pointer-events-none'}`}
            >
                <div className="bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-700 overflow-hidden">
                    <div className="max-h-[400px] overflow-y-auto">
                        {configs.map(config => (
                            <div 
                                key={config.id} 
                                className="relative px-3 py-1.5 hover:bg-gray-800/80 transition-colors border-b border-gray-700/50 last:border-0 group"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span
                                            onClick={() => handleLoadConfig(config)}
                                            className="cursor-pointer hover:text-blue-400 font-bold text-sm"
                                        >
                                            {getDisplayName(config.serverUrl)}
                                        </span>
                                        <span className="text-gray-500">•</span>
                                        <span className="text-gray-300 text-sm">{config.model || 'No model'}</span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1 text-xs pr-8">
                                        <span className="text-gray-400">MaxTK:{config.maxTokens}</span>
                                        <span className="text-gray-500">•</span>
                                        <span className="text-gray-400">Key:{config.apiKey ? 'yes' : 'no'}</span>
                                        <span className="text-gray-500">•</span>
                                        <span className="text-gray-400">t:{config.temperature?.toFixed(1)}</span>
                                        <span className="text-gray-500">•</span>
                                        <span className="text-gray-400">p:{config.topP?.toFixed(1)}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(config.id!)}
                                    className="absolute bottom-1.5 right-2 p-1 text-gray-400 hover:text-red-400 transition-colors flex-shrink-0"
                                    title="Delete configuration"
                                >
                                    <FiTrash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                        {configs.length === 0 && (
                            <div className="text-sm text-gray-400 text-center py-8">
                                No saved configurations
                            </div>
                        )}
                        {configs.length > 0 && (
                            <div className="px-3 py-2 border-t border-gray-700/50">
                                <button
                                    onClick={() => {
                                        if (window.confirm('Are you sure you want to delete all saved configurations?')) {
                                            localStorage.setItem('ollama_saved_configs', '[]');
                                            setConfigs([]);
                                            window.dispatchEvent(new Event('savedConfigsUpdated'));
                                        }
                                    }}
                                    className="w-full px-2 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded transition-colors"
                                >
                                    Delete All Configurations
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
} 
