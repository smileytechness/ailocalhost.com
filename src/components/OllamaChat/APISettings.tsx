import React, { useState } from 'react';
import { APISettings, parameterDescriptions, serverStatusDescriptions } from '../../types/api';
import { Tooltip } from '../ui/Tooltip';
import { FiInfo, FiX } from 'react-icons/fi';
import { SavedConfigs } from './SavedConfigs';
import { saveConfig } from '../../utils/configStorage';

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

    // Add new save handler
    const handleSaveConfig = () => {
        saveConfig(settings);
        // Could add a toast/notification here to confirm save
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

        // Helper to update status with new error
        const addError = (error: DetailedError) => {
            setStatus(prev => ({
                ...prev,
                errors: [...prev.errors, error]
            }));
        };

        // 1. HTTP Check (Mixed Content)
        try {
            const serverUrl = new URL(settings.serverUrl);
            const pageProtocol = window.location.protocol;

            if (pageProtocol === 'https:' && serverUrl.protocol === 'http:') {
                // Try a test request even with mixed content
                try {
                    const response = await fetch(settings.serverUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.apiKey}` },
                        body: JSON.stringify({
                            model: settings.model,
                            messages: [{ role: "user", content: "write back 'We're connected'" }],
                            stream: true
                        })
                    });
                    if (response.ok) {
                        setStatus(prev => ({ ...prev, http: 'success' }));
                        onStatusUpdate('success');
                    } else {
                        throw new Error('Server returned error status');
                    }
                } catch (error) {
                    setStatus(prev => ({
                        ...prev,
                        http: 'error',
                        lan: 'skipped',
                        cors: 'skipped',
                        errors: [{
                            type: 'mixed_content',
                            message: 'Mixed Content Error: Cannot access HTTP server from HTTPS page',
                            details: 'Add the server URL to Chrome flags: chrome://flags/#unsafely-treat-insecure-origin-as-secure and restart Chrome'
                        }]
                    }));
                    setIsChecking(false);
                    onStatusUpdate('error');
                    return;
                }
            } else {
                setStatus(prev => ({ ...prev, http: 'success' }));
                onStatusUpdate('success');
            }

            // 2. LAN Check
            try {
                const response = await fetch(settings.serverUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.apiKey}` },
                    body: JSON.stringify({
                        model: settings.model,
                        messages: [{ role: "user", content: "write back 'We're connected'" }],
                        stream: false
                    })
                });

                if (!response.ok) {
                    throw new Error(`Error! status: ${response.status}`);
                }

                setStatus(prev => ({ ...prev, lan: 'success' }));
                onStatusUpdate('success');

                // 3. CORS Check
                // If we got here, CORS is working
                setStatus(prev => ({ ...prev, cors: 'success' }));
                onStatusUpdate('success');

            } catch (error) {
                if (error instanceof Error) {
                    if (error.message.includes('ERR_CONNECTION_REFUSED')) {
                        setStatus(prev => ({
                            ...prev,
                            lan: 'error',
                            cors: 'skipped',
                            errors: [...prev.errors, {
                                type: 'network',
                                message: 'Server not accessible',
                                details: 'Ensure OLLAMA_HOST is set to "0.0.0.0" for LAN access'
                            }]
                        }));
                        onStatusUpdate('error');
                    } else if (error.message.includes('CORS')) {
                        setStatus(prev => ({
                            ...prev,
                            lan: 'success',
                            cors: 'error',
                            errors: [...prev.errors, {
                                type: 'cors',
                                message: 'CORS not enabled on server',
                                details: 'Set OLLAMA_ORIGINS to allow this website'
                            }]
                        }));
                        onStatusUpdate('error');
                    } else {
                        addError({
                            type: 'unknown',
                            message: error.message,
                            details: 'Unknown error occurred during server check'
                        });
                        onStatusUpdate('error');
                    }
                }
            }
        } catch (error) {
            addError({
                type: 'unknown',
                message: 'Invalid server URL',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
            onStatusUpdate('error');
        } finally {
            setIsChecking(false);
        }
    };

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
                        <div className="space-y-1">
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

                    {/* Model */}
                    <div>
                        <label className="block text-sm font-medium mb-1 flex items-center text-gray-200">
                            <span>Model</span>
                            <InfoIcon content={parameterDescriptions.model} />
                        </label>
                        <input
                            type="text"
                            value={settings.model}
                            onChange={(e) => onSettingsChange({
                                ...settings,
                                model: e.target.value
                            })}
                            className="w-full p-2 border rounded bg-gray-800 dark:bg-gray-800 text-gray-200 border-gray-700"
                        />
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

// Update the StatusRow component to use the InfoIcon component
const StatusRow: React.FC<{ label: keyof typeof STATUS_INFO; status: string }> = ({ label, status }) => (
    <div className="flex items-center justify-between text-gray-200">
        <div className="flex items-center">
            <span className="text-sm">{STATUS_INFO[label].label}</span>
            <InfoIcon content={STATUS_INFO[label].description} />
        </div>
        <StatusIndicator status={status} />
    </div>
);

// Update StatusIndicator to handle new states
const StatusIndicator: React.FC<{ status: string }> = ({ status }) => {
    const getStatusColor = () => {
        switch (status) {
            case 'success':
                return 'bg-green-700';
            case 'error':
                return 'bg-red-700';
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
