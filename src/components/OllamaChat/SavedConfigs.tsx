import React, { useState, useEffect } from 'react';
import { APISettings } from '../../types/api';
import { loadSavedConfigs, deleteConfig } from '../../utils/configStorage';
import { FiTrash2 } from 'react-icons/fi';

interface SavedConfigsProps {
    onLoadConfig: (config: APISettings) => void;
}

export const SavedConfigs: React.FC<SavedConfigsProps> = ({ onLoadConfig }) => {
    const [configs, setConfigs] = useState<APISettings[]>(loadSavedConfigs());

    // Refresh configs when localStorage changes
    useEffect(() => {
        const handleStorageChange = () => {
            setConfigs(loadSavedConfigs());
        };

        window.addEventListener('storage', handleStorageChange);
        // Also set up an interval to check for changes
        const interval = setInterval(handleStorageChange, 1000);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            clearInterval(interval);
        };
    }, []);

    const handleDelete = (id: string) => {
        deleteConfig(id);
        setConfigs(loadSavedConfigs());
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
        
        // Force a new state by creating a new object
        onLoadConfig({
            ...loadedConfig,
            serverUrl: config.serverUrl + '', // Force string copy
        });
    };

    return (
        <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Saved Configurations</h3>
            <div className="space-y-2">
                {configs.map(config => (
                    <div key={config.id} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                        <div className="flex-1">
                            <span
                                onClick={() => handleLoadConfig(config)}
                                className="cursor-pointer hover:text-blue-400"
                            >
                                {new URL(config.serverUrl).hostname}
                            </span>
                            <div className="text-sm text-gray-400">
                                <div>Model: {config.model || 'Not set'}</div>
                                <div>Max Tokens: {config.maxTokens}, API: {config.apiKey ? 'Yes' : 'No'}</div>
                            </div>
                        </div>
                        <button
                            onClick={() => handleDelete(config.id!)}
                            className="p-1 text-red-400 hover:text-red-300"
                        >
                            <FiTrash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
                {configs.length === 0 && (
                    <div className="text-sm text-gray-400 text-center py-2">
                        No saved configurations
                    </div>
                )}
            </div>
        </div>
    );
}; 
