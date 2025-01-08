import React, { useState, useEffect, useRef } from 'react';
import { FiTrash2, FiDownload, FiChevronDown, FiInfo, FiUpload, FiSettings } from 'react-icons/fi';
import { Tooltip } from './ui/Tooltip';
import { TransformersModel } from '../types/transformers';
import TransformersConsole from './TransformersConsole';
import {
    loadTransformersSettings,
    saveTransformersSettings,
    addTransformersModel,
    deleteTransformersModel,
    toggleWebGPU,
    getTransformersStorageUsage,
    loadTransformersUIState,
    saveTransformersUIState
} from '../utils/transformersStorage';
import { logTransformersActivity } from './TransformersConsole';
import {
    PIPELINE_TYPES,
    configureTransformersEnvironment,
    downloadModel,
    getModelInfo,
    isValidModelId,
    type TransformersPipelineType
} from '../utils/transformers';

const WHISPER_MODEL = {
    name: 'Whisper Base',
    modelId: 'onnx-community/whisper-base',
    details: 'Automatic speech recognition model',
    size: 152 * 1024 * 1024, // 152MB approximation
    pipelineType: 'automatic-speech-recognition' as TransformersPipelineType
};

interface ModelListItemProps {
    model: TransformersModel;
    onDelete: (id: string) => void;
}

const ModelListItem: React.FC<ModelListItemProps> = ({ model, onDelete }) => (
    <div className="p-2 flex items-center justify-between hover:bg-gray-800/30 rounded-lg">
        <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm text-gray-200 truncate">{model.name}</h4>
            <div className="flex items-center text-xs text-gray-400 gap-2">
                <span>{(model.size / (1024 * 1024)).toFixed(1)} MB</span>
                <span>•</span>
                <span className="truncate">{model.details}</span>
            </div>
        </div>
        <button
            onClick={() => onDelete(model.id)}
            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors ml-2 flex-shrink-0"
            title="Delete Model"
        >
            <FiTrash2 className="w-3.5 h-3.5" />
        </button>
    </div>
);

interface LogoProps {
    src: string;
    alt: string;
    className?: string;
}

interface TransformersSettingsProps {
    isExpanded?: boolean;
    onExpandedChange?: (expanded: boolean) => void;
    logoOverlay?: LogoProps[];
}

