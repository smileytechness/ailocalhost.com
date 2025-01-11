import React, { useState, useEffect, useRef } from 'react';
import { FiTrash2, FiDownload, FiChevronDown, FiInfo, FiUpload, FiSettings, FiX } from 'react-icons/fi';
import { Tooltip } from '../../../components/ui/Tooltip';
import { DownloadState } from '../types/transformersTypes';
import TransformersConsoleOutput from './TransformersConsoleOutput';
import JSZip from 'jszip';
import {
    loadTransformersSettings,
    toggleWebGPU,
    loadTransformersUIState,
    saveTransformersUIState
} from '../utils/transformersLocalStorage';
import { logTransformersActivity } from './TransformersConsoleOutput';
import {
    downloadModel,
} from '../utils/transformersPipeline';
import {
    importLocalModel,
    getCacheSize,
    configureCacheEnvironment,
} from '../utils/transformersCache';
import { formatBytes } from '../utils/transformersUtils';
import { type PipelineType } from '@huggingface/transformers';

interface ModelListItemProps {
    modelId: string;
    files: Array<{ name: string; size: number }>;
    totalSize: number;
    onDelete: (modelId: string) => void;
    isExpanded: boolean;
    onExpandedChange: (expanded: boolean) => void;
}

const ModelListItem: React.FC<ModelListItemProps> = ({ modelId, files, totalSize, onDelete, isExpanded, onExpandedChange }) => {
    const handleFileDownload = async (fileName: string) => {
        try {
            const cache = await caches.open('transformers-cache');
            const keys = await cache.keys();
            
            // Find the correct file in cache
            const fileKey = keys.find(key => {
                const url = new URL(key.url);
                const pathParts = url.pathname.split('/');
                const resolveIndex = pathParts.indexOf('resolve');
                const isCorrectModel = resolveIndex >= 2 && 
                    `${pathParts[resolveIndex - 2]}/${pathParts[resolveIndex - 1]}` === modelId;
                return isCorrectModel && key.url.endsWith(fileName);
            });

            if (!fileKey) {
                console.error('File not found in cache');
                return;
            }

            const response = await cache.match(fileKey);
            if (!response) {
                console.error('File not found in cache');
                return;
            }

            // Get the file content as blob
            const blob = await response.blob();
            
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (error) {
            console.error('Failed to download file:', error);
        }
    };

    const handleDownloadAllFiles = async () => {
        try {
            const cache = await caches.open('transformers-cache');
            const keys = await cache.keys();
            
            // Get all files for this model
            const modelFiles = await Promise.all(
                keys
                    .filter(key => {
                        const url = new URL(key.url);
                        const pathParts = url.pathname.split('/');
                        const resolveIndex = pathParts.indexOf('resolve');
                        return resolveIndex >= 2 && 
                            `${pathParts[resolveIndex - 2]}/${pathParts[resolveIndex - 1]}` === modelId;
                    })
                    .map(async key => {
                        const response = await cache.match(key);
                        if (!response) return null;
                        const blob = await response.blob();
                        return { 
                            fileName: key.url.split('/').pop() || '',
                            blob,
                            cacheUrl: key.url // Store the full cache URL
                        };
                    })
            );

            // Filter out any null entries
            const validFiles = modelFiles.filter((f): f is { fileName: string; blob: Blob; cacheUrl: string } => f !== null);

            if (validFiles.length === 0) {
                console.error('No files found for model');
                return;
            }

            // Create cache metadata file
            const cacheMetadata = {
                modelId,
                files: validFiles.map(file => ({
                    fileName: file.fileName,
                    cacheUrl: file.cacheUrl
                })),
                exportedAt: new Date().toISOString()
            };

            // Create a zip file
            const zip = new JSZip();
            
            // Add model files
            validFiles.forEach(file => {
                zip.file(file.fileName, file.blob);
            });
            
            // Add metadata file
            zip.file('ailocalhost-cache-metadata.json', JSON.stringify(cacheMetadata, null, 2));

            // Generate and download the zip
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const url = window.URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${modelId.replace('/', '--')}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (error) {
            console.error('Failed to download all files:', error);
        }
    };

    return (
        <div className="relative px-4 py-2.5 hover:bg-gray-800/80 transition-colors border-b border-gray-700/50 last:border-0 group">
            <div className="flex-1 min-w-0 pr-10">
                <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-gray-200 truncate">
                        {modelId}
                    </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-400 whitespace-nowrap">{formatBytes(totalSize)}</span>
                    <span className="text-gray-500">•</span>
                    <button
                        onClick={() => onExpandedChange(!isExpanded)}
                        className="text-gray-400 hover:text-gray-300 flex items-center gap-1"
                    >
                        <FiChevronDown 
                            className={`w-3.5 h-3.5 transform transition-transform duration-200 ${
                                isExpanded ? 'rotate-180' : ''
                            }`}
                        />
                        {`${files.length} files`}
                    </button>
                    <span className="text-gray-500">•</span>
                    <button
                        onClick={handleDownloadAllFiles}
                        className="text-gray-400 hover:text-blue-400 flex items-center gap-1 transition-colors"
                        title="Download model files as ZIP"
                    >
                        <FiDownload className="w-3.5 h-3.5" />
                        Download
                    </button>
                </div>
            </div>
            <button
                onClick={() => onDelete(modelId)}
                className="absolute top-2.5 right-3 p-1 text-gray-400 hover:text-red-400 transition-colors flex-shrink-0"
                title="Delete model"
            >
                <FiTrash2 className="w-3.5 h-3.5" />
            </button>
            
            {isExpanded && (
                <div className="mt-2 pl-2 text-xs space-y-1.5">
                    {files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between text-gray-400 group/file">
                            <div className="flex items-center gap-2 truncate pr-4">
                                <button
                                    onClick={() => handleFileDownload(file.name)}
                                    className="text-gray-400 hover:text-blue-400 p-1 transition-colors"
                                    title="Download file"
                                >
                                    <FiDownload className="w-3 h-3" />
                                </button>
                                <span className="truncate">{file.name}</span>
                            </div>
                            <span className="ml-2 text-gray-500 flex-shrink-0">{formatBytes(file.size)}</span>
                        </div>
                    ))}
                    <div className="pt-1 mt-1 border-t border-gray-700/50 flex justify-between text-gray-400">
                        <span>Total size</span>
                        <span className="text-gray-500">{formatBytes(totalSize)}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

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

const PIPELINE_TYPES = [
    'audio-classification',
    'automatic-speech-recognition',
    'depth-estimation',
    'document-question-answering',
    'feature-extraction',
    'fill-mask',
    'image-classification',
    'image-feature-extraction',
    'image-segmentation',
    'image-to-image',
    'image-to-text',
    'object-detection',
    'question-answering',
    'summarization',
    'text-classification',
    'text-generation',
    'text-to-audio',
    'text2text-generation',
    'token-classification',
    'translation',
    'zero-shot-audio-classification',
    'zero-shot-classification',
    'zero-shot-image-classification',
    'zero-shot-object-detection'
] as const;

const PIPELINE_DESCRIPTIONS: Record<string, string> = {
    'audio-classification': 'Classify audio into categories',
    'automatic-speech-recognition': 'Convert speech to text',
    'depth-estimation': 'Estimate depth from 2D images',
    'document-question-answering': 'Answer questions about documents',
    'feature-extraction': 'Extract numerical features from text',
    'fill-mask': 'Predict masked/hidden words in text',
    'image-classification': 'Classify images into categories',
    'image-feature-extraction': 'Extract features from images',
    'image-segmentation': 'Identify regions in images',
    'image-to-image': 'Transform images',
    'image-to-text': 'Generate text descriptions of images',
    'object-detection': 'Detect and locate objects in images',
    'question-answering': 'Answer questions based on provided context',
    'summarization': 'Create concise summaries of longer texts',
    'text-classification': 'Classify text into categories',
    'text-generation': 'Generate text from a prompt',
    'text-to-audio': 'Convert text to audio',
    'text2text-generation': 'Transform text to text',
    'token-classification': 'Label individual words/tokens',
    'translation': 'Translate text between languages',
    'zero-shot-audio-classification': 'Classify audio without prior training',
    'zero-shot-classification': 'Classify text without prior training',
    'zero-shot-image-classification': 'Classify images without prior training',
    'zero-shot-object-detection': 'Detect objects without prior training'
};

const TransformersSettings: React.FC<TransformersSettingsProps> = ({
    isExpanded: propIsExpanded,
    onExpandedChange,
    logoOverlay
}) => {
    const [settings, setSettings] = useState(loadTransformersSettings());
    const [isExpanded, setIsExpanded] = useState(propIsExpanded ?? loadTransformersUIState().isExpanded);
    const [isModelsExpanded, setIsModelsExpanded] = useState(false);
    const [modelUrl, setModelUrl] = useState('');
    const [selectedPipeline, setSelectedPipeline] = useState<PipelineType | ''>('');
    const [downloadState, setDownloadState] = useState<DownloadState>({
        isDownloading: false,
        progress: 0,
        loaded: 0,
        total: null,
        status: 'cached'
    });
    const [cacheSize, setCacheSize] = useState(0);
    const [uiState] = useState(loadTransformersUIState());
    const fileInputRef = useRef<HTMLInputElement>(null);
    const modelsDropdownRef = useRef<HTMLDivElement>(null);
    const [expandedModelId, setExpandedModelId] = useState<string | null>(null);
    const [cachedModels, setCachedModels] = useState<Array<{
        id: string;
        modelId: string;
        files: Array<{ name: string; size: number }>;
        totalSize: number;
    }>>([]);

    // Initialize cache environment on mount
    useEffect(() => {
        configureCacheEnvironment();
    }, []);

    // Load cache size on mount and when models change
    useEffect(() => {
        getCacheSize().then(size => setCacheSize(size));
    }, [settings.models]);

    // Update expansion state when prop changes
    useEffect(() => {
        if (propIsExpanded !== undefined) {
            setIsExpanded(propIsExpanded);
        }
    }, [propIsExpanded]);

    // Handle click outside for models dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modelsDropdownRef.current && !modelsDropdownRef.current.contains(event.target as Node)) {
                setIsModelsExpanded(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Add this effect to handle closing expanded models when dropdown closes
    useEffect(() => {
        if (!isModelsExpanded) {
            setExpandedModelId(null);
        }
    }, [isModelsExpanded]);

    const handleToggleWebGPU = () => {
        toggleWebGPU(!settings.useWebGPU);
        setSettings(loadTransformersSettings());
        logTransformersActivity({
            type: 'info',
            message: `WebGPU ${settings.useWebGPU ? 'disabled' : 'enabled'}`
        });
    };

    // Function to get models directly from Cache Storage
    const getModelsFromCache = async () => {
        try {
            const cache = await caches.open('transformers-cache');
            const keys = await cache.keys();
            
            // Group files by model ID
            const modelFiles = new Map<string, { files: Array<{ name: string; size: number }>, totalSize: number }>();
            
            for (const key of keys) {
                const response = await cache.match(key);
                if (!response) continue;

                // Parse the model ID from the URL
                // URLs are in format: https://huggingface.co/Xenova/distilbert-base-uncased/resolve/...
                const url = new URL(key.url);
                const pathParts = url.pathname.split('/');
                const resolveIndex = pathParts.indexOf('resolve');
                
                let modelId;
                if (resolveIndex >= 2) {
                    // Get the two parts before 'resolve' for the model ID
                    modelId = `${pathParts[resolveIndex - 2]}/${pathParts[resolveIndex - 1]}`;
                } else {
                    // Fallback to the old format if 'resolve' is not found
                    const transformersCacheIndex = pathParts.indexOf('transformers-cache');
                    if (transformersCacheIndex >= 0 && transformersCacheIndex + 1 < pathParts.length) {
                        modelId = pathParts[transformersCacheIndex + 1];
                    } else {
                        continue; // Skip if we can't parse the model ID
                    }
                }

                const fileName = pathParts[pathParts.length - 1];
                const size = (await response.blob()).size;

                if (!modelFiles.has(modelId)) {
                    modelFiles.set(modelId, { files: [], totalSize: 0 });
                }
                
                const modelData = modelFiles.get(modelId)!;
                modelData.files.push({ name: fileName, size });
                modelData.totalSize += size;
            }

            return Array.from(modelFiles.entries()).map(([modelId, data]) => ({
                id: modelId,
                modelId: modelId,
                files: data.files.sort((a, b) => a.name.localeCompare(b.name)),
                totalSize: data.totalSize
            }));

        } catch (error) {
            console.error('Failed to get models from cache:', error);
            return [];
        }
    };

    // Refresh models list from cache
    const refreshModels = async () => {
        const models = await getModelsFromCache();
        setCachedModels(models);
        
        // Update total cache size
        const totalSize = models.reduce((sum, model) => sum + model.totalSize, 0);
        setCacheSize(totalSize);
    };

    // Refresh on component mount
    useEffect(() => {
        refreshModels();
    }, []);

    // Handle models dropdown click
    const handleModelsDropdownClick = () => {
        if (!isModelsExpanded) {
            refreshModels();
        }
        setIsModelsExpanded(!isModelsExpanded);
    };

    // Handle successful model download
    const handleDownloadModel = async () => {
        if (!selectedPipeline) {
            logTransformersActivity({
                type: 'error',
                message: 'Please select a pipeline type'
            });
            return;
        }

        const modelId = modelUrl.trim();
        if (!modelId) {
            logTransformersActivity({
                type: 'error',
                message: 'Please enter a model ID'
            });
            return;
        }

        let isCancelled = false;
        setDownloadState({
            isDownloading: true,
            progress: 0,
            loaded: 0,
            total: null,
            status: 'downloading'
        });

        try {
            // Download the model
            await downloadModel(modelId, selectedPipeline, (progress) => {
                if (isCancelled) return;
                
                // Round the loaded value to reduce flickering
                const roundedLoaded = Math.floor(progress.loaded / 1024) * 1024;
                
                setDownloadState(prev => ({
                    ...prev,
                    ...progress,
                    loaded: roundedLoaded,
                    status: progress.status === 'complete' && progress.progress === 1 
                        ? 'complete' 
                        : 'downloading'
                }));
            });

            if (!isCancelled) {
                await refreshModels();
                setModelUrl('');
                
                logTransformersActivity({
                    type: 'success',
                    message: `Successfully downloaded ${modelId}`,
                    details: `Pipeline: ${selectedPipeline}`
                });

                setDownloadState(prev => ({
                    ...prev,
                    isDownloading: false,
                    status: 'complete'
                }));

                setTimeout(() => {
                    setDownloadState({
                        isDownloading: false,
                        progress: 0,
                        loaded: 0,
                        total: null,
                        status: 'ready'
                    });
                }, 2000);
            }
        } catch (error) {
            console.error(error);
            logTransformersActivity({
                type: 'error',
                message: `Failed to download model: ${modelId}`,
                details: error instanceof Error ? error.message : 'Unknown error'
            });
            setDownloadState({
                isDownloading: false,
                progress: 0,
                loaded: 0,
                total: null,
                status: 'error'
            });
        }
    };

    // Handle model deletion
    const handleDeleteModel = async (modelId: string) => {
        if (!window.confirm(
            'Are you sure you want to delete this model? This will remove all associated files from the browser cache.'
        )) return;

        try {
            const cache = await caches.open('transformers-cache');
            const keys = await cache.keys();
            
            // Delete all files for this model
            const deletionPromises = keys
                .filter(key => {
                    const url = new URL(key.url);
                    const pathParts = url.pathname.split('/');
                    const resolveIndex = pathParts.indexOf('resolve');
                    return resolveIndex >= 2 && 
                           `${pathParts[resolveIndex - 2]}/${pathParts[resolveIndex - 1]}` === modelId;
                })
                .map(key => cache.delete(key));
            
            await Promise.all(deletionPromises);
            
            // Refresh the models list
            await refreshModels();
            
            logTransformersActivity({
                type: 'success',
                message: `Deleted model: ${modelId}`
            });
        } catch (error) {
            console.error('Failed to delete model:', error);
            logTransformersActivity({
                type: 'error',
                message: `Failed to delete model: ${modelId}`,
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    // Handle delete all models
    const handleDeleteAllModels = async () => {
        if (cachedModels.length === 0) return;
        
        if (!window.confirm(
            'Are you sure you want to remove ALL models and their files from the browser cache? ' +
            'If you want to use any of these models later, you will need to download them again.'
        )) return;
        
        try {
            await caches.delete('transformers-cache');
            await refreshModels();
            
            logTransformersActivity({
                type: 'success',
                message: 'All models deleted'
            });
        } catch (error) {
            logTransformersActivity({
                type: 'error',
                message: 'Failed to delete all models',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    const canDownload = modelUrl.trim() !== '';

    const getPipelineDescription = (pipeline: string): string => {
        return PIPELINE_DESCRIPTIONS[pipeline] || 'Process inputs using the selected pipeline type';
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setDownloadState(prev => ({
                ...prev,
                progress: 0,
                loaded: 0,
                total: file.size,
                status: 'processing',
                isDownloading: true
            }));

            if (file.name.endsWith('.zip')) {
                // Handle ZIP import
                const zip = await JSZip.loadAsync(file);
                
                // Read metadata file
                const metadataFile = zip.file('ailocalhost-cache-metadata.json');
                if (!metadataFile) {
                    throw new Error('Invalid model archive: missing ailocalhost-cache-metadata.json');
                }

                const metadata = JSON.parse(await metadataFile.async('string'));
                
                // Open cache
                const cache = await caches.open('transformers-cache');
                
                // Process each file
                let processed = 0;
                const totalFiles = metadata.files.length;
                
                for (const fileInfo of metadata.files) {
                    const zipFile = zip.file(fileInfo.fileName);
                    if (!zipFile) continue;

                    const blob = await zipFile.async('blob');
                    const response = new Response(blob);
                    await cache.put(fileInfo.cacheUrl, response);

                    processed++;
                    setDownloadState(prev => ({
                        ...prev,
                        progress: processed / totalFiles,
                        loaded: processed,
                        total: totalFiles,
                        status: 'processing'
                    }));
                }

                // Refresh the models list
                await refreshModels();

                logTransformersActivity({
                    type: 'success',
                    message: `Successfully imported model: ${metadata.modelId}`,
                    details: `Imported ${processed} files`
                });

            } else if (file.name.endsWith('.onnx')) {
                // Handle single ONNX file import
                if (!selectedPipeline) {
                    throw new Error('Please select a pipeline type before importing a model');
                }

                // Import the model
                const { size } = await importLocalModel(file);
                
                logTransformersActivity({
                    type: 'success',
                    message: `Successfully imported model: ${file.name}`,
                    details: `Size: ${formatBytes(size)}`
                });
            } else {
                throw new Error('Unsupported file type. Please import a .onnx model file or a .zip model archive.');
            }

        } catch (error) {
            console.error('Import error:', error);
            logTransformersActivity({
                type: 'error',
                message: `Failed to import file: ${file.name}`,
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        } finally {
            setDownloadState({
                isDownloading: false,
                progress: 0,
                loaded: 0,
                total: null,
                status: 'complete'
            });
            
            // Clear the file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleExpandToggle = () => {
        const newExpanded = !isExpanded;
        setIsExpanded(newExpanded);
        onExpandedChange?.(newExpanded);
        saveTransformersUIState({ isExpanded: newExpanded });
    };

    return (
        <div className="space-y-4">
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
            <div className={`overflow-visible transition-all duration-300 ease-in-out ${
                isExpanded ? 'max-h-[calc(100vh-8rem)] opacity-100' : 'max-h-0 opacity-0'
            }`}>
                <div className="space-y-2 overflow-y-auto">
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
                    <div className="relative" ref={modelsDropdownRef}>
                        <button
                            onClick={handleModelsDropdownClick}
                            className={`w-full px-3 py-2 text-sm rounded-lg flex items-center justify-between transition-colors ${
                                isModelsExpanded 
                                    ? 'bg-gray-700 text-gray-200' 
                                    : 'bg-gray-800/50 text-gray-200 hover:bg-gray-800/70'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <span className="font-medium">Installed Models</span>
                                <span className="px-1.5 py-0.5 bg-gray-900 text-xs rounded-full text-gray-400">
                                    {cachedModels.length} • {formatBytes(cacheSize)}
                                </span>
                            </div>
                            <FiChevronDown 
                                className={`w-4 h-4 transform transition-transform duration-200 ${
                                    isModelsExpanded ? 'rotate-180' : ''
                                }`} 
                            />
                        </button>

                        <div 
                            className={`absolute top-full left-0 right-0 mt-1 transform transition-all duration-200 origin-top z-50
                                       ${isModelsExpanded 
                                           ? 'opacity-100 translate-y-0 scale-100' 
                                           : 'opacity-0 translate-y-2 scale-95 pointer-events-none'}`}
                        >
                            <div className="bg-gray-900 rounded-lg shadow-xl border border-gray-700 overflow-hidden">
                                {/* Header with Delete All */}
                                {cachedModels.length > 0 && (
                                    <div className="p-2 border-b border-gray-700 flex justify-between items-center">
                                        <span className="text-xs text-gray-400">
                                            {cachedModels.length} model{cachedModels.length !== 1 ? 's' : ''} • {formatBytes(cacheSize)}
                                        </span>
                                        <button
                                            onClick={handleDeleteAllModels}
                                            className="px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded transition-colors flex items-center gap-1"
                                        >
                                            <FiTrash2 className="w-3 h-3" />
                                            Delete All
                                        </button>
                                    </div>
                                )}
                                
                                <div className="max-h-[400px] overflow-y-auto">
                                    {cachedModels.map(model => (
                                        <ModelListItem 
                                            key={model.id} 
                                            modelId={model.id} 
                                            files={model.files} 
                                            totalSize={model.totalSize} 
                                            onDelete={handleDeleteModel}
                                            isExpanded={expandedModelId === model.id}
                                            onExpandedChange={(expanded) => {
                                                setExpandedModelId(expanded ? model.id : null);
                                            }}
                                        />
                                    ))}
                                    
                                    {cachedModels.length === 0 && (
                                        <div className="text-sm text-gray-400 text-center py-8">
                                            No installed models
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* HF Model Settings */}
                    <div className="p-3 bg-gray-800/50 rounded-lg space-y-2">
                        {/* HF Model Name */}
                        <div className="flex items-center">
                            <label className="text-xs font-medium text-gray-200 w-24 flex items-center gap-1">
                                Model ID
                                <span className="text-red-400">*</span>
                                <Tooltip content="Download models to run directly in your browser using the transformers.js ONNX Runtime.  
                                  
Use this link to find supported models: [Transformers.js | ONNX  Models](https://huggingface.co/models?library=transformers.js,onnx&sort=trending)  
  
Copy the model name, and be sure to note the correct pipline classification to download.">
                                    <FiInfo className="w-3.5 h-3.5 text-gray-500" />
                                </Tooltip>
                            </label>
                            <input
                                type="text"
                                value={modelUrl}
                                onChange={(e) => setModelUrl(e.target.value)}
                                placeholder="e.g. Xenova/whisper-base"
                                className="flex-1 p-1.5 text-sm border rounded bg-gray-800 text-gray-200 border-gray-700"
                            />
                        </div>

                        {/* Pipeline Selection */}
                        <div className="flex items-center">
                            <label className="text-xs font-medium text-gray-200 w-24 flex items-center gap-1">
                                Pipeline
                                <span className="text-red-400">*</span>
                                <Tooltip content="Select the appropriate pipeline type for your model. This determines how the model will process inputs and outputs.">
                                    <FiInfo className="w-3.5 h-3.5 text-gray-500" />
                                </Tooltip>
                            </label>
                            <div className="flex-1 relative">
                                <select
                                    value={selectedPipeline}
                                    onChange={(e) => setSelectedPipeline(e.target.value as PipelineType)}
                                    className="w-full p-1.5 text-sm border rounded bg-gray-800 text-gray-200 border-gray-700 appearance-none"
                                >
                                    <option value="">Select a pipeline type</option>
                                    {PIPELINE_TYPES.map((pipeline) => (
                                        <option key={pipeline} value={pipeline} className="text-gray-200">
                                            {pipeline}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                                    <FiChevronDown className="h-4 w-4 text-gray-400" />
                                </div>
                            </div>
                        </div>

                        {/* Pipeline Description */}
                        {selectedPipeline && (
                            <div className="text-[10px] text-gray-400 mt-1 text-right">
                                {getPipelineDescription(selectedPipeline)}
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex justify-between gap-2 mb-3">
                            <div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    accept=".onnx,.zip"
                                    className="hidden"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 
                                             rounded-lg text-sm transition-colors flex items-center gap-2"
                                >
                                    <FiUpload className="w-4 h-4" />
                                    File Import
                                </button>
                            </div>
                            {downloadState.isDownloading || downloadState.status === 'downloading' || downloadState.status === 'processing' ? (
                                <button
                                    onClick={() => {
                                        // Set cancelled state
                                        setDownloadState({
                                            isDownloading: false,
                                            progress: 0,
                                            loaded: 0,
                                            total: null,
                                            status: 'cancelled'
                                        });
                                        
                                        // Log cancellation
                                        logTransformersActivity({
                                            type: 'info',
                                            message: 'Download cancelled by user'
                                        });
                                        
                                        // Reset to ready state after 2 seconds
                                        setTimeout(() => {
                                            setDownloadState({
                                                isDownloading: false,
                                                progress: 0,
                                                loaded: 0,
                                                total: null,
                                                status: 'ready'
                                            });
                                        }, 2000);
                                    }}
                                    className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white 
                                             rounded-lg text-sm transition-colors flex items-center gap-2"
                                >
                                    <FiX className="w-4 h-4" />
                                    Cancel
                                </button>
                            ) : (
                                <button
                                    onClick={handleDownloadModel}
                                    disabled={!canDownload}
                                    className="px-3 py-1.5 text-white rounded-lg text-sm transition-colors 
                                             flex items-center gap-2 bg-blue-500 hover:bg-blue-600"
                                >
                                    <FiDownload className="w-4 h-4" />
                                    Download
                                </button>
                            )}
                        </div>

                        {/* Download Progress - Always visible */}
                        <div className={`border rounded-lg p-3 transition-colors duration-300 ${
                            downloadState.status === 'complete' 
                                ? 'border-green-500/50 bg-green-500/10' 
                                : downloadState.status === 'cancelled'
                                    ? 'border-red-500/50 bg-red-500/10'
                                    : 'border-gray-700 bg-gray-800/50'
                        }`}>
                            <div className="space-y-2">
                                {/* Top status bar - with fixed width for stability */}
                                <div className="flex justify-between w-full">
                                    <span className="text-gray-300 capitalize text-xs">{downloadState.status}</span>
                                    <div className="text-gray-400 text-xs">
                                        <div className="flex gap-2">
                                            <div className="min-w-[50px]">
                                                {downloadState.loaded ? formatBytes(downloadState.loaded) : '0 B'}
                                            </div>
                                            <span>/</span>
                                            <div className="min-w-[50px]">
                                                {downloadState.total ? formatBytes(downloadState.total) : '0 B'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Overall progress */}
                                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full transition-all duration-300 ${
                                            downloadState.status === 'complete'
                                                ? 'bg-green-500'
                                                : 'bg-blue-500'
                                        }`}
                                        style={{ 
                                            width: `${downloadState.progress * 100}%`,
                                            transition: 'width 200ms ease-out'
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Console */}
                    <div>
                        <TransformersConsoleOutput 
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