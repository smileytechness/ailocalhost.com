import React, { useState, useEffect } from 'react';
import { APISettings, parameterDescriptions, serverStatusDescriptions } from '../../types/api';
import { Tooltip } from '../ui/Tooltip';
import { FiInfo, FiX } from 'react-icons/fi';
import { SavedConfigs } from './SavedConfigs';
import { saveConfig, loadSavedConfigs } from '../../utils/configStorage';

interface APISettingsPanelProps {
    settings: APISettings;
    onSettingsChange: (settings: APISettings) => void;
    isExpanded: boolean;
    onExpandedChange: (expanded: boolean) => void;
    onStatusUpdate: (status: 'success' | 'error' | 'loading' | 'unchecked') => void;
}

// Add new type for detailed error tracking
type ErrorType = 'mixed_content' | 'network' | 'cors' | 'unknown';

interface DetailedError {
    type: ErrorType;
    message: string;
    details?: string;
}

// Update LocalServerStatus to include more specific error tracking
type LocalServerStatus = {
    http: 'success' | 'error' | 'loading' | 'unchecked';
    lan: 'success' | 'error' | 'loading' | 'unchecked' | 'skipped';
    cors: 'success' | 'error' | 'loading' | 'unchecked' | 'skipped';
    lastChecked?: Date;
    errors: DetailedError[];
};

// First, let's create a constant for the status descriptions
const STATUS_INFO = {
    http: {
        label: 'HTTP/S',
        description: serverStatusDescriptions.http
    },
    lan: {
        label: 'LAN',
        description: serverStatusDescriptions.lan
    },
    cors: {
        label: 'CORS',
        description: serverStatusDescriptions.cors
    }
};

const InfoIcon: React.FC<{ content: string }> = ({ content }) => (
    <Tooltip content={content}>
        <div className="inline-block ml-1">
            <FiInfo className="w-4 h-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />
        </div>
    </Tooltip>
);