const TransformersSettings: React.FC<TransformersSettingsProps> = ({
    isExpanded: propIsExpanded,
    onExpandedChange,
    logoOverlay
}) => {
    const [settings, setSettings] = useState(loadTransformersSettings());
    const [uiState, setUIState] = useState(loadTransformersUIState());
    const [isExpanded, setIsExpanded] = useState(propIsExpanded ?? uiState.isExpanded);
    const [isModelsExpanded, setIsModelsExpanded] = useState(false);
    const [modelUrl, setModelUrl] = useState('');
    const [selectedPipeline, setSelectedPipeline] = useState<TransformersPipelineType>('automatic-speech-recognition');
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Update expansion state when prop changes
    useEffect(() => {
        if (propIsExpanded !== undefined) {
            setIsExpanded(propIsExpanded);
        }
    }, [propIsExpanded]);

    // Save UI state when it changes
    useEffect(() => {
        saveTransformersUIState({ isExpanded });
        setUIState(prev => ({ ...prev, isExpanded }));
    }, [isExpanded]);

    // Update parent component's tab state
    useEffect(() => {
        const handleTabChange = (event: CustomEvent<string>) => {
            saveTransformersUIState({ selectedTab: event.detail });
        };

        window.addEventListener('settingsTabChange', handleTabChange as EventListener);
        return () => {
            window.removeEventListener('settingsTabChange', handleTabChange as EventListener);
        };
    }, []);

    useEffect(() => {
        const handleSettingsUpdate = () => {
            setSettings(loadTransformersSettings());
        };

        window.addEventListener('transformersSettingsUpdated', handleSettingsUpdate);
        return () => {
            window.removeEventListener('transformersSettingsUpdated', handleSettingsUpdate);
        };
    }, []);

    const handleToggleWebGPU = () => {
        toggleWebGPU(!settings.useWebGPU);
        setSettings(loadTransformersSettings());
        logTransformersActivity({
            type: 'info',
            message: `WebGPU ${settings.useWebGPU ? 'disabled' : 'enabled'}`
        });
    };

    const handleDeleteModel = (id: string) => {
        const model = settings.models.find(m => m.id === id);
        if (model) {
            deleteTransformersModel(id);
            setSettings(loadTransformersSettings());
            logTransformersActivity({
                type: 'info',
                message: `Deleted model: ${model.name}`
            });
        }
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        logTransformersActivity({
            type: 'info',
            message: `Importing model from file: ${file.name}`
        });

        try {
            // TODO: Implement actual file import logic
            const mockModel: Omit<TransformersModel, 'id' | 'timestamp'> = {
                name: file.name,
                details: 'Imported model',
                size: file.size,
                source: 'local',
                format: 'onnx'
            };
            addTransformersModel(mockModel);
            setSettings(loadTransformersSettings());
            logTransformersActivity({
                type: 'success',
                message: `Successfully imported model: ${file.name}`
            });
        } catch (error) {
            logTransformersActivity({
                type: 'error',
                message: `Failed to import model: ${file.name}`,
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    const handleDownloadModel = async () => {
        let modelId = modelUrl;
        let pipelineType = selectedPipeline;
        
        // If it's the pre-listed Whisper model button click
        if (!modelId && !modelUrl) {
            modelId = WHISPER_MODEL.modelId;
            pipelineType = WHISPER_MODEL.pipelineType;
        }

        // Validate model ID/URL
        if (!modelId || !isValidModelId(modelId)) {
            logTransformersActivity({
                type: 'error',
                message: 'Invalid model ID format. Must be "org/model-name" or a URL'
            });
            return;
        }

        setIsDownloading(true);
        setDownloadProgress(0);

        logTransformersActivity({
            type: 'network',
            message: `Starting download: ${modelId}`
        });

        try {
            // Configure environment
            configureTransformersEnvironment(settings.useWebGPU);

            // Download and initialize the model
            const pipe = await downloadModel(modelId, pipelineType, (progress) => {
                setDownloadProgress(Math.round(progress * 100));
            });

            // Get model info
            const { size, description } = getModelInfo(pipe, WHISPER_MODEL.size);
            
            const model: Omit<TransformersModel, 'id' | 'timestamp'> = {
                name: modelId.split('/').pop() || 'Unknown Model',
                details: description,
                size,
                source: 'huggingface',
                format: 'onnx'
            };

            addTransformersModel(model);
            setSettings(loadTransformersSettings());
            setModelUrl('');

            logTransformersActivity({
                type: 'success',
                message: `Successfully downloaded model: ${modelId}`,
                details: `Model size: ${(model.size / (1024 * 1024)).toFixed(1)}MB`
            });
        } catch (error) {
            logTransformersActivity({
                type: 'error',
                message: `Failed to download model: ${modelId}`,
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        } finally {
            setIsDownloading(false);
            setDownloadProgress(0);
        }
    };

    const canDownload = modelUrl.trim() !== '' && selectedPipeline !== undefined;

    const handleDeleteAllModels = () => {
        if (settings.models.length === 0) return;
        
        settings.models.forEach(model => {
            logTransformersActivity({
                type: 'info',
                message: `Deleting model: ${model.name}`
            });
        });

        const newSettings = { ...settings, models: [] };
        saveTransformersSettings(newSettings);
        setSettings(newSettings);
        
        logTransformersActivity({
            type: 'success',
            message: 'All models deleted'
        });
    };

    const handleExpandToggle = () => {
        const newExpanded = !isExpanded;
        setIsExpanded(newExpanded);
        onExpandedChange?.(newExpanded);
        saveTransformersUIState({ isExpanded: newExpanded });
    };

    return (
        <div className="space-y-2 max-w-3xl">
            {/* Header with enable/disable toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                    {logoOverlay ? (
                        <div className="flex items-center">
                            <div className="relative w-16 h-16 rounded-lg bg-gray-900/50 p-2 flex items-center justify-center">
                                {logoOverlay.map((logo, index) => (
                                    <img
                                        key={index}
                                        src={logo.src}
                                        alt={logo.alt}
                                        className={`${logo.className} ${index === 1 ? 'absolute' : ''}`}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : null}
                    <div>
                        <h3 className="text-base font-medium text-gray-200">Transformers.js x ONNX</h3>
                        <p className="text-sm text-gray-400">Machine learning models in your browser</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleExpandToggle}
                        className="p-2 hover:bg-gray-700 rounded-lg transition-all duration-200 transform"
                    >
                        <FiSettings 
                            className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${
                                isExpanded ? 'rotate-90' : ''
                            }`}
                        />
                    </button>
                </div>
            </div>

            {/* Expanded settings */}
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isExpanded ? 'max-h-[calc(100vh-16rem)] opacity-100' : 'max-h-0 opacity-0'
            }`}>
                <div className="space-y-2">
                    {/* WebGPU Settings */}
                    <div className="p-3 bg-gray-800/50 rounded-lg">
                        <label className="block text-xs font-medium mb-1 flex items-center justify-between text-gray-200">
                            <div className="flex items-center">
                                <span>Use WebGPU</span>
                                <Tooltip content="WebGPU can significantly improve performance when available">
                                    <FiInfo className="w-3.5 h-3.5 text-gray-500 ml-1" />
                                </Tooltip>
                            </div>
                            <div className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 
                                ${settings.useWebGPU ? 'bg-blue-600' : 'bg-gray-600'}`}
                                onClick={handleToggleWebGPU}
                                role="switch"
                                aria-checked={settings.useWebGPU}
                            >
                                <div className={`w-4 h-4 rounded-full bg-white transform transition-transform duration-200 
                                    ${settings.useWebGPU ? 'translate-x-5' : 'translate-x-0'}`} 
                                />
                            </div>
                        </label>
                    </div>

                    {/* Models Section */}
                    <div className="relative">
                        <button
                            onClick={() => setIsModelsExpanded(!isModelsExpanded)}
                            className="w-full px-3 py-2 bg-gray-800/50 hover:bg-gray-800/70 rounded-lg text-sm text-gray-200 
                                     flex items-center justify-between transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <span className="font-medium">Installed Models</span>
                                <span className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">
                                    {settings.models.length} • {(getTransformersStorageUsage() / (1024 * 1024)).toFixed(1)} MB
                                </span>
                            </div>
                            <FiChevronDown className={`w-4 h-4 transform transition-transform ${isModelsExpanded ? 'rotate-180' : ''}`} />
                        </button>

                        {isModelsExpanded && (
                            <div className="absolute w-full mt-1 bg-gray-800 rounded-lg border border-gray-700 shadow-lg overflow-hidden z-50">
                                {/* Header with Delete All */}
                                {settings.models.length > 0 && (
                                    <div className="p-2 border-b border-gray-700 flex justify-between items-center">
                                        <span className="text-xs text-gray-400">
                                            {settings.models.length} model{settings.models.length !== 1 ? 's' : ''} installed
                                        </span>
                                        <button
                                            onClick={handleDeleteAllModels}
                                            className="px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-400/10 
                                                     rounded transition-colors flex items-center gap-1"
                                        >
                                            <FiTrash2 className="w-3 h-3" />
                                            Delete All
                                        </button>
                                    </div>
                                )}

                                {/* Pre-listed Whisper Model */}
                                {!settings.models.some(m => m.name.toLowerCase().includes('whisper')) && (
                                    <div className="p-2 hover:bg-gray-700">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-medium text-sm text-gray-200 truncate">{WHISPER_MODEL.name}</h4>
                                                <div className="flex items-center text-xs text-gray-400 gap-2">
                                                    <span>{(WHISPER_MODEL.size / (1024 * 1024)).toFixed(1)} MB</span>
                                                    <span>•</span>
                                                    <span className="truncate">{WHISPER_MODEL.details}</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={handleDownloadModel}
                                                disabled={isDownloading}
                                                className="px-2 py-1 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 
                                                         text-white rounded-lg transition-colors flex items-center gap-1 ml-2 flex-shrink-0"
                                            >
                                                <FiDownload className="w-3 h-3" />
                                                Download
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Installed Models List */}
                                {settings.models.map((model) => (
                                    <div key={model.id} className="p-2 hover:bg-gray-700 border-t border-gray-700">
                                        <ModelListItem model={model} onDelete={handleDeleteModel} />
                                    </div>
                                ))}
                                {settings.models.length === 0 && !isDownloading && (
                                    <p className="text-sm text-gray-400 text-center py-3">
                                        No models installed yet
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* HF Model Settings */}
                    <div className="p-3 bg-gray-800/50 rounded-lg space-y-2">
                        {/* HF Model Name */}
                        <div className="flex items-center">
                            <label className="text-xs font-medium text-gray-200 w-24">
                                HF Model
                            </label>
                            <input
                                type="text"
                                value={modelUrl}
                                onChange={(e) => setModelUrl(e.target.value)}
                                placeholder="e.g., onnx-community/whisper-base"
                                className="flex-1 p-1.5 text-sm border rounded bg-gray-800 text-gray-200 border-gray-700"
                            />
                        </div>

                        {/* Pipeline Selection */}
                        <div className="flex items-center">
                            <label className="text-xs font-medium text-gray-200 w-24">
                                Pipeline
                            </label>
                            <div className="flex-1 relative">
                                <select
                                    value={selectedPipeline}
                                    onChange={(e) => setSelectedPipeline(e.target.value as TransformersPipelineType)}
                                    className="w-full p-1.5 text-sm border rounded bg-gray-800 text-gray-200 border-gray-700 appearance-none"
                                >
                                    <option value="" disabled>Select Pipeline</option>
                                    {Object.entries(PIPELINE_TYPES).map(([type, label]) => (
                                        <option key={type} value={type}>{label}</option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                                    <FiChevronDown className="h-4 w-4 text-gray-400" />
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-2">
                            <div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    accept=".onnx"
                                    className="hidden"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 
                                             rounded-lg text-sm transition-colors flex items-center gap-2"
                                >
                                    <FiUpload className="w-4 h-4" />
                                    Import from file
                                </button>
                            </div>
                            <button
                                onClick={handleDownloadModel}
                                disabled={isDownloading || !canDownload}
                                className={`px-3 py-1.5 text-white rounded-lg text-sm transition-colors flex items-center gap-2
                                         ${isDownloading ? 'bg-gray-600' : 'bg-blue-500 hover:bg-blue-600'}`}
                            >
                                <FiDownload className="w-4 h-4" />
                                {isDownloading ? 'Downloading...' : 'Download'}
                            </button>
                        </div>

                        {/* Download Progress */}
                        {isDownloading && (
                            <div className="space-y-1">
                                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-blue-600 transition-all duration-300"
                                        style={{ width: `${downloadProgress}%` }}
                                    />
                                </div>
                                <div className="text-xs text-gray-400 text-right">
                                    {downloadProgress}%
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Console */}
                    <div>
                        <TransformersConsole 
                            onClose={() => {}} 
                            defaultMinimized={!uiState.isConsoleExpanded}
                            onMinimizedChange={(minimized) => {
                                saveTransformersUIState({ isConsoleExpanded: !minimized });
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TransformersSettings; 