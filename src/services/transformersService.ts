import { pipeline, env, PretrainedOptions } from '@huggingface/transformers';
import { TextStreamer } from '@huggingface/transformers';
import { APISettings } from '../types/api';
import { TransformersEnvironment } from '../types/transformers';
import { generateTransformersResponse } from '../features/transformers/utils/transformersPipeline.ts';
import { TextStreamerOptions } from '../types/transformers';

interface PipelineConfig {
    configKey: string;
    config: any;
}

let pipelineRef: any = null;
let pipelineConfigRef: PipelineConfig | null = null;

// Add GenerationResponse type
export interface GenerationResponse {
    // Add the properties that match your existing implementation
    text: string;
    // ... add other properties as needed
}

const initializeWebGPU = async (transformersEnv: any, settings: APISettings) => {
    if (!settings.webGpu || !navigator.gpu) {
        settings.webGpu = false;
        return false;
    }

    try {
        console.log('Initializing WebGPU...');
        const adapter = await navigator.gpu.requestAdapter({
            powerPreference: 'high-performance'
        });
        
        if (!adapter) {
            console.warn('No WebGPU adapter found, falling back to CPU');
            settings.webGpu = false;
            return false;
        }

        const device = await adapter.requestDevice();
        
        // Initialize the webgpu backend with proper typing
        if (!transformersEnv.backends) {
            transformersEnv.backends = {
                onnx: {
                    wasm: {
                        numThreads: 4,
                        simd: true,
                        proxy: false,
                        initialized: false
                    }
                },
                webgpu: {
                    enabled: true,
                    device,
                    adapter,
                    preferredDeviceType: 'discrete',
                    memoryConfig: {
                        maximumBufferSize: 1024 * 1024 * 1024,
                        preferredBufferSize: 128 * 1024 * 1024
                    }
                }
            };
        }
        
        return true;
    } catch (e) {
        console.warn('WebGPU initialization failed:', e);
        settings.webGpu = false;
        return false;
    }
};

export const configureTransformersRuntime = async (settings: APISettings) => {
    // Only reconfigure if settings changed
    const configKey = JSON.stringify({
        webGpu: settings.webGpu,
        quantized: settings.quantized,
        numThreads: settings.numThreads,
        useCache: settings.useCache
    });
    
    if (pipelineConfigRef?.configKey === configKey) {
        console.log('Using cached pipeline configuration');
        return pipelineConfigRef.config;
    }

    console.log('Creating new pipeline configuration');
    const transformersEnv = env as unknown as TransformersEnvironment;
    
    // Configure environment based on settings
    transformersEnv.useBrowserCache = settings.useCache ?? true;
    transformersEnv.useCustomCache = settings.useCache ?? true;
    transformersEnv.cacheDir = "transformers-cache";
    transformersEnv.numThreads = settings.numThreads;

    // Initialize WebGPU if enabled
    void await initializeWebGPU(transformersEnv, settings);

    const pipelineConfig = {
        cache_dir: env.cacheDir,
        framework: settings.webGpu ? 'webgpu' : 'onnx',
        dtype: settings.quantized ? 'q4' : 'fp32',
        device: settings.webGpu ? 'webgpu' : 'wasm',
        execution_provider: settings.webGpu ? undefined : {
            name: 'wasm',
            numThreads: settings.numThreads || navigator.hardwareConcurrency || 4,
            simd: true
        }
    };

    pipelineConfigRef = {
        configKey,
        config: pipelineConfig
    };

    return pipelineConfig;
};

export const generateWithTransformers = async (
    modelId: string,
    input: string,
    settings: APISettings,
    onChunk: (text: string) => void,
    onProgress: (progress: {
        isLoaded: boolean;
        memoryUsage: number | null;
        progress: number;
        stage: 'idle' | 'loading' | 'generating' | 'error';
    }) => void
): Promise<GenerationResponse> => {
    try {
        // Initial progress update
        onProgress({
            isLoaded: false,
            memoryUsage: (performance as any).memory?.usedJSHeapSize || null,
            progress: 0,
            stage: 'loading'
        });

        // Configure environment
        const transformersEnv = env as unknown as TransformersEnvironment;
        transformersEnv.useBrowserCache = settings.useCache ?? true;
        transformersEnv.cacheDir = "transformers-cache";
        transformersEnv.numThreads = settings.numThreads || navigator.hardwareConcurrency || 4;

        // Initialize WebGPU if enabled
        const _webGPUInitialized = await initializeWebGPU(transformersEnv, settings);

        if (!_webGPUInitialized) {
            console.log('WebGPU initialization failed, falling back to CPU');
            settings.webGpu = false;
            // Retry with CPU
            return generateWithTransformers(modelId, input, {...settings, webGpu: false}, onChunk, onProgress);
        }

        // Create pipeline if not exists or settings changed
        if (!pipelineRef) {
            const pipelineOptions: PretrainedOptions = {
                revision: 'default',
                progress_callback: (info: any) => {
                    if (typeof info.progress === 'number') {
                        onProgress({
                            isLoaded: false,
                            memoryUsage: (performance as any).memory?.usedJSHeapSize || null,
                            progress: info.progress * 100,
                            stage: 'loading'
                        });
                    }
                }
            };

            console.log('Creating pipeline with options:', pipelineOptions);
            pipelineRef = await pipeline('text-generation', modelId, pipelineOptions);
        }

        // Update the TextStreamer options
        const streamerOptions: TextStreamerOptions = {
            skip_special_tokens: true,
            callback: (text: string) => {
                onChunk(text);
                onProgress({
                    isLoaded: true,
                    memoryUsage: (performance as any).memory?.usedJSHeapSize || null,
                    progress: 50,
                    stage: 'generating'
                });
            }
        };

        const generateConfig = {
            max_new_tokens: settings.maxTokens,
            temperature: settings.temperature,
            top_p: settings.topP,
            do_sample: true,
            use_cache: settings.useCache ?? true,
            device: settings.webGpu ? 'webgpu' as const : 'cpu' as const,
            streamer: new TextStreamer(pipelineRef.tokenizer, streamerOptions as any)
        };

        console.log('Generating with config:', generateConfig);
        const output = await pipelineRef(input, generateConfig);
        console.log('Generation complete:', output);

        onProgress({
            isLoaded: true,
            memoryUsage: (performance as any).memory?.usedJSHeapSize || null,
            progress: 100,
            stage: 'idle'
        });

        return output;

    } catch (error) {
        console.error('Error in transformers generation:', error);
        onProgress({
            isLoaded: false,
            memoryUsage: null,
            progress: 0,
            stage: 'error'
        });
        throw error;
    }
};

// Improved cleanup with cache clearing
export const cleanup = () => {
    if (pipelineRef?.tokenizer) {
        try {
            pipelineRef.tokenizer.dispose();
        } catch (e) {
            console.warn('Error disposing tokenizer:', e);
        }
    }
    if (pipelineRef?.model) {
        try {
            pipelineRef.model.dispose();
        } catch (e) {
            console.warn('Error disposing model:', e);
        }
    }
    pipelineRef = null;
};

export const checkTransformersEnvironment = () => {
    console.log('Transformers.js environment:', {
        env: env,
        pipeline: typeof pipeline,
        backends: (env as any).backends,
        gpu: navigator.gpu ? 'Available' : 'Not available',
        memory: (performance as any).memory ? {
            used: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) + 'MB',
            total: Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024) + 'MB',
            limit: Math.round((performance as any).memory.jsHeapSizeLimit / 1024 / 1024) + 'MB'
        } : 'Not available'
    });
};

export const sendMessageToTransformers = async (
    message: string,
    pipeline: any,
    parameters: any
) => {
    try {
        const response = await generateTransformersResponse(pipeline, message, parameters);
        return {
            success: true,
            response: response
        };
    } catch (error: unknown) {
        console.error('Error in transformers service:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}; 