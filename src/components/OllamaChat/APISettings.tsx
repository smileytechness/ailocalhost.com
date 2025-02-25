import React, { useState, useEffect, useRef } from 'react';
import { APISettings, parameterDescriptions, serverStatusDescriptions } from '../../types/api';
import { Tooltip } from '../ui/Tooltip';
import { Switch } from '../ui/Switch';
import { FiInfo, FiChevronDown, FiEye, FiEyeOff, FiArrowRight, FiRefreshCw } from 'react-icons/fi';
import { SavedConfigs } from './SavedConfigs';
import { loadSavedConfigs, saveConfig, setLastUsedConfig } from '../../utils/configStorage';
import { useTheme } from '../../context/ThemeContext';
import { getLocalStorageSize } from '../../utils/localStorage';
import { getChatSessions, ChatSession } from '../../utils/chatStorage';
import { getImportedFilesSize } from '../../utils/fileStorage';
import ApplicationsSettings from '../ApplicationsSettings';
import { listCachedModels } from '../../features/transformers/utils/transformersCache';

// At the top of the file, update the existing toggleStyles:
// const toggleStyles = `
//   .toggle-checkbox {
//     position: absolute;
//     opacity: 0;
//     width: 0;
//     height: 0;
//   }
//
//   .toggle-label {
//     position: relative;
//     display: block;
//     height: 24px;
//     width: 44px;
//     background: #4B5563;
//     border-radius: 12px;
//     cursor: pointer;
//     transition: all 0.3s ease;
//   }
//
//   .toggle-label:after {
//     content: '';
//     position: absolute;
//     top: 2px;
//     left: 2px;
//     width: 20px;
//     height: 20px;
//     border-radius: 50%;
//     background: white;
//     transition: all 0.3s ease;
//   }
//
//   .toggle-checkbox:checked + .toggle-label {
//     background: #3B82F6;
//   }
//
//   .toggle-checkbox:checked + .toggle-label:after {
//     left: calc(100% - 2px);
//     transform: translateX(-100%);
//   }
// `;

interface APISettingsPanelProps {
    settings: APISettings;
    onSettingsChange: (settings: APISettings) => void;
    onExpandedChange: (expanded: boolean) => void;
    onStatusUpdate: (status: 'success' | 'error' | 'loading' | 'unchecked') => void;
    runImmediateCheck?: boolean;
}

// Add new type for auth error
type ErrorType = 
  // Browser Errors
  | 'mixed_content'
  | 'local_access_blocked'
  
  // Network Errors
  | 'connection_refused'
  | 'connection_timeout'
  | 'address_unreachable'
  | 'failed_fetch'
  
  // Server Errors
  | 'cors'
  | 'auth'
  | 'endpoint_not_found'
  | 'server_error'
  
  // Fallback
  | 'unknown';

interface DetailedError {
    type: ErrorType;
    message: string;  // Exact browser console error
    details?: string; // Additional error stack or details
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

// Add version and types for export/import
const EXPORT_VERSION = '1.0.0';

interface ExportData {
    version: string;
    timestamp: string;
    configs?: APISettings[];
    chatHistory?: ChatSession[];
    settings?: {
        darkMode: boolean;
        userName?: string;
    };
}

interface ImportSummary {
    configs: number;
    chatHistory: number;
    configNames: string[];
    chatTitles: string[];
    duplicateConfigs: APISettings[];
    duplicateChats: ChatSession[];
}

// Error classification function
function classifyError(error: Error): {
    browserStatus: LocalServerStatus['http'];
    networkStatus: LocalServerStatus['lan'];
    serverStatus: LocalServerStatus['cors'];
    errorType: ErrorType;
    technicalError: string;
} {
    const classification = {
        browserStatus: 'unchecked' as LocalServerStatus['http'],
        networkStatus: 'unchecked' as LocalServerStatus['lan'],
        serverStatus: 'unchecked' as LocalServerStatus['cors'],
        errorType: 'unknown' as ErrorType,
        technicalError: error.message || 'Unknown error'
    };

    // Combine error message and stack trace for more comprehensive checking
    const errorMsg = (error.message || '').toLowerCase();
    const errorStack = (error.stack || '').toLowerCase();
    const fullErrorText = `${errorMsg} ${errorStack}`;
    
    // Helper function to check for mixed content indicators
    const hasMixedContentIndicators = (msg: string) => {
        const lowerMsg = msg.toLowerCase();
        return (
            lowerMsg.includes('blocked_by_client') || 
            lowerMsg.includes('mixed content') ||
            lowerMsg.includes('mixed-content') ||
            lowerMsg.includes('mixed-content blocked') ||
            lowerMsg.includes('net::err_blocked_by_client') ||
            lowerMsg.includes('not allowed to request resource') ||
            lowerMsg.includes('blocked:mixed') ||
            lowerMsg.includes('blocked by client') ||
            lowerMsg.includes('blocked:mixed-content') ||
            lowerMsg.includes('insecure content') ||
            lowerMsg.includes('blocked due to mixed content') ||
            (
                lowerMsg.includes('blocked') && 
                lowerMsg.includes('https') && 
                lowerMsg.includes('http:')
            )
        );
    };

    // Helper function to check for network-related errors
    const hasNetworkError = (msg: string) => {
        const lowerMsg = msg.toLowerCase();
        return (
            lowerMsg.includes('net::err_connection_timed_out') ||
            lowerMsg.includes('net::err_connection_refused') ||
            lowerMsg.includes('net::err_address_unreachable') ||
            lowerMsg.includes('failed to fetch') ||
            lowerMsg.includes('network error') ||
            lowerMsg.includes('connection failed')
        );
    };

    // Helper function to check for server-related errors
    const hasServerError = (msg: string) => {
        const lowerMsg = msg.toLowerCase();
        return {
            isNotFound: (
                lowerMsg.includes('404') || 
                lowerMsg.includes('url not found') ||
                lowerMsg.includes('endpoint not found') ||
                lowerMsg.includes('not found') && lowerMsg.includes('server')
            ),
            isCors: (
                lowerMsg.includes('cors') || 
                lowerMsg.includes('access-control-allow-origin') ||
                lowerMsg.includes('cross-origin') ||
                lowerMsg.includes('cross origin')
            ),
            isAuth: (
                lowerMsg.includes('401') ||
                lowerMsg.includes('403') ||
                lowerMsg.includes('unauthorized') ||
                lowerMsg.includes('forbidden') ||
                lowerMsg.includes('authentication failed') ||
                lowerMsg.includes('invalid credentials')
            )
        };
    };

    // First check for browser-level errors in both message and stack
    if (hasMixedContentIndicators(fullErrorText)) {
        classification.browserStatus = 'error';
        classification.networkStatus = 'skipped';
        classification.serverStatus = 'skipped';
        classification.errorType = 'mixed_content';
        return classification;
    }

    // Check for local access blocked errors
    if (errorMsg.includes('local access blocked')) {
        classification.browserStatus = 'error';
        classification.networkStatus = 'skipped';
        classification.serverStatus = 'skipped';
        classification.errorType = 'local_access_blocked';
        return classification;
    }

    // Check for network errors
    if (hasNetworkError(fullErrorText)) {
        // Double check it's not actually a mixed content error
        if (hasMixedContentIndicators(fullErrorText)) {
            classification.browserStatus = 'error';
            classification.networkStatus = 'skipped';
            classification.serverStatus = 'skipped';
            classification.errorType = 'mixed_content';
            return classification;
        }
        
        classification.browserStatus = 'success';
        classification.networkStatus = 'error';
        classification.serverStatus = 'skipped';
        classification.errorType = 'failed_fetch';
        return classification;
    }

    // Check for server errors using the helper function
    const serverErrors = hasServerError(fullErrorText);
    
    // 404 errors (endpoint not found)
    if (serverErrors.isNotFound) {
        classification.browserStatus = 'success';
        classification.networkStatus = 'success';
        classification.serverStatus = 'error';
        classification.errorType = 'endpoint_not_found';
        return classification;
    }

    // CORS errors
    if (serverErrors.isCors) {
        classification.browserStatus = 'success';
        classification.networkStatus = 'success';
        classification.serverStatus = 'error';
        classification.errorType = 'cors';
        return classification;
    }

    // Authentication errors
    if (serverErrors.isAuth) {
        classification.browserStatus = 'success';
        classification.networkStatus = 'success';
        classification.serverStatus = 'error';
        classification.errorType = 'auth';
        return classification;
    }

    return classification;
}

// First, add this interface near the top with other interfaces
interface ServerOption {
    label: string;
    url: string;
}

// Add this constant for the server options
const SERVER_OPTIONS: ServerOption[] = [
    { label: 'ONNX Runtime (in-browser inference)[testing only]', url: 'Transformers.js' },
    { label: 'Ollama IP Address (e.g 10.0.0.120)', url: 'http://10.0.0.120:11434/v1/chat/completions' },
    { label: 'Ollama Local', url: 'http://localhost:11434/v1/chat/completions' },
    { label: 'Groq', url: 'https://api.groq.com/openai/v1/chat/completions' },
    { label: 'OpenAI', url: 'https://api.openai.com/v1/chat/completions' },
    { label: 'Anthropic (not supported yet)', url: 'https://api.anthropic.com/v1/messages' },
    { label: 'Google AI Studio (not supported yet)', url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest/generateContent?key=AIzaSyBwz5QZ8YZ7sQ5XZ_N6Mq6MZ_N6M' },
    { label: 'Custom URL (OpenAI API)', url: '' }
];

// Add interface for model with pipeline info
interface ModelInfo {
    id: string;
    pipelineType?: string;
}

// First, create a Toggle component at the top of the file
// const Toggle: React.FC<{
//     checked: boolean;
//     onChange: (checked: boolean) => void;
//     label: string;
//     description: string;
// }> = ({ checked, onChange, label, description }) => (
//     <div className="flex items-center justify-between">
//         <div className="flex items-center">
//             <span className="text-xs font-medium text-gray-200">{label}</span>
//             <InfoIcon content={description} />
//         </div>
//         <label className="relative inline-flex items-center cursor-pointer">
//             <input
//                 type="checkbox"
//                 className="sr-only peer"
//                 checked={checked}
//                 onChange={(e) => onChange(e.target.checked)}
//             />
//             <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer 
//                           peer-checked:after:translate-x-full peer-checked:after:border-white 
//                           after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
//                           after:bg-white after:rounded-full after:h-5 after:w-5 
//                           after:transition-all peer-checked:bg-blue-600">
//             </div>
//         </label>
//     </div>
// );

const APISettingsPanel: React.FC<APISettingsPanelProps> = ({
    settings,
    onSettingsChange,
    onExpandedChange,
    onStatusUpdate,
    runImmediateCheck
}) => {
    const [activeTab, setActiveTab] = useState<'api' | 'general' | 'applications'>('api');
    const { darkMode, toggleDarkMode } = useTheme();
    const [isChecking, setIsChecking] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [status, setStatus] = useState<LocalServerStatus>({
        http: 'unchecked',
        cors: 'unchecked',
        lan: 'unchecked',
        errors: []
    });
    const [models, setModels] = useState<ModelInfo[]>([]);
    const checkTimeoutRef = useRef<number | null>(null);
    const previousUrlRef = useRef<string>(settings.serverUrl);
    const previousKeyRef = useRef<string>(settings.apiKey);
    const previousModelRef = useRef<string>(settings.model);
    const [countdown, setCountdown] = useState<number | null>(null);
    const countdownIntervalRef = useRef<number | null>(null);
    const [showExportModal, setShowExportModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [exportOptions, setExportOptions] = useState({
        configs: true,
        chatHistory: true,
        settings: true
    });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
    const [importData, setImportData] = useState<ExportData | null>(null);
    const [expandedSection, setExpandedSection] = useState<string | null>(null);
    
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

        try {
            // Handle Transformers.js differently
            if (settings.serverUrl === 'Transformers.js') {
                const cachedModels = await listCachedModels();
                setModels(cachedModels.map(model => ({
                    id: model.modelId,
                    pipelineType: model.pipelineType
                })));
                
                // Set success status
                setStatus(prev => ({
                    ...prev,
                    http: 'success',
                    lan: 'success',
                    cors: 'success',
                    errors: []
                }));
                onStatusUpdate('success');
                
                return;
            }

            // Original server check code continues for other servers
            const modelsUrl = settings.serverUrl.replace(/\/v1.*/i, '/v1/models');

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
                setModels(data.data.map((model: { id: string }) => ({
                    id: model.id
                })));
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
            
            // Use our error classification system
            const classification = classifyError(error instanceof Error ? error : new Error(String(error)));
            
            setStatus(prev => ({
                ...prev,
                http: classification.browserStatus,
                lan: classification.networkStatus,
                cors: classification.serverStatus,
                errors: [{
                    type: classification.errorType,
                    message: classification.technicalError,
                    details: error instanceof Error ? error.stack : undefined
                }]
            }));
            
            // Update the overall status based on the most severe error
            if (classification.browserStatus === 'error' || 
                classification.networkStatus === 'error' || 
                classification.serverStatus === 'error') {
                onStatusUpdate('error');
            } else {
                onStatusUpdate('success');
            }
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

    // Add save handler with animation
    const handleSaveConfig = () => {
        const newConfig = saveConfig({
            ...settings,
            model: settings.model || '',
            temperature: settings.temperature || 0.7,
            maxTokens: settings.maxTokens || 2000,
            topP: settings.topP || 1,
            frequencyPenalty: settings.frequencyPenalty || 0,
            presencePenalty: settings.presencePenalty || 0
        });
        // Update the settings with the new config
        onSettingsChange(newConfig);
        
        // Show success animation
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 1500);
    };

    // Function to format file sizes with appropriate units
    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB'];
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
    };

    // Function to calculate storage breakdown
    const getStorageBreakdown = async () => {
        const [total, importedFilesSize] = await Promise.all([
            getLocalStorageSize(),
            getImportedFilesSize()
        ]);
        const savedConfigs = localStorage.getItem('ollama_saved_configs')?.length || 0;
        const chatHistory = localStorage.getItem('chat_sessions')?.length || 0;

        // Calculate transformers cache size
        let transformersCacheSize = 0;
        try {
            const cache = await caches.open('transformers-cache');
            const keys = await cache.keys();
            for (const request of keys) {
                const response = await cache.match(request);
                if (response) {
                    const blob = await response.blob();
                    transformersCacheSize += blob.size;
                }
            }
        } catch (error) {
            console.error('Error calculating transformers cache size:', error);
        }

        const other = total - (savedConfigs + chatHistory);

        return {
            savedConfigs: (savedConfigs * 2), // multiply by 2 for UTF-16 encoding
            chatHistory: (chatHistory * 2),
            importedFiles: importedFilesSize,
            installedModels: transformersCacheSize,
            other: Math.max(0, other),
            total: total + transformersCacheSize + importedFilesSize // Add cache and imported files size to total
        };
    };

    const TabButton: React.FC<{ 
        label: string; 
        isActive: boolean; 
        onClick: () => void 
    }> = ({ label, isActive, onClick }) => (
        <button
            onClick={onClick}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors
                ${isActive 
                    ? 'bg-gray-700 text-gray-200' 
                    : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'}`}
        >
            {label}
        </button>
    );

    const GeneralSettingsView = () => {
        const [storage, setStorage] = useState({
            savedConfigs: 0,
            chatHistory: 0,
            importedFiles: 0,
            installedModels: 0,
            other: 0,
            total: 0
        });

        // Update storage info when component mounts
        useEffect(() => {
            const updateStorage = async () => {
                const breakdown = await getStorageBreakdown();
                setStorage(breakdown);
            };
            updateStorage();
        }, []);

        return (
            <div className="p-4 space-y-6">
                {/* Profile Tools */}
                <div className="p-3 bg-gray-800/50 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-200 mb-3">Profile Tools</h3>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setShowExportModal(true)}
                            className="flex-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm transition-colors"
                        >
                            Export
                        </button>
                        <button 
                            onClick={() => setShowImportModal(true)}
                            className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                        >
                            Import
                        </button>
                    </div>
                </div>

                {/* Display Settings */}
                <div className="p-3 bg-gray-800/50 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-200 mb-3">Display</h3>
                    <button
                        onClick={toggleDarkMode}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-700/50"
                    >
                        <span className="text-sm text-gray-300">Dark Mode</span>
                        <div className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 
                            ${darkMode ? 'bg-blue-600' : 'bg-gray-600'}`}
                        >
                            <div className={`w-4 h-4 rounded-full bg-white transform transition-transform duration-200 
                                ${darkMode ? 'translate-x-5' : 'translate-x-0'}`} 
                            />
                        </div>
                    </button>
                </div>

                {/* Storage Section */}
                <div className="p-3 bg-gray-800/50 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-200 mb-3">Storage Usage</h3>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Saved Configs</span>
                            <span className="text-gray-300">{formatFileSize(storage.savedConfigs)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Chat History</span>
                            <span className="text-gray-300">{formatFileSize(storage.chatHistory)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Imported Files</span>
                            <span className="text-gray-300">{formatFileSize(storage.importedFiles)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Installed Models</span>
                            <span className="text-gray-300">{formatFileSize(storage.installedModels)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Other</span>
                            <span className="text-gray-300">{formatFileSize(storage.other)}</span>
                        </div>
                        <div className="h-px bg-gray-700 my-2" />
                        <div className="flex justify-between text-sm font-medium">
                            <span className="text-gray-200">Total</span>
                            <span className="text-gray-200">{formatFileSize(storage.total)}</span>
                        </div>
                    </div>
                </div>

                {/* Export Modal */}
                {showExportModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-gray-800 rounded-lg p-4 w-full max-w-md mx-4">
                            <h3 className="text-lg font-semibold text-gray-200 mb-4">Export Data</h3>

                            {/* Security Warnings */}
                            {(loadSavedConfigs().some(config => config.apiKey) || exportOptions.chatHistory) && (
                                <div className="mb-4 p-3 bg-yellow-500/20 rounded-lg text-sm">
                                    <p className="text-yellow-200 font-medium mb-2">⚠️ Security Warning</p>
                                    <div className="space-y-2 text-yellow-100 text-xs">
                                        {loadSavedConfigs().some(config => config.apiKey) && (
                                            <p>• Some API configurations contain API keys that will be exported in plain text.</p>
                                        )}
                                        {exportOptions.chatHistory && (
                                            <p>• Chat history will be exported in plain text, including all conversation content.</p>
                                        )}
                                        <p className="font-medium">Please protect the exported file to ensure the privacy and security of your data.</p>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                {/* Saved Configs */}
                                <div className="space-y-2">
                                    <label className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={exportOptions.configs}
                                                onChange={(e) => setExportOptions(prev => ({
                                                    ...prev,
                                                    configs: e.target.checked
                                                }))}
                                                className="rounded border-gray-600 text-blue-600 focus:ring-blue-600"
                                            />
                                            <span className="text-sm text-gray-300">Saved Configs</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <span className="text-xs text-gray-400">
                                                {loadSavedConfigs().length} items • {formatFileSize(storage.savedConfigs)}
                                            </span>
                                            <button
                                                onClick={() => setExpandedSection(expandedSection === 'configs' ? null : 'configs')}
                                                className="p-1 hover:bg-gray-700 rounded-full"
                                            >
                                                <FiChevronDown 
                                                    className={`w-4 h-4 text-gray-400 transform transition-transform ${
                                                        expandedSection === 'configs' ? 'rotate-180' : ''
                                                    }`}
                                                />
                                            </button>
                                        </div>
                                    </label>
                                    {expandedSection === 'configs' && (
                                        <div className="ml-7 mt-2">
                                            <div className="text-xs text-gray-400 max-h-48 overflow-y-auto rounded-md border border-gray-700">
                                                {loadSavedConfigs().map((config, i) => (
                                                    <div 
                                                        key={i} 
                                                        className={`p-2 space-y-0.5 ${
                                                            i % 2 === 0 ? 'bg-gray-800/30' : 'bg-gray-800/50'
                                                        } ${i !== 0 ? 'border-t border-gray-700' : ''}`}
                                                    >
                                                        <div className="break-all pr-2">{config.serverUrl}</div>
                                                        {config.apiKey && (
                                                            <div className="text-yellow-500 text-[11px] pl-2">
                                                                Contains API Key
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Chat History */}
                                <div className="space-y-2">
                                    <label className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={exportOptions.chatHistory}
                                                onChange={(e) => setExportOptions(prev => ({
                                                    ...prev,
                                                    chatHistory: e.target.checked
                                                }))}
                                                className="rounded border-gray-600 text-blue-600 focus:ring-blue-600"
                                            />
                                            <span className="text-sm text-gray-300">Chat History</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <span className="text-xs text-gray-400">
                                                {getChatSessions().length} items • {formatFileSize(storage.chatHistory)}
                                            </span>
                                            <button
                                                onClick={() => setExpandedSection(expandedSection === 'chats' ? null : 'chats')}
                                                className="p-1 hover:bg-gray-700 rounded-full"
                                            >
                                                <FiChevronDown 
                                                    className={`w-4 h-4 text-gray-400 transform transition-transform ${
                                                        expandedSection === 'chats' ? 'rotate-180' : ''
                                                    }`}
                                                />
                                            </button>
                                        </div>
                                    </label>
                                    {expandedSection === 'chats' && (
                                        <div className="ml-7 mt-2">
                                            <div className="text-xs text-gray-400 max-h-48 overflow-y-auto rounded-md border border-gray-700">
                                                {getChatSessions().map((chat, i) => (
                                                    <div 
                                                        key={i} 
                                                        className={`p-2 flex items-center justify-between ${
                                                            i % 2 === 0 ? 'bg-gray-800/30' : 'bg-gray-800/50'
                                                        } ${i !== 0 ? 'border-t border-gray-700' : ''}`}
                                                    >
                                                        <span className="break-all">{chat.name}</span>
                                                        <span className="text-gray-500 flex-shrink-0 ml-2">{chat.messages.length} messages</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Profile Settings */}
                                <div className="space-y-2">
                                    <label className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={exportOptions.settings}
                                                onChange={(e) => setExportOptions(prev => ({
                                                    ...prev,
                                                    settings: e.target.checked
                                                }))}
                                                className="rounded border-gray-600 text-blue-600 focus:ring-blue-600"
                                            />
                                            <span className="text-sm text-gray-300">Profile Settings</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <span className="text-xs text-gray-400">
                                                {formatFileSize(storage.other)}
                                            </span>
                                            <button
                                                onClick={() => setExpandedSection(expandedSection === 'settings' ? null : 'settings')}
                                                className="p-1 hover:bg-gray-700 rounded-full"
                                            >
                                                <FiChevronDown 
                                                    className={`w-4 h-4 text-gray-400 transform transition-transform ${
                                                        expandedSection === 'settings' ? 'rotate-180' : ''
                                                    }`}
                                                />
                                            </button>
                                        </div>
                                    </label>
                                    {expandedSection === 'settings' && (
                                        <div className="ml-7 mt-2">
                                            <div className="text-xs text-gray-400">
                                                Includes theme preferences and user settings
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end space-x-2 mt-6">
                                <button
                                    onClick={() => {
                                        setShowExportModal(false);
                                        setExpandedSection(null);
                                    }}
                                    className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleExport}
                                    className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                >
                                    Export
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Import Modal */}
                {showImportModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-gray-800 rounded-lg p-4 w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
                            <h3 className="text-lg font-semibold text-gray-200 mb-4 flex-none">Import Data</h3>
                            <div className="flex-1 overflow-y-auto min-h-0">
                                {!importSummary && (
                                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center">
                                        <input
                                            type="file"
                                            accept=".json"
                                            onChange={handleFileSelect}
                                            className="hidden"
                                            ref={fileInputRef}
                                        />
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="text-sm text-gray-300 hover:text-white transition-colors"
                                        >
                                            Select JSON file to import
                                        </button>
                                    </div>
                                )}

                                {importSummary && (
                                    <div className="text-sm text-gray-300 space-y-3">
                                        <h4 className="font-medium">Found in file:</h4>
                                        
                                        {/* API Configs Collapsible */}
                                        {importSummary.configs > 0 && (
                                            <div className="border border-gray-700 rounded-lg">
                                                <button
                                                    onClick={() => setExpandedSection(expandedSection === 'importConfigs' ? null : 'importConfigs')}
                                                    className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-700/50 rounded-lg"
                                                >
                                                    <span className="font-medium text-blue-400">
                                                        {importSummary.configs} API Configuration{importSummary.configs !== 1 && 's'}
                                                    </span>
                                                    <FiChevronDown 
                                                        className={`w-4 h-4 transform transition-transform ${
                                                            expandedSection === 'importConfigs' ? 'rotate-180' : ''
                                                        }`}
                                                    />
                                                </button>
                                                {expandedSection === 'importConfigs' && (
                                                    <div className="px-3 pb-2 max-h-[20vh] overflow-y-auto">
                                                        <ul className="space-y-1 text-xs">
                                                            {importSummary.configNames.map((name, i) => (
                                                                <li key={i} className="flex items-center py-1">
                                                                    • {name}
                                                                    {importSummary.duplicateConfigs.some(d => d.serverUrl === name) && (
                                                                        <span className="ml-2 text-yellow-500">(duplicate)</span>
                                                                    )}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Chat History Collapsible */}
                                        {importSummary.chatHistory > 0 && (
                                            <div className="border border-gray-700 rounded-lg">
                                                <button
                                                    onClick={() => setExpandedSection(expandedSection === 'importChats' ? null : 'importChats')}
                                                    className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-700/50 rounded-lg"
                                                >
                                                    <span className="font-medium text-blue-400">
                                                        {importSummary.chatHistory} Chat Session{importSummary.chatHistory !== 1 && 's'}
                                                    </span>
                                                    <FiChevronDown 
                                                        className={`w-4 h-4 transform transition-transform ${
                                                            expandedSection === 'importChats' ? 'rotate-180' : ''
                                                        }`}
                                                    />
                                                </button>
                                                {expandedSection === 'importChats' && (
                                                    <div className="px-3 pb-2 max-h-[20vh] overflow-y-auto">
                                                        <ul className="space-y-1 text-xs">
                                                            {importSummary.chatTitles.map((title, i) => (
                                                                <li key={i} className="flex items-center py-1">
                                                                    • {title}
                                                                    {importSummary.duplicateChats.some(d => d.name === title) && (
                                                                        <span className="ml-2 text-yellow-500">(duplicate)</span>
                                                                    )}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Duplicates Warning */}
                                        {(importSummary.duplicateConfigs.length > 0 || importSummary.duplicateChats.length > 0) && (
                                            <div className="mt-2 p-3 bg-yellow-500/20 rounded-lg">
                                                <p className="text-yellow-200 font-medium">Duplicate Items Found</p>
                                                <p className="mt-1 text-yellow-100 text-xs">
                                                    Choose how to handle duplicates:
                                                    <br />• "Add to Current" will skip duplicates
                                                    <br />• "Replace All" will overwrite existing data
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end space-x-2 mt-4 pt-3 border-t border-gray-700 flex-none">
                                <button
                                    onClick={() => {
                                        setShowImportModal(false);
                                        setImportSummary(null);
                                        setImportData(null);
                                        setExpandedSection(null);
                                    }}
                                    className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                {importSummary && (
                                    <>
                                        <button
                                            onClick={() => handleImport('add')}
                                            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                        >
                                            Add to Current
                                        </button>
                                        <button
                                            onClick={() => handleImport('replace')}
                                            className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                                            title="This will replace all existing data"
                                        >
                                            Replace All
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Handler for exporting data
    const handleExport = () => {
        const exportData: ExportData = {
            version: EXPORT_VERSION,
            timestamp: new Date().toISOString()
        };

        if (exportOptions.configs) {
            exportData.configs = loadSavedConfigs();
        }
        if (exportOptions.chatHistory) {
            exportData.chatHistory = getChatSessions();
        }
        if (exportOptions.settings) {
            const settings = localStorage.getItem('userSettings');
            exportData.settings = settings ? JSON.parse(settings) : { darkMode: false };
        }

        // Create and download file
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ailocalhost_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setShowExportModal(false);
    };

    // Handler for file selection
    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data: ExportData = JSON.parse(text);

            // Validate version and structure
            if (!data.version || !data.timestamp) {
                throw new Error('Invalid file format');
            }

            // Store the data for later use
            setImportData(data);

            // Create summary
            const summary: ImportSummary = {
                configs: data.configs?.length || 0,
                chatHistory: data.chatHistory?.length || 0,
                configNames: data.configs?.map(c => c.serverUrl) || [],
                chatTitles: data.chatHistory?.map(c => c.name) || [],
                duplicateConfigs: [],
                duplicateChats: []
            };

            // Check for duplicates
            if (data.configs) {
                const existingConfigs = loadSavedConfigs();
                summary.duplicateConfigs = data.configs.filter(newConfig => 
                    existingConfigs.some((existing: APISettings) => existing.serverUrl === newConfig.serverUrl)
                );
            }

            if (data.chatHistory) {
                const existingChats = getChatSessions();
                summary.duplicateChats = data.chatHistory.filter(newChat =>
                    existingChats.some((existing: ChatSession) => existing.id === newChat.id)
                );
            }

            setImportSummary(summary);
        } catch (error) {
            console.error('Error reading file:', error);
            alert('Error reading file. Please make sure it\'s a valid export file.');
        }
    };

    // Handler for import action
    const handleImport = (action: 'add' | 'replace') => {
        if (!importData) return;

        if (action === 'replace') {
            // Clear existing data
            if (importData.configs) {
                localStorage.setItem('ollama_saved_configs', JSON.stringify(importData.configs));
            }
            if (importData.chatHistory) {
                localStorage.setItem('chat_sessions', JSON.stringify(importData.chatHistory));
            }
            if (importData.settings) {
                localStorage.setItem('userSettings', JSON.stringify(importData.settings));
            }
        } else {
            // Add to existing data, handling duplicates
            if (importData.configs) {
                const existingConfigs = loadSavedConfigs();
                const newConfigs = importData.configs.filter(newConfig => 
                    !existingConfigs.some((existing: APISettings) => existing.serverUrl === newConfig.serverUrl)
                );
                localStorage.setItem('ollama_saved_configs', JSON.stringify([...existingConfigs, ...newConfigs]));
            }
            if (importData.chatHistory) {
                const existingChats = getChatSessions();
                const newChats = importData.chatHistory.filter(newChat =>
                    !existingChats.some((existing: ChatSession) => existing.id === newChat.id)
                );
                localStorage.setItem('chat_sessions', JSON.stringify([...existingChats, ...newChats]));
            }
            if (importData.settings) {
                const existingSettings = localStorage.getItem('userSettings');
                const settings = existingSettings ? { ...JSON.parse(existingSettings), ...importData.settings } : importData.settings;
                localStorage.setItem('userSettings', JSON.stringify(settings));
            }
        }

        // Trigger any necessary updates
        window.dispatchEvent(new Event('savedConfigsUpdated'));
        window.dispatchEvent(new Event('chatSessionsUpdated'));
        if (importData.settings?.darkMode !== undefined) {
            window.location.reload(); // Reload to apply theme changes
        }

        setShowImportModal(false);
        setImportData(null);
        setImportSummary(null);
    };

    return (
        <div className="h-full flex flex-col bg-gray-900 api-settings-panel min-w-[360px] max-w-[383px] w-full min-[375px]:w-[375px] md:w-auto md:max-w-none md:min-w-0 overflow-hidden">
            {/* Header with tabs */}
            <div className="flex-none p-3 border-b border-gray-700">
                <div className="flex flex-col space-y-3">
                     <div className="flex items-center justify-between">
                        {/* Tabs */}
                        <div className="flex space-x-2">
                            <TabButton 
                                label="Servers" 
                                isActive={activeTab === 'api'} 
                                onClick={() => setActiveTab('api')} 
                            />
                            <TabButton 
                                label="Applications" 
                                isActive={activeTab === 'applications'} 
                                onClick={() => setActiveTab('applications')} 
                            />
                            <TabButton 
                                label="General" 
                                isActive={activeTab === 'general'} 
                                onClick={() => setActiveTab('general')} 
                            />
                        </div>
                        <button
                            onClick={() => onExpandedChange(false)}
                            className="w-7 h-7 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-full text-gray-400 hover:text-gray-300 transition-colors"
                            title="Close Settings"
                        >
                            <FiArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto min-h-0">
                {activeTab === 'api' ? (
                    // Original API Settings content
                    <div className="p-4 space-y-4">
                        {/* Server Status Indicators */}
                        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                            <StatusRow label="http" status={status.http} />
                            <StatusRow label="lan" status={status.lan} />
                            <StatusRow label="cors" status={status.cors} />
                            <div className="flex flex-col items-center">
                                <button
                                    onClick={checkServerStatus}
                                    disabled={isChecking}
                                    className={`h-7 px-2 flex items-center bg-gray-800 rounded-full transition-all duration-200 ${
                                        isChecking
                                            ? 'bg-gray-700 cursor-not-allowed'
                                            : 'hover:bg-gray-700'
                                    }`}
                                >
                                    <FiRefreshCw 
                                        className={`w-3 h-3 text-gray-200 transition-transform duration-700 ${
                                            isChecking ? 'animate-spin' : ''
                                        }`}
                                    />
                                </button>
                                {countdown !== null && (
                                    <div className="text-[10px] text-gray-400 mt-0.5 whitespace-nowrap">
                                        {countdown.toFixed(1)}s
                                    </div>
                                )}
                            </div>
                        </div>

                        {status.errors.length > 0 && (
                            <div className="mt-2 p-3 bg-red-900/20 rounded-md">
                                <h4 className="text-sm font-medium text-red-200">Errors:</h4>
                                <ul className="mt-1 space-y-2">
                                    {status.errors.map((error, index) => (
                                        <li key={index} className="text-sm">
                                            <div className="text-red-300 break-words">
                                                <strong className="font-medium">{error.message}</strong>
                                            </div>
                                            {error.details && (
                                                <div className="mt-1 text-xs text-red-400 break-words whitespace-pre-wrap max-h-24 overflow-y-auto">
                                                    {error.details}
                                                </div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Save configuration section */}
                        <div className="space-y-2 relative z-50">
                            <div className="flex gap-2 text-xs">
                                <SavedConfigs onLoadConfig={onSettingsChange} />
                                <button
                                    onClick={handleSaveConfig}
                                    className={`px-2.5 py-1.5 text-white rounded-lg whitespace-nowrap flex-shrink-0 transition-all duration-200
                                             ${saveSuccess 
                                                 ? 'bg-green-500 hover:bg-green-600' 
                                                 : 'bg-blue-500 hover:bg-blue-600'}`}
                                >
                                    {saveSuccess ? 'Saved!' : 'Save Config'}
                                </button>
                            </div>
                        </div>

                        {/* Server URL and API Key in a unified element */}
                        <div className="p-3 bg-gray-800/50 rounded-lg space-y-2 relative z-10">
                            {/* Server URL */}
                            <div className="flex items-center">
                                <div className="w-24 relative">
                                    <select
                                        value={SERVER_OPTIONS.find(opt => opt.url === settings.serverUrl)?.label || 'Custom Server URL'}
                                        onChange={(e) => {
                                            const selected = SERVER_OPTIONS.find(opt => opt.label === e.target.value);
                                            if (selected) {
                                                handleSettingsChange({
                                                    serverUrl: selected.url
                                                });
                                            }
                                        }}
                                        className="w-full p-1.5 text-xs font-medium border rounded bg-gray-800 text-gray-200 border-gray-700 appearance-none pr-8"
                                    >
                                        {SERVER_OPTIONS.map((option) => (
                                            <option key={option.label} value={option.label}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                                        <FiChevronDown className="h-4 w-4 text-gray-400" />
                                    </div>
                                </div>
                                <input
                                    type="text"
                                    value={settings.serverUrl}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        handleSettingsChange({
                                            serverUrl: value.startsWith('http') ? value : `http://${value}`
                                        });
                                    }}
                                    placeholder="Enter server URL..."
                                    className="flex-1 p-1.5 text-sm border rounded bg-gray-800 text-gray-200 border-gray-700 ml-2"
                                />
                            </div>

                            {/* API Key */}
                            <div className="flex items-center">
                                <label className="text-xs font-medium text-gray-200 w-24 flex items-center">
                                    <span>API Key</span>
                                </label>
                                <div className="flex-1 relative">
                                    <input
                                        type={showApiKey ? "text" : "password"}
                                        value={settings.apiKey || ''}
                                        onChange={(e) => handleSettingsChange({
                                            apiKey: e.target.value
                                        })}
                                        className="w-full p-1.5 pr-8 text-sm border rounded bg-gray-800 text-gray-200 border-gray-700"
                                    />
                                    <div className="absolute inset-y-[1px] right-8 w-6 bg-gradient-to-r from-transparent to-gray-800 pointer-events-none rounded-r" />
                                    <button
                                        type="button"
                                        onClick={() => setShowApiKey(!showApiKey)}
                                        className="absolute inset-y-[1px] right-[1px] w-7 flex items-center justify-center text-gray-400 hover:text-gray-300 rounded-r"
                                    >
                                        {showApiKey ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Model Selection */}
                            <div className="flex items-center">
                                <label className="text-xs font-medium text-gray-200 w-24">
                                    Model
                                </label>
                                <div className="flex-1 relative">
                                    <select
                                        value={settings.model}
                                        onChange={(e) => handleSettingsChange({
                                            model: e.target.value
                                        })}
                                        className="w-full p-1.5 text-sm border rounded bg-gray-800 text-gray-200 border-gray-700 appearance-none"
                                    >
                                        <option value="" className="text-sm">Select a model</option>
                                        {models.map((model, index) => (
                                            <option key={index} value={model.id} className="text-sm">
                                                {model.id}{model.pipelineType ? ` (${model.pipelineType})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                                        <FiChevronDown className="h-4 w-4 text-gray-400" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Max Tokens */}
                        <div className="p-3 bg-gray-800/50 rounded-lg">
                            <label className="block text-xs font-medium mb-1 flex items-center justify-between text-gray-200">
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
                                <label className="block text-xs font-medium mb-1 flex items-center justify-between text-gray-200">
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
                                            className="w-12 p-1 text-sm border rounded bg-gray-800 text-gray-200 border-gray-700 text-right"
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
                                <label className="block text-xs font-medium mb-1 flex items-center justify-between text-gray-200">
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
                                            className="w-12 p-1 text-sm border rounded bg-gray-800 text-gray-200 border-gray-700 text-right"
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
                                <label className="block text-xs font-medium mb-1 flex items-center justify-between text-gray-200">
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
                                            className="w-12 p-1 text-sm border rounded bg-gray-800 text-gray-200 border-gray-700 text-right"
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
                                <label className="block text-xs font-medium mb-1 flex items-center justify-between text-gray-200">
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
                                            className="w-12 p-1 text-sm border rounded bg-gray-800 text-gray-200 border-gray-700 text-right"
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

                        {/* Text Generation Parameters in Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-gray-800/50 rounded-lg"></div>
                            <div className="p-3 bg-gray-800/50 rounded-lg"></div>
                         {/* Comment out Top K and Number of Beams for now
                            <div className="p-3 bg-gray-800/50 rounded-lg">
                                <label className="block text-xs font-medium mb-1 flex items-center justify-between text-gray-200">
                                    <div className="flex items-center">
                                        <span>Top K</span>
                                        <InfoIcon content={parameterDescriptions.topK} />
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="number"
                                            value={settings.topK ?? 40}
                                            onChange={(e) => {
                                                const value = Math.min(100, Math.max(1, parseInt(e.target.value) || 1));
                                                handleSettingsChange({
                                                    topK: value
                                                });
                                            }}
                                            className="w-12 p-1 text-sm border rounded bg-gray-800 text-gray-200 border-gray-700 text-right"
                                        />
                                    </div>
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="100"
                                    value={settings.topK ?? 40}
                                    onChange={(e) => handleSettingsChange({
                                        topK: parseInt(e.target.value)
                                    })}
                                    className="w-full accent-blue-600"
                                />
                            </div>

                            <div className="p-3 bg-gray-800/50 rounded-lg">
                                <label className="block text-xs font-medium mb-1 flex items-center justify-between text-gray-200">
                                    <div className="flex items-center">
                                        <span>Number of Beams</span>
                                        <InfoIcon content={parameterDescriptions.numBeams} />
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="number"
                                            value={settings.numBeams ?? 1}
                                            onChange={(e) => {
                                                const value = Math.min(8, Math.max(1, parseInt(e.target.value) || 1));
                                                handleSettingsChange({
                                                    numBeams: value
                                                });
                                            }}
                                            className="w-12 p-1 text-sm border rounded bg-gray-800 text-gray-200 border-gray-700 text-right"
                                        />
                                    </div>
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="8"
                                    value={settings.numBeams ?? 1}
                                    onChange={(e) => handleSettingsChange({
                                        numBeams: parseInt(e.target.value)
                                    })}
                                    className="w-full accent-blue-600"
                                />
                            </div>
                            */}
                        </div>

                        {/* Generation Control */}
                        <div className="p-3 bg-gray-800/50 rounded-lg space-y-3">
                            {/* Comment out Seed and Do Sample for now */}
                            {/* 
                            <label className="block text-xs font-medium mb-1 flex items-center justify-between text-gray-200">
                                <div className="flex items-center">
                                    <span>Seed</span>
                                    <InfoIcon content={parameterDescriptions.seed} />
                                </div>
                                <input
                                    type="number"
                                    value={settings.seed}
                                    onChange={(e) => handleSettingsChange({
                                        seed: parseInt(e.target.value) || 42
                                    })}
                                    className="w-20 p-1 text-sm border rounded bg-gray-800 text-gray-200 border-gray-700 text-right"
                                />
                            </label>

                            <Toggle
                                checked={settings.doSample ?? true}
                                onChange={(checked) => handleSettingsChange({ doSample: checked })}
                                label="Do Sample"
                                description={parameterDescriptions.doSample}
                            />
                            */}
                        </div>

                        {/* Performance Settings */}
                        <div className="p-3 bg-gray-800/50 rounded-lg space-y-3">
                                {/* tranformers.js header */}
                                <label className="block text-xs font-medium mb-1 flex items-center justify-between text-gray-200">
                               
                               <div className="flex items-center">
                                   <span className="text-m font-bold">ONNX Runtime / Transformers.js only</span>
                                   <span></span>
                               </div>
                           </label>

                            {/* WASM Threads */}
                            <label className="block text-xs font-medium mb-1 flex items-center justify-between text-gray-200">
                               
                                <div className="flex items-center">
                                    <span>WASM Threads</span>
                                    <InfoIcon content={parameterDescriptions.numThreads} />
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="number"
                                        value={settings.numThreads}
                                        onChange={(e) => {
                                            const value = Math.min(16, Math.max(1, parseInt(e.target.value) || 1));
                                            handleSettingsChange({
                                                numThreads: value
                                            });
                                        }}
                                        className="w-12 p-1 text-sm border rounded bg-gray-800 text-gray-200 border-gray-700 text-right"
                                    />
                                </div>
                            </label>

                            {/* Quantized Toggle */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <span className="text-xs font-medium text-gray-200">Use Quantized Model</span>
                                    <InfoIcon content={parameterDescriptions.quantized} />
                                </div>
                                <Switch
                                    checked={settings.quantized ?? true}
                                    onCheckedChange={(checked) => handleSettingsChange({ quantized: checked })}
                                />
                            </div>

                            {/* WebGPU Toggle */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <span className="text-xs font-medium text-gray-200">Use WebGPU</span>
                                    <InfoIcon content={parameterDescriptions.webGpu} />
                                </div>
                                <Switch
                                    checked={settings.webGpu ?? true}
                                    onCheckedChange={(checked) => handleSettingsChange({ webGpu: checked })}
                                />
                            </div>

                            {/* Transformers.js Optimization Toggles */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <span className="text-xs font-medium text-gray-200">Early Stopping</span>
                                    <InfoIcon content={parameterDescriptions.earlyStopping} />
                                </div>
                                <Switch
                                    checked={settings.earlyStopping || false}
                                    onCheckedChange={(checked) => handleSettingsChange({ earlyStopping: checked })}
                                    disabled={settings.serverUrl !== 'Transformers.js'}
                                />
                            </div>
                            
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <span className="text-xs font-medium text-gray-200">Stream Progress</span>
                                    <InfoIcon content={parameterDescriptions.streamProgress} />
                                </div>
                                <Switch
                                    checked={settings.streamProgress || false}
                                    onCheckedChange={(checked) => handleSettingsChange({ streamProgress: checked })}
                                    disabled={settings.serverUrl !== 'Transformers.js'}
                                />
                            </div>
                            
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <span className="text-xs font-medium text-gray-200">Use Cache</span>
                                    <InfoIcon content={parameterDescriptions.useCache} />
                                </div>
                                <Switch
                                    checked={settings.useCache ?? true}
                                    onCheckedChange={(checked) => handleSettingsChange({ useCache: checked })}
                                    disabled={settings.serverUrl !== 'Transformers.js'}
                                />
                            </div>
                            
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <span className="text-xs font-medium text-gray-200">Return Full Text</span>
                                    <InfoIcon content={parameterDescriptions.returnFullText} />
                                </div>
                                <Switch
                                    checked={settings.returnFullText || false}
                                    onCheckedChange={(checked) => handleSettingsChange({ returnFullText: checked })}
                                    disabled={settings.serverUrl !== 'Transformers.js'}
                                />
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'general' ? (
                    <GeneralSettingsView />
                ) : (
                    // Applications View
                    <div className="p-4 space-y-4">
                        <ApplicationsSettings />
                    </div>
                )}
            </div>
        </div>
    );
};

// Update the StatusRow component to be more compact
const StatusRow: React.FC<{ label: keyof typeof STATUS_INFO; status: string }> = ({ label, status }) => (
    <div className="flex items-center h-7 px-2.5 space-x-0.5 bg-gray-800 rounded-full text-gray-200 shrink-0">
        <span className="text-[10px] font-medium whitespace-nowrap">{STATUS_INFO[label].label}</span>
        <div className="flex items-center">
            <InfoIcon content={STATUS_INFO[label].description} />
        </div>
        <StatusIndicator status={status} />
    </div>
);

// Update StatusIndicator to be smaller
const StatusIndicator: React.FC<{ status: string }> = ({ status }) => {
    const getStatusColor = () => {
        switch (status) {
            case 'success':
                return 'bg-green-500';
            case 'error':
                return 'bg-red-500';
            case 'loading':
                return 'bg-yellow-700';
            case 'skipped':
                return 'bg-gray-700';
            default:
                return 'bg-gray-700';
        }
    };

    return (
        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
    );
};

export default APISettingsPanel;