import React, { useState } from 'react';
import { APISettings } from '../../types/api';
import { loadSavedConfigs, deleteConfig } from '../../utils/configStorage';
import { FiTrash2 } from 'react-icons/fi';

interface SavedConfigsProps {
    onLoadConfig: (config: APISettings) => void;
}

export const SavedConfigs: React.FC<SavedConfigsProps> = ({ onLoadConfig }) => {
    const [configs, setConfigs] = useState<APISettings[]>(loadSavedConfigs());

    const handleDelete = (id: string) => {
        deleteConfig(id);
        setConfigs(loadSavedConfigs());
    };

    return (
        <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Saved Configurations</h3>
            <div className="space-y-2">
                {configs.map(config => (
                    <div key={config.id} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                        <div className="flex-1">
                            <span
                                onClick={() => onLoadConfig(config)}
                                className="cursor-pointer hover:text-blue-400"
                            >
                                {new URL(config.serverUrl).hostname}
                            </span>
                            <div className="text-sm text-gray-400">
                                Max Tokens: {config.maxTokens}, API: {config.apiKey ? 'Yes' : 'No'}
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