const APISettingsPanel: React.FC<APISettingsPanelProps> = ({
    settings,
    onSettingsChange,
    isExpanded,
    onExpandedChange,
    onStatusUpdate
}) => {
    const [isChecking, setIsChecking] = useState(false);
    const [status, setStatus] = useState<LocalServerStatus>({
        http: 'unchecked',
        cors: 'unchecked',
        lan: 'unchecked',
        errors: []
    });
    const [models, setModels] = useState<string[]>([]); // State to hold model names
    const [configs, setConfigs] = useState<APISettings[]>(loadSavedConfigs());

    // Add new save handler
    const handleSaveConfig = () => {
        const newConfig = saveConfig(settings);
        onSettingsChange(newConfig); // Update the settings with the new config
        setConfigs(loadSavedConfigs()); // Refresh the saved configurations list
    };

    const checkServerStatus = async () => {
        setIsChecking(true);
        setStatus({
            http: 'loading',
            lan: 'loading',
            cors: 'loading',
            errors: []
        });
        onStatusUpdate('loading');

        // Construct the URL for the models endpoint
        const modelsUrl = settings.serverUrl.replace(/\/v1.*/i, '/v1/models');

        try {
            const response = await fetch(modelsUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${settings.apiKey}`
                }
            });

            if (!response.ok) {
                throw new Error(`Error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Response Data:', data); // Log the response data for debugging

            // Check if data has the expected structure
            if (data.object === 'list' && Array.isArray(data.data)) {
                const modelNames = data.data.map((model: { id: string }) => model.id); // Use 'id' for model names
                setModels(modelNames); // Set the model names in state
            } else {
                throw new Error('Unexpected response format: ' + JSON.stringify(data));
            }

            setStatus(prev => ({
                ...prev,
                http: 'success',
                lan: 'success',
                cors: 'success'
            }));
            onStatusUpdate('success');
        } catch (error) {
            console.error('Server Check Error:', error);
            let errorType: 'mixed_content' | 'network' | 'cors' | 'unknown' = 'unknown';
            let errorMessage = 'An unknown error occurred.';

            if (error instanceof Error) {
                const errorMsg = error.message.toLowerCase();
                if (errorMsg.includes('mixed content')) {
                    errorType = 'mixed_content';
                    errorMessage = 'Mixed Content Error: Cannot access HTTP server from HTTPS page.';
                    setStatus(prev => ({ ...prev, http: 'error' }));
                } else if (
                    errorMsg.includes('address unreachable') || 
                    errorMsg.includes('no response') || 
                    errorMsg.includes('timeout') || 
                    errorMsg.includes('connection timed out') ||
                    errorMsg.includes('connection refused')
                ) {
                    errorType = 'network';
                    errorMessage = 'Network Error: The server address is unreachable.';
                    setStatus(prev => ({ ...prev, lan: 'error' }));
                } else if (errorMsg.includes('cors')) {
                    errorType = 'cors';
                    errorMessage = 'CORS Error: The server is not allowing requests from this origin.';
                    setStatus(prev => ({ ...prev, cors: 'error' }));
                }
            }

            setStatus(prev => ({
                ...prev,
                errors: [{
                    type: errorType,
                    message: errorMessage,
                    details: error instanceof Error ? error.message : 'Unknown error'
                }]
            }));
            onStatusUpdate('error');
        } finally {
            setIsChecking(false);
        }
    };

    // Automatically run server check when the component mounts or when settings change
    useEffect(() => {
        checkServerStatus();
    }, [settings]); // Run when settings change

    return (
        <div className={`absolute right-0 top-0 bottom-0 w-full md:w-96 bg-gray-900 dark:bg-gray-900 
                        shadow-xl transition-transform duration-300 ease-in-out transform
                        ${isExpanded ? 'translate-x-0' : 'translate-x-full'}
                        flex flex-col border-l border-gray-700 dark:border-gray-700`}>
            <div className="flex items-center justify-between p-4 border-b border-gray-700 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-200">API Settings</h2>
                <button
                    onClick={() => onExpandedChange(false)}
                    className="p-2 hover:bg-gray-800 dark:hover:bg-gray-800 rounded-full text-gray-200"
                >
                    <FiX className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-6">

                    {/* Server Status Section */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-medium text-gray-200">Server Status</h3>
                            <button
                                onClick={checkServerStatus}
                                disabled={isChecking}
                                className={`px-3 py-1 text-sm rounded-md ${isChecking
                                    ? 'bg-gray-700 cursor-not-allowed'
                                    : 'bg-blue-700 hover:bg-blue-800'
                                    } text-gray-200 transition-colors`}
                            >
                                {isChecking ? 'Checking...' : 'Check Connection'}
                            </button>
                        </div>
                        <div className="flex space-x-2">
                            <StatusRow label="http" status={status.http} />
                            <StatusRow label="lan" status={status.lan} />
                            <StatusRow label="cors" status={status.cors} />
                        </div>
                        {status.errors.length > 0 && (
                            <div className="mt-2 p-3 bg-red-900/20 dark:bg-red-900/20 rounded-md">
                                <h4 className="text-sm font-medium text-red-200 dark:text-red-200">Errors:</h4>
                                <ul className="mt-1 text-sm text-red-300 dark:text-red-300">
                                    {status.errors.map((error, index) => (
                                        <li key={index}>
                                            <strong>{error.message}</strong>
                                            {error.details && <p className="text-xs mt-1">{error.details}</p>}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Server URL */}
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-200">
                            Server URL
                        </label>
                        <input
                            type="text"
                            value={settings.serverUrl}
                            onChange={(e) => {
                                // Basic URL validation before updating
                                try {
                                    if (e.target.value && !e.target.value.startsWith('http')) {
                                        // Automatically add http:// if missing
                                        onSettingsChange({
                                            ...settings,
                                            serverUrl: `http://${e.target.value}`
                                        });
                                    } else {
                                        onSettingsChange({
                                            ...settings,
                                            serverUrl: e.target.value
                                        });
                                    }
                                } catch (e) {
                                    // If there's an error, just update the raw text
                                    onSettingsChange({
                                        ...settings,
                                        serverUrl: (e as React.ChangeEvent<HTMLInputElement>).target.value
                                    });
                                }
                            }}
                            placeholder="http://localhost:11434/v1/chat/completions"
                            className="w-full p-2 border rounded bg-gray-800 dark:bg-gray-800 text-gray-200 border-gray-700"
                        />
                        <p className="mt-1 text-xs text-gray-400">
                            Example: http://localhost:11434/v1/chat/completions
                        </p>
                    </div>

                                        {/* API Key */}
                                        <div>
                        <label className="block text-sm font-medium mb-1 flex items-center text-gray-200">
                            <span>API Key</span>
                            <InfoIcon content={parameterDescriptions.apiKey} />
                        </label>
                        <input
                            type="text"
                            value={settings.apiKey}
                            onChange={(e) => onSettingsChange({
                                ...settings,
                                apiKey: e.target.value
                            })}
                            className="w-full p-2 border rounded bg-gray-800 dark:bg-gray-800 text-gray-200 border-gray-700"
                        />
                    </div>


                    {/* Model Selection Dropdown */}
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-200">
                            Model
                        </label>
                        <select
                            value={settings.model}
                            onChange={(e) => onSettingsChange({
                                ...settings,
                                model: e.target.value
                            })}
                            className="w-full p-2 border rounded bg-gray-800 dark:bg-gray-800 text-gray-200 border-gray-700"
                        >
                            {models.map((modelName, index) => (
                                <option key={index} value={modelName}>{modelName}</option>
                            ))}
                        </select>
                    </div>


                    {/* Temperature */}
                    <div>
                        <label className="block text-sm font-medium mb-1 flex items-center text-gray-200">
                            <span>Temperature</span>
                            <InfoIcon content={parameterDescriptions.temperature} />
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.1"
                            value={settings.temperature}
                            onChange={(e) => onSettingsChange({
                                ...settings,
                                temperature: parseFloat(e.target.value)
                            })}
                            className="w-full accent-blue-600"
                        />
                        <div className="text-sm text-gray-400 dark:text-gray-400">
                            Value: {settings.temperature}
                        </div>
                    </div>

                    {/* Max Tokens */}
                    <div>
                        <label className="block text-sm font-medium mb-1 flex items-center text-gray-200">
                            <span>Max Tokens</span>
                            <InfoIcon content={parameterDescriptions.maxTokens} />
                        </label>
                        <input
                            type="number"
                            value={settings.maxTokens}
                            onChange={(e) => onSettingsChange({
                                ...settings,
                                maxTokens: parseInt(e.target.value)
                            })}
                            className="w-full p-2 border rounded bg-gray-800 dark:bg-gray-800 text-gray-200 border-gray-700"
                        />
                    </div>

                    {/* Top P */}
                    <div>
                        <label className="block text-sm font-medium mb-1 flex items-center text-gray-200">
                            <span>Top P</span>
                            <InfoIcon content={parameterDescriptions.topP} />
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={settings.topP}
                            onChange={(e) => onSettingsChange({
                                ...settings,
                                topP: parseFloat(e.target.value)
                            })}
                            className="w-full accent-blue-600"
                        />
                        <div className="text-sm text-gray-400 dark:text-gray-400">
                            Value: {settings.topP}
                        </div>
                    </div>

                    {/* Frequency Penalty */}
                    <div>
                        <label className="block text-sm font-medium mb-1 flex items-center text-gray-200">
                            <span>Frequency Penalty</span>
                            <InfoIcon content={parameterDescriptions.frequencyPenalty} />
                        </label>
                        <input
                            type="range"
                            min="-2"
                            max="2"
                            step="0.1"
                            value={settings.frequencyPenalty}
                            onChange={(e) => onSettingsChange({
                                ...settings,
                                frequencyPenalty: parseFloat(e.target.value)
                            })}
                            className="w-full accent-blue-600"
                        />
                        <div className="text-sm text-gray-400 dark:text-gray-400">
                            Value: {settings.frequencyPenalty}
                        </div>
                    </div>

                    {/* Presence Penalty */}
                    <div>
                        <label className="block text-sm font-medium mb-1 flex items-center text-gray-200">
                            <span>Presence Penalty</span>
                            <InfoIcon content={parameterDescriptions.presencePenalty} />
                        </label>
                        <input
                            type="range"
                            min="-2"
                            max="2"
                            step="0.1"
                            value={settings.presencePenalty}
                            onChange={(e) => onSettingsChange({
                                ...settings,
                                presencePenalty: parseFloat(e.target.value)
                            })}
                            className="w-full accent-blue-600"
                        />
                        <div className="text-sm text-gray-400 dark:text-gray-400">
                            Value: {settings.presencePenalty}
                        </div>
                    </div>

                    {/* Add save configuration button */}
                    <div className="mt-4 border-t border-gray-700 pt-4">
                        <button
                            onClick={handleSaveConfig}
                            className="w-full px-4 py-2 bg-blue-700 text-gray-200 rounded 
                                     hover:bg-blue-800 transition-colors duration-200"
                        >
                            Save Current Configuration
                        </button>
                    </div>

                    {/* Add SavedConfigs component */}
                    <SavedConfigs onLoadConfig={onSettingsChange} />
                </div>
            </div>
        </div>
    );
};

// Update the StatusRow component to center the info icon
const StatusRow: React.FC<{ label: keyof typeof STATUS_INFO; status: string }> = ({ label, status }) => (
    <div className="flex items-center space-x-2 bg-gray-800 p-2 rounded-full text-gray-200">
        <span className="text-xs">{STATUS_INFO[label].label}</span>
        <div className="flex items-center">
            <InfoIcon content={STATUS_INFO[label].description} />
        </div>
        <StatusIndicator status={status} />
    </div>
);

// Update StatusIndicator to match the colors used on top of the chat
const StatusIndicator: React.FC<{ status: string }> = ({ status }) => {
    const getStatusColor = () => {
        switch (status) {
            case 'success':
                return 'bg-green-500'; // Match with chat status color
            case 'error':
                return 'bg-red-500';   // Match with chat status color
            case 'loading':
                return 'bg-yellow-700';
            case 'skipped':
                return 'bg-gray-700';
            default:
                return 'bg-gray-700';
        }
    };

    return (
        <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
    );
};

export default APISettingsPanel;
