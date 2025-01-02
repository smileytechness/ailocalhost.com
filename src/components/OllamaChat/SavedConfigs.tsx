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
            <h3 className="text-lg font-semibold mb-2">Saved Configurations</h3>
            <div className="space-y-2">
                {configs.map(config => (
                    <div 
                        key={config.id} 
                        className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700/70 transition-colors"
                    >
                        <div className="flex-1 min-w-0">
                            <div
                                onClick={() => handleLoadConfig(config)}
                                className="cursor-pointer hover:text-blue-400 font-medium truncate"
                            >
                                {getDisplayName(config.serverUrl)}
                            </div>
                            <div className="text-sm text-gray-400 space-y-0.5">
                                <div className="truncate">Model: {config.model || 'Not set'}</div>
                                <div>
                                    Max Tokens: {config.maxTokens}
                                    <span className="mx-2">•</span>
                                    API: {config.apiKey ? 'Yes' : 'No'}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => handleDelete(config.id!)}
                            className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                            title="Delete configuration"
                        >
                            <FiTrash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
                {configs.length === 0 && (
                    <div className="text-sm text-gray-400 text-center py-4 bg-gray-800/30 rounded-lg">
                        No saved configurations
                    </div>
                )}
            </div>
        </div>
    );
}; 
