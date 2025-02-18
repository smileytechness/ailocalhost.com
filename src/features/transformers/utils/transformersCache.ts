import { env, pipeline } from '@huggingface/transformers';
import type { PipelineType as HFPipelineType } from '@huggingface/transformers';
import { logTransformersActivity } from '../components/TransformersConsoleOutput';
import { formatBytes } from './transformersUtils';

/**
 * Configure the transformers.js environment for persistent caching
 */
export function configureCacheEnvironment() {
    // Enable browser caching
    env.useBrowserCache = true;
    env.useCustomCache = false;  // Use the built-in cache system
    env.cacheDir = 'transformers-cache';  // Use consistent cache directory name
    
    // Configure for browser environment
    env.allowLocalModels = false;  // We're in browser, so no local files
    env.allowRemoteModels = true;  // Allow downloading from HF

    logTransformersActivity({
        type: 'info',
        message: 'Cache system initialized',
        details: `Using cache directory: ${env.cacheDir}`
    });
}

/**
 * List all cached models
 */
export const listCachedModels = async () => {
    const cache = await caches.open('transformers-cache');
    const keys = await cache.keys();
    
    // Group files by model ID
    const modelFiles = new Map<string, { 
        files: Array<{ name: string; size: number }>;
        pipelineType?: string;
    }>();
    
    for (const key of keys) {
        const response = await cache.match(key);
        if (!response) continue;

        // Parse the model ID from the URL
        const url = new URL(key.url);
        const pathParts = url.pathname.split('/');
        const resolveIndex = pathParts.indexOf('resolve');
        
        let modelId;
        if (resolveIndex >= 2) {
            modelId = `${pathParts[resolveIndex - 2]}/${pathParts[resolveIndex - 1]}`;
        } else {
            continue;
        }

        const fileName = pathParts[pathParts.length - 1];
        const size = (await response.blob()).size;

        if (!modelFiles.has(modelId)) {
            const pipelineType = await getPipelineFromConfig(modelId);
            modelFiles.set(modelId, { 
                files: [],
                pipelineType: pipelineType || undefined
            });
        }
        
        modelFiles.get(modelId)?.files.push({
            name: fileName,
            size: size
        });
    }

    // Convert to array format
    return Array.from(modelFiles.entries()).map(([modelId, data]) => ({
        modelId,
        files: data.files,
        totalSize: data.files.reduce((sum, file) => sum + file.size, 0),
        pipelineType: data.pipelineType
    }));
};

/**
 * Check if a model is cached in browser storage
 */
export async function isModelCached(modelId: string): Promise<boolean> {
    const cache = await caches.open('transformers-cache');
    const keys = await cache.keys();
    
    // Check if any files exist for this model
    return keys.some(key => {
        const url = new URL(key.url);
        const pathParts = url.pathname.split('/');
        const resolveIndex = pathParts.indexOf('resolve');
        return resolveIndex >= 2 && 
            `${pathParts[resolveIndex - 2]}/${pathParts[resolveIndex - 1]}` === modelId;
    });
}

/**
 * Get the size of cached model files
 */
export async function getModelCacheSize(modelId: string): Promise<number> {
    const cache = await caches.open('transformers-cache');
    const keys = await cache.keys();
    
    // Calculate total size of all files for this model
    let totalSize = 0;
    for (const key of keys) {
        const url = new URL(key.url);
        const pathParts = url.pathname.split('/');
        const resolveIndex = pathParts.indexOf('resolve');
        if (resolveIndex >= 2 && 
            `${pathParts[resolveIndex - 2]}/${pathParts[resolveIndex - 1]}` === modelId) {
            const response = await cache.match(key);
            if (response) {
                const blob = await response.blob();
                totalSize += blob.size;
            }
        }
    }
    
    return totalSize;
}

/**
 * Get the total size of all cached models
 */
export async function getCacheSize(): Promise<number> {
    const cache = await caches.open('transformers-cache');
    const keys = await cache.keys();
    
    let totalSize = 0;
    for (const key of keys) {
        const response = await cache.match(key);
        if (response) {
            const blob = await response.blob();
            totalSize += blob.size;
        }
    }
    
    return totalSize;
}

/**
 * Delete a model from browser cache
 */
export async function deleteModelFromCache(modelId: string): Promise<void> {
    const cache = await caches.open('transformers-cache');
    const keys = await cache.keys();
    
    // Delete all files associated with this model
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
}

/**
 * Clear all models from browser cache
 */
export async function clearCache(): Promise<void> {
    await caches.delete('transformers-cache');
}

/**
 * Import a local ONNX model file into browser storage
 */
export async function importLocalModel(file: File): Promise<{ path: string; size: number }> {
    if (!file.name.endsWith('.onnx')) {
        throw new Error('Only ONNX model files are supported');
    }

    try {
        // Create a cache key for the model
        const modelId = `local--${file.name.replace('.onnx', '')}`;
        const cachePath = `transformers-cache/${modelId}`;
        
        // Configure environment for the new model
        env.cacheDir = cachePath;
        env.useCustomCache = true;
        env.useBrowserCache = true;

        // Store in Cache Storage
        const cache = await caches.open('transformers-cache');
        const modelResponse = new Response(file);
        await cache.put(`${cachePath}/model.onnx`, modelResponse);

        // Detect pipeline type
        const pipelineType = await detectAndStorePipelineType(modelId);

        // Create a basic config.json with pipeline type
        const config = {
            model_type: 'custom',
            architectures: ['CustomModel'],
            format: 'onnx',
            pipeline_type: pipelineType
        };
        const configResponse = new Response(JSON.stringify(config));
        await cache.put(`${cachePath}/config.json`, configResponse);

        logTransformersActivity({
            type: 'success',
            message: `Imported model: ${file.name}`,
            details: `Size: ${formatBytes(file.size)}${pipelineType ? `, Pipeline: ${pipelineType}` : ''}`
        });

        return {
            path: cachePath,
            size: file.size
        };
    } catch (error) {
        logTransformersActivity({
            type: 'error',
            message: `Failed to import model: ${file.name}`,
            details: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
    }
}

// Helper function to get pipeline type from config
export const getPipelineFromConfig = async (modelId: string): Promise<HFPipelineType | null> => {
    const cache = await caches.open('transformers-cache');
    const configResponse = await cache.match(`${modelId}/config.json`);
    if (configResponse) {
        const config = await configResponse.json();
        return config.pipeline_type || null;
    }
    return null;
};

// Define supported pipeline types - this is not complete, and does not seen to affect anything
const PIPELINE_TYPES: HFPipelineType[] = [
    'text-generation',
    'text-classification',
    'token-classification',
    'question-answering',
    'summarization',
    'translation',
    'image-classification',
    'image-segmentation',
    'object-detection',
    'image-to-text',
    'automatic-speech-recognition',
    'text-to-speech',
    'audio-classification',
    'feature-extraction',
    'fill-mask'
    // Remove unsupported pipeline types
];

type PipelineType = HFPipelineType;

// Detect pipeline type and store in config
export const detectAndStorePipelineType = async (modelId: string): Promise<PipelineType | null> => {
    try {
        // Try each pipeline type until one works
        for (const pipelineType of PIPELINE_TYPES) {
            try {
                await pipeline(
                    pipelineType, 
                    modelId
                );
                
                // If we get here, the pipeline type works
                // Update the config.json with the detected pipeline
                const cache = await caches.open('transformers-cache');
                const configResponse = await cache.match(`${modelId}/config.json`);
                if (configResponse) {
                    const config = await configResponse.json();
                    config.pipeline_type = pipelineType;
                    await cache.put(
                        `${modelId}/config.json`, 
                        new Response(JSON.stringify(config))
                    );
                }
                
                return pipelineType;
            } catch {
                continue; // Try next pipeline type
            }
        }
        return null;
    } catch (error) {
        console.error('Error detecting pipeline type:', error);
        return null;
    }
}; 