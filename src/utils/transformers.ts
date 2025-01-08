import { pipeline, env } from '@huggingface/transformers';
import { logTransformersActivity } from '../components/TransformersConsole';

/**
 * Available pipeline types in transformers.js
 * See: https://huggingface.co/docs/transformers.js/pipelines
 */
export const PIPELINE_TYPES = {
    'automatic-speech-recognition': 'Automatic Speech Recognition',
    'text-classification': 'Text Classification',
    'token-classification': 'Token Classification',
    'question-answering': 'Question Answering',
    'zero-shot-classification': 'Zero Shot Classification',
    'text-generation': 'Text Generation',
    'feature-extraction': 'Feature Extraction',
    'fill-mask': 'Fill Mask',
    'summarization': 'Summarization',
    'translation': 'Translation',
    'text2text-generation': 'Text2Text Generation',
    'zero-shot-image-classification': 'Zero Shot Image Classification',
} as const;

export type TransformersPipelineType = keyof typeof PIPELINE_TYPES;

type Pipeline = {
    model: {
        config: Record<string, any>;
    };
    task: string;
};

/**
 * Configure transformers.js environment settings
 */
export function configureTransformersEnvironment(useWebGPU: boolean = false) {
    // Enable browser caching
    env.useBrowserCache = true;
    env.useCustomCache = true;
    env.cacheDir = 'transformers-cache';

    // Configure backend
    const backends = env.backends as { 
        webgpu?: { isSupported?: boolean; isEnabled?: boolean }; 
        onnx?: { wasm?: { numThreads: number } } 
    };
    
    // Enable WebGPU if supported and requested
    if (useWebGPU && backends.webgpu?.isSupported) {
        logTransformersActivity({
            type: 'info',
            message: 'Using WebGPU backend'
        });
        if (backends.webgpu) {
            backends.webgpu.isEnabled = true;
        }
    }

    // Configure ONNX WASM threads
    if (backends.onnx?.wasm) {
        backends.onnx.wasm.numThreads = 4;
    }
}

/**
 * Download and initialize a model from Hugging Face
 * @param modelId - The Hugging Face model ID (e.g., 'onnx-community/whisper-base')
 * @param pipelineType - The type of pipeline to use
 * @param progressCallback - Callback for download progress
 */
export async function downloadModel<T extends TransformersPipelineType>(
    modelId: string, 
    pipelineType: T,
    progressCallback?: (progress: number) => void
): Promise<Pipeline> {
    logTransformersActivity({
        type: 'info',
        message: `Initializing ${pipelineType} pipeline for model: ${modelId}`
    });

    try {
        const pipe = await pipeline(pipelineType, modelId, {
            progress_callback: (progressInfo) => {
                // Handle both download and initialization progress
                let progress = 0;
                
                if ('progress' in progressInfo && typeof progressInfo.progress === 'number') {
                    progress = progressInfo.progress;
                } else if (
                    'loaded' in progressInfo && 
                    'total' in progressInfo && 
                    typeof progressInfo.loaded === 'number' && 
                    typeof progressInfo.total === 'number' &&
                    progressInfo.total > 0
                ) {
                    progress = progressInfo.loaded / progressInfo.total;
                }
                
                progressCallback?.(progress);
                logTransformersActivity({
                    type: 'network',
                    message: `Download progress: ${Math.round(progress * 100)}%`
                });
            }
        });

        logTransformersActivity({
            type: 'success',
            message: `Successfully initialized pipeline for: ${modelId}`
        });

        return pipe as unknown as Pipeline;
    } catch (error) {
        logTransformersActivity({
            type: 'error',
            message: `Failed to initialize pipeline: ${error instanceof Error ? error.message : String(error)}`
        });
        throw error;
    }
}

/**
 * Get model information from a pipeline
 * @param pipe - The initialized pipeline
 * @param fallbackSize - Fallback size if not available in config
 */
export function getModelInfo(pipe: Pipeline, fallbackSize: number) {
    const config = pipe.model.config;
    
    return {
        size: typeof config?.model_bytes === 'number' ? config.model_bytes : fallbackSize,
        description: typeof config?.model_description === 'string' 
            ? config.model_description 
            : `${PIPELINE_TYPES[pipe.task as TransformersPipelineType]} model`
    };
}

/**
 * Check if a model ID is valid for transformers.js
 * Must be in format: 'org/model-name' or a full URL to a model
 */
export function isValidModelId(modelId: string): boolean {
    return /^[a-zA-Z0-9-]+\/[a-zA-Z0-9-]+$/.test(modelId) || 
           /^https?:\/\//.test(modelId);
} 