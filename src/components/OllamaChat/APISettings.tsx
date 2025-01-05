import React, { useState, useEffect, useRef } from 'react';
import { APISettings, parameterDescriptions, serverStatusDescriptions } from '../../types/api';
import { Tooltip } from '../ui/Tooltip';
import { FiInfo, FiArrowRight, FiSidebar } from 'react-icons/fi';
import { SavedConfigs } from './SavedConfigs';
import { saveConfig, setLastUsedConfig } from '../../utils/configStorage';

interface APISettingsPanelProps {
    settings: APISettings;
    onSettingsChange: (settings: APISettings) => void;
    onExpandedChange: (expanded: boolean) => void;
    onStatusUpdate: (status: 'success' | 'error' | 'loading' | 'unchecked') => void;
    runImmediateCheck?: boolean;
}

// Add new type for auth error
type ErrorType = 'mixed_content' | 'network' | 'cors' | 'auth' | 'unknown';

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
        label: 'BROWSER',
        description: serverStatusDescriptions.http
    },
    lan: {
        label: 'NETWORK',
        description: serverStatusDescriptions.lan
    },
    cors: {
        label: 'SERVER',
        description: serverStatusDescriptions.cors
    }
};

const InfoIcon: React.FC<{ content: string }> = ({ content }) => (
    <Tooltip content={content}>
        <div className="inline-flex items-center justify-center">
            <FiInfo className="w-3 h-3 text-gray-400 hover:text-gray-300" />
        </div>
    </Tooltip>
);

const APISettingsPanel: React.FC<APISettingsPanelProps> = ({
    settings,
    onSettingsChange,
    onExpandedChange,
    onStatusUpdate,
    runImmediateCheck
}) => {
    const [isChecking, setIsChecking] = useState(false);
    const [status, setStatus] = useState<LocalServerStatus>({
        http: 'unchecked',
        cors: 'unchecked',
        lan: 'unchecked',
        errors: []
    });
    const [models, setModels] = useState<string[]>([]);
    const checkTimeoutRef = useRef<number | null>(null);
    const previousUrlRef = useRef<string>(settings.serverUrl);
    const previousKeyRef = useRef<string>(settings.apiKey);
    const previousModelRef = useRef<string>(settings.model);
    const [countdown, setCountdown] = useState<number | null>(null);
    const countdownIntervalRef = useRef<number | null>(null);

    // Cleanup function for intervals and timeouts
    const cleanupTimers = () => {
        if (checkTimeoutRef.current) {
            clearTimeout(checkTimeoutRef.current);
        }
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return cleanupTimers;
    }, []);

    // Initial load check
    useEffect(() => {
        if (settings.serverUrl) {
            checkServerStatus();
        }
    }, []);

    // Watch for relevant settings changes
    useEffect(() => {
        const hasSettingsChanged = 
            settings.serverUrl !== previousUrlRef.current || 
            settings.apiKey !== previousKeyRef.current ||
            settings.model !== previousModelRef.current;

        if (hasSettingsChanged) {
            // Update refs
            previousUrlRef.current = settings.serverUrl;
            previousKeyRef.current = settings.apiKey;
            previousModelRef.current = settings.model;

            // Reset status to unchecked
            setStatus(prev => ({
                ...prev,
                http: 'unchecked',
                lan: 'unchecked',
                cors: 'unchecked'
            }));
            onStatusUpdate('unchecked');

            // Clear existing timers
            cleanupTimers();

            if (runImmediateCheck) {
                // Run check immediately if requested
                checkServerStatus();
            } else {
                // Start countdown for normal typing updates
                setCountdown(3.0);
                countdownIntervalRef.current = window.setInterval(() => {
                    setCountdown(prev => {
                        if (prev === null || prev <= 0) {
                            clearInterval(countdownIntervalRef.current!);
                            return null;
                        }
                        return Math.max(0, prev - 0.1);
                    });
                }, 100);

                // Set new check timeout
                checkTimeoutRef.current = window.setTimeout(() => {
                    checkServerStatus();
                }, 3000);
            }
        }
    }, [settings.serverUrl, settings.apiKey, settings.model, runImmediateCheck]);

    const checkServerStatus = async () => {
        if (!settings.serverUrl) return;

        setIsChecking(true);
        setStatus({
            http: 'loading',
            lan: 'loading',
            cors: 'loading',
            errors: []
        });
        onStatusUpdate('loading');

        const modelsUrl = settings.serverUrl.replace(/\/v1.*/i, '/v1/models');

        try {
            const response = await fetch(modelsUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${settings.apiKey}`
                }
            });

            if (!response.ok) {
                // Handle HTTP error responses
                if (response.status === 401 || response.status === 403) {
                    throw new Error(`Authentication failed: ${response.status}`);
                }
                if (response.status === 404) {
                    throw new Error(`URL not found: ${response.status} - The server endpoint path is incorrect`);
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.object === 'list' && Array.isArray(data.data)) {
                const modelNames = data.data.map((model: { id: string }) => model.id);
                setModels(modelNames);
            } else {
                throw new Error('Unexpected response format: ' + JSON.stringify(data));
            }

            setStatus(prev => ({
                ...prev,
                http: 'success',
                lan: 'success',
                cors: 'success',
                errors: []
            }));
            onStatusUpdate('success');
        } catch (error) {
            console.error('Server Check Error:', error);
            let errorType: ErrorType = 'unknown';
            let errorMessage = 'An unknown error occurred.';
            let newStatus = {
                http: 'success' as LocalServerStatus['http'],
                lan: 'success' as LocalServerStatus['lan'],
                cors: 'success' as LocalServerStatus['cors'],
                errors: []
            };

            if (error instanceof Error) {
                const errorMsg = error.message.toLowerCase();
                
                // Check for browser-related errors (BROWSER category)
                if (errorMsg.includes('blocked_by_client') || errorMsg.includes('mixed content')) {
                    errorType = 'mixed_content';
                    errorMessage = 'Browser Security Error: HTTPS page cannot access HTTP server or request blocked by client.';
                    newStatus.http = 'error';
                }
                // Check for network errors (NETWORK category)
                else if (
                    errorMsg.includes('net::err_connection_timed_out') ||
                    errorMsg.includes('net::err_connection_refused') ||
                    errorMsg.includes('net::err_address_unreachable') ||
                    errorMsg.includes('failed to fetch') ||
                    errorMsg.includes('404') ||
                    errorMsg.includes('url not found')
                ) {
                    errorType = 'network';
                    errorMessage = errorMsg.includes('404') ? 
                        'Network Error: The server endpoint URL is incorrect. Please check the URL path.' :
                        'Network Error: Server is unreachable on the network.';
                    newStatus.lan = 'error';
                }
                // Check for CORS errors (SERVER category)
                else if (errorMsg.includes('cors') || errorMsg.includes('access-control-allow-origin')) {
                    errorType = 'cors';
                    errorMessage = 'Server Error: CORS policy is blocking access.';
                    newStatus.cors = 'error';
                }
                // Check for authentication errors (SERVER category)
                else if (
                    errorMsg.includes('authentication failed') ||
                    errorMsg.includes('401') ||
                    errorMsg.includes('403') ||
                    errorMsg.includes('unauthorized')
                ) {
                    errorType = 'auth';
                    errorMessage = 'Authentication Error: Invalid or missing API key.';
                    newStatus.cors = 'error';
                }
            }

            setStatus({
                ...newStatus,
                errors: [{
                    type: errorType,
                    message: errorMessage,
                    details: error instanceof Error ? error.message : 'Unknown error'
                }]
            });
            onStatusUpdate('error');
        } finally {
            setIsChecking(false);
        }
    };

    const handleSettingsChange = (newSettings: Partial<APISettings>) => {
        const updatedSettings = {
            ...settings,
            ...newSettings
        };
        onSettingsChange(updatedSettings);
        setLastUsedConfig(updatedSettings);
    };

    // Add save handler
    const handleSaveConfig = () => {
        const newConfig = saveConfig({
            ...settings,
            model: settings.model || '',  // Ensure model is saved
            temperature: settings.temperature || 0.7,
            maxTokens: settings.maxTokens || 2000,
            topP: settings.topP || 1,
            frequencyPenalty: settings.frequencyPenalty || 0,
            presencePenalty: settings.presencePenalty || 0
        });
        // Update the settings with the new config
        onSettingsChange(newConfig);
    };

    return (
        <div className="h-full flex flex-col bg-gray-900 api-settings-panel">
            {/* Always show title on desktop */}
            <div className="hidden md:flex flex-col p-4 border-b border-gray-700">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-200">API Settings</h2>
                        {countdown !== null && (
                            <div className="text-[10px] text-gray-400 -mt-1">
                                Checking in {countdown.toFixed(1)}s
                            </div>
                        )}
                    </div>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={checkServerStatus}
                            disabled={isChecking}
                            className={`px-4 py-1.5 text-sm rounded-md ${
                                isChecking
                                    ? 'bg-gray-700 cursor-not-allowed'
                                    : 'bg-blue-700 hover:bg-blue-800'
                            } text-gray-200 transition-colors`}
                        >
                            {isChecking ? 'Checking...' : 'Check Connection'}
                        </button>
                        <button
                            onClick={() => onExpandedChange(false)}
                            className="p-2 hover:bg-gray-800 rounded-full text-gray-200"
                            title="Toggle API Settings"
                        >
                            <FiSidebar className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Only show close button on mobile */}
            <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-700">
                <div>
                    <h2 className="text-lg font-semibold text-gray-200">API Settings</h2>
                    {countdown !== null && (
                        <div className="text-[10px] text-gray-400 -mt-1">
                            Checking in {countdown.toFixed(1)}s
                        </div>
                    )}
                </div>
                <div className="flex items-center space-x-4">
                    <button
                        onClick={checkServerStatus}
                        disabled={isChecking}
                        className={`px-4 py-1.5 text-sm rounded-md ${
                            isChecking
                                ? 'bg-gray-700 cursor-not-allowed'
                                : 'bg-blue-700 hover:bg-blue-800'
                        } text-gray-200 transition-colors`}
                    >
                        {isChecking ? 'Checking...' : 'Check Connection'}
                    </button>
                    <button
                        onClick={() => onExpandedChange(false)}
                        className="p-2 hover:bg-gray-800 rounded-full text-gray-200"
                    >
                        <FiArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Fixed status section */}
            <div className="flex-none p-4 border-b border-gray-700">
                <div className="flex space-x-2">
                    <StatusRow label="http" status={status.http} />
                    <StatusRow label="lan" status={status.lan} />
                    <StatusRow label="cors" status={status.cors} />
                </div>

                {status.errors.length > 0 && (
                    <div className="mt-2 p-3 bg-red-900/20 rounded-md">
                        <h4 className="text-sm font-medium text-red-200">Errors:</h4>
                        <ul className="mt-1 text-sm text-red-300">
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

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-6">
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
                                        handleSettingsChange({
                                            serverUrl: `http://${e.target.value}`
                                        });
                                    } else {
                                        handleSettingsChange({
                                            serverUrl: e.target.value
                                        });
                                    }
                                } catch (e) {
                                    // If there's an error, just update the raw text
                                    handleSettingsChange({
                                        serverUrl: (e as React.ChangeEvent<HTMLInputElement>).target.value
                                    });
                                }
                            }}
                            placeholder="http://localhost:11434/v1/chat/completions"
                            className="w-full p-2 border rounded bg-gray-800 text-gray-200 border-gray-700"
                        />
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
                            onChange={(e) => handleSettingsChange({
                                apiKey: e.target.value
                            })}
                            className="w-full p-2 border rounded bg-gray-800 text-gray-200 border-gray-700"
                        />
                    </div>

                    {/* Model Selection */}
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-200">
                            Model
                        </label>
                        <select
                            value={settings.model}
                            onChange={(e) => handleSettingsChange({
                                model: e.target.value
                            })}
                            className="w-full p-2 border rounded bg-gray-800 text-gray-200 border-gray-700 text-base"
                        >
                            <option value="" className="text-base py-2">Select a model</option>
                            {models.map((modelName, index) => (
                                <option key={index} value={modelName} className="text-base py-2">
                                    {modelName}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Max Tokens */}
                    <div className="p-3 bg-gray-800/50 rounded-lg">
                        <label className="block text-sm font-medium mb-1 flex items-center justify-between text-gray-200">
                            <div className="flex items-center">
                                <span>Max Tokens</span>
                                <InfoIcon content={parameterDescriptions.maxTokens} />
                            </div>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="number"
                                    value={settings.maxTokens}
                                    onChange={(e) => {
                                        const value = Math.min(2000000, Math.max(100, parseInt(e.target.value) || 100));
                                        handleSettingsChange({
                                            maxTokens: value
                                        });
                                    }}
                                    className="w-20 p-1 text-sm border rounded bg-gray-800 text-gray-200 border-gray-700 text-right"
                                />
                            </div>
                        </label>
                        <div className="flex flex-col space-y-2">
                            <input
                                type="range"
                                min="100"
                                max="8000"
                                step="100"
                                value={Math.min(8000, settings.maxTokens)}
                                onChange={(e) => handleSettingsChange({
                                    maxTokens: parseInt(e.target.value)
                                })}
                                className="w-full accent-blue-600"
                            />

                            {settings.maxTokens > 8000 && (
                                <div className="text-xs text-yellow-500">
                                    Warning: High token values may cause slower responses or incomplete generations
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Temperature, Top P, Frequency Penalty, Presence Penalty in a grid */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Temperature */}
                        <div className="p-3 bg-gray-800/50 rounded-lg">
                            <label className="block text-sm font-medium mb-1 flex items-center justify-between text-gray-200">
                                <div className="flex items-center">
                                    <span>Temperature</span>
                                    <InfoIcon content={parameterDescriptions.temperature} />
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="number"
                                        value={settings.temperature}
                                        onChange={(e) => {
                                            const value = Math.min(2, Math.max(0, parseFloat(e.target.value) || 0));
                                            handleSettingsChange({
                                                temperature: value
                                            });
                                        }}
                                        step="0.1"
                                        className="w-16 p-1 text-sm border rounded bg-gray-800 text-gray-200 border-gray-700 text-right"
                                    />
                                </div>
                            </label>
                            <div className="flex flex-col space-y-2">
                                <input
                                    type="range"
                                    min="0"
                                    max="2"
                                    step="0.1"
                                    value={settings.temperature}
                                    onChange={(e) => handleSettingsChange({
                                        temperature: parseFloat(e.target.value)
                                    })}
                                    className="w-full accent-blue-600"
                                />

                            </div>
                        </div>

                        {/* Top P */}
                        <div className="p-3 bg-gray-800/50 rounded-lg">
                            <label className="block text-sm font-medium mb-1 flex items-center justify-between text-gray-200">
                                <div className="flex items-center">
                                    <span>Top P</span>
                                    <InfoIcon content={parameterDescriptions.topP} />
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="number"
                                        value={settings.topP}
                                        onChange={(e) => {
                                            const value = Math.min(1, Math.max(0, parseFloat(e.target.value) || 0));
                                            handleSettingsChange({
                                                topP: value
                                            });
                                        }}
                                        step="0.1"
                                        className="w-16 p-1 text-sm border rounded bg-gray-800 text-gray-200 border-gray-700 text-right"
                                    />
                                </div>
                            </label>
                            <div className="flex flex-col space-y-2">
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={settings.topP}
                                    onChange={(e) => handleSettingsChange({
                                        topP: parseFloat(e.target.value)
                                    })}
                                    className="w-full accent-blue-600"
                                />

                            </div>
                        </div>

                        {/* Frequency Penalty */}
                        <div className="p-3 bg-gray-800/50 rounded-lg">
                            <label className="block text-sm font-medium mb-1 flex items-center justify-between text-gray-200">
                                <div className="flex items-center">
                                    <span>Frequency Penalty</span>
                                    <InfoIcon content={parameterDescriptions.frequencyPenalty} />
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="number"
                                        value={settings.frequencyPenalty}
                                        onChange={(e) => {
                                            const value = Math.min(2, Math.max(-2, parseFloat(e.target.value) || 0));
                                            handleSettingsChange({
                                                frequencyPenalty: value
                                            });
                                        }}
                                        step="0.1"
                                        className="w-16 p-1 text-sm border rounded bg-gray-800 text-gray-200 border-gray-700 text-right"
                                    />
                                </div>
                            </label>
                            <div className="flex flex-col space-y-2">
                                <input
                                    type="range"
                                    min="-2"
                                    max="2"
                                    step="0.1"
                                    value={settings.frequencyPenalty}
                                    onChange={(e) => handleSettingsChange({
                                        frequencyPenalty: parseFloat(e.target.value)
                                    })}
                                    className="w-full accent-blue-600"
                                />

                            </div>
                        </div>

                        {/* Presence Penalty */}
                        <div className="p-3 bg-gray-800/50 rounded-lg">
                            <label className="block text-sm font-medium mb-1 flex items-center justify-between text-gray-200">
                                <div className="flex items-center">
                                    <span>Presence Penalty</span>
                                    <InfoIcon content={parameterDescriptions.presencePenalty} />
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="number"
                                        value={settings.presencePenalty}
                                        onChange={(e) => {
                                            const value = Math.min(2, Math.max(-2, parseFloat(e.target.value) || 0));
                                            handleSettingsChange({
                                                presencePenalty: value
                                            });
                                        }}
                                        step="0.1"
                                        className="w-16 p-1 text-sm border rounded bg-gray-800 text-gray-200 border-gray-700 text-right"
                                    />
                                </div>
                            </label>
                            <div className="flex flex-col space-y-2">
                                <input
                                    type="range"
                                    min="-2"
                                    max="2"
                                    step="0.1"
                                    value={settings.presencePenalty}
                                    onChange={(e) => handleSettingsChange({
                                        presencePenalty: parseFloat(e.target.value)
                                    })}
                                    className="w-full accent-blue-600"
                                />

                            </div>
                        </div>
                    </div>

                    {/* Save configuration button */}
                    <div className="mt-4 border-t border-gray-700 pt-4">
                        <button
                            onClick={handleSaveConfig}
                            className="w-full px-4 py-2 bg-blue-700 text-gray-200 rounded 
                                     hover:bg-blue-800 transition-colors duration-200"
                        >
                            Save Current Configuration
                        </button>
                    </div>

                    {/* SavedConfigs component */}
                    <SavedConfigs onLoadConfig={onSettingsChange} />
                </div>
            </div>
        </div>
    );
};

// Update the StatusRow component to be more compact
const StatusRow: React.FC<{ label: keyof typeof STATUS_INFO; status: string }> = ({ label, status }) => (
    <div className="flex items-center h-8 px-2 space-x-1.5 bg-gray-800 rounded-full text-gray-200">
        <span className="text-[11px] font-medium">{STATUS_INFO[label].label}</span>
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
