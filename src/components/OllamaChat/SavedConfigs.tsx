import React, { useState, useEffect } from 'react';
import { APISettings } from '../../types/api';
import { loadSavedConfigs, deleteConfig } from '../../utils/configStorage';
import { FiTrash2 } from 'react-icons/fi';

interface SavedConfigsProps {
    onLoadConfig: (config: APISettings) => void;
}

export const SavedConfigs: React.FC<SavedConfigsProps> = ({ onLoadConfig }) => {
    const [configs, setConfigs] = useState<APISettings[]>(loadSavedConfigs());

    // Refresh configs when they change
    useEffect(() => {
        const handleStorageChange = () => {
            setConfigs(loadSavedConfigs());
        };

        // Listen for our custom event
        window.addEventListener('savedConfigsUpdated', handleStorageChange);
        
        return () => {
            window.removeEventListener('savedConfigsUpdated', handleStorageChange);
        };
    }, []);

    const handleDelete = (id: string) => {
        deleteConfig(id);
    };

    const handleLoadConfig = (config: APISettings) => {
        // Ensure all properties are properly copied
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
    };

    const getDisplayName = (url: string) => {
        try {
            return new URL(url).hostname;
        } catch {
            return url;
        }
    };

    return (
        <div className="mt-4">
            <h3 className="text-base font-semibold mb-2">Saved Configurations</h3>
            <div className="space-y-1">
                {configs.map(config => (
                    <div 
                        key={config.id} 
                        className="flex items-start justify-between p-2 bg-gray-700/50 rounded-lg hover:bg-gray-700/70 transition-colors"
                    >
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                <span
                                    onClick={() => handleLoadConfig(config)}
                                    className="cursor-pointer hover:text-blue-400 font-bold text-sm"
                                >
                                    {getDisplayName(config.serverUrl)}
                                </span>
                                <span className="text-gray-500">•</span>
                                <span className="text-gray-300">{config.model || 'No model'}</span>
                                <span className="text-gray-500">•</span>
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
                            className="p-1.5 text-gray-400 hover:text-red-400 transition-colors ml-2 flex-shrink-0"
                            title="Delete configuration"
                        >
                            <FiTrash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
                {configs.length === 0 && (
                    <div className="text-sm text-gray-400 text-center py-3 bg-gray-800/30 rounded-lg">
                        No saved configurations
                    </div>
                )}
            </div>
        </div>
    );
}; 
