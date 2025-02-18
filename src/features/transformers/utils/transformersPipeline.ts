import { pipeline, env, type PipelineType, type TextGenerationPipeline, type ProgressInfo } from '@huggingface/transformers';
import { logTransformersActivity } from '../components/TransformersConsoleOutput';
import { formatBytes } from './transformersUtils';
import type { DownloadState } from '../types/transformersTypes';
import type { APISettings } from '../../../types/api';
import type { ChatMessage } from '../../../utils/chatStorage';

export const downloadModel = async (
    modelId: string,
    pipelineType: PipelineType,
    onProgress?: (progress: DownloadState) => void
): Promise<ReturnType<typeof pipeline>> => {
    try {
        // Configure environment
        env.useBrowserCache = true;
        env.useCustomCache = true;
        env.remoteHost = 'https://huggingface.co';

        // Initialize pipeline with explicit configuration
        const pipe = await pipeline(pipelineType, modelId, {
            progress_callback: (progressInfo: ProgressInfo) => {
                if (!onProgress) return;

                // Determine status
                let status: DownloadState['status'];
                if (progressInfo.status === 'download') {
                    status = 'downloading';
                } else if (progressInfo.status === 'done') {
                    status = 'complete';
                } else if (progressInfo.status === 'ready') {
                    status = 'cached';
                } else {
                    status = 'processing';
                }

                // Get total and loaded values
                const total = 'total' in progressInfo ? progressInfo.total : null;
                const loaded = 'loaded' in progressInfo ? progressInfo.loaded : 0;

                // Calculate progress
                const progress = total ? loaded / total : 0;

                // Track file progress
                if (status === 'downloading' && 'file' in progressInfo && loaded > 0 && total) {
                    const fileName = progressInfo.file.split('/').pop() || progressInfo.file;
                    logTransformersActivity({
                        type: 'info',
                        message: `Downloading ${fileName}`,
                        details: `${formatBytes(loaded)} of ${formatBytes(total)} (${Math.round(progress * 100)}%)`
                    });
                }

                // Update overall progress
                onProgress({
                    isDownloading: status === 'downloading',
                    progress,
                    loaded,
                    total,
                    status,
                    files: 'file' in progressInfo ? [{
                        name: progressInfo.file.split('/').pop() || progressInfo.file,
                        size: total || 0,
                        progress: total ? loaded / total : 0
                    }] : undefined
                });
            }
        });

        return pipe;
    } catch (error) {
        logTransformersActivity({
            type: 'error',
            message: `Failed to download model: ${modelId}`,
            details: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
    }
};

interface TransformersParameters {
    max_length?: number;
    temperature?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
}

// Add these type definitions at the top of the file
interface TextGenerationOutput {
    generated_text: string;
}

interface TextGenerationSingle {
    text: string;
}

export const generateTransformersResponse = async (
    pipe: TextGenerationPipeline,
    message: string,
    parameters: TransformersParameters
): Promise<string> => {
    try {
        const result = await pipe(message, {
            ...parameters,
            max_length: parameters.max_length || 100,
            temperature: parameters.temperature || 0.7
        });

        // Handle array results from text-generation
        if (Array.isArray(result)) {
            const firstResult = result[0] as TextGenerationOutput | TextGenerationSingle;
            
            // Check if it has generated_text property
            if ('generated_text' in firstResult) {
                return firstResult.generated_text;
            }
            // Check if it has text property
            if ('text' in firstResult) {
                return firstResult.text;
            }
            // Fallback
            return '';
        }
        
        // Fallback for other result types
        return typeof result === 'string' ? result : JSON.stringify(result);
    } catch (error) {
        console.error('Error generating response:', error);
        throw error;
    }
};

// Add this new function to handle chat messages
export const handleTransformersChat = async (
    message: string,
    apiSettings: APISettings,
    setMessages: (updater: (prev: ChatMessage[]) => ChatMessage[]) => void
): Promise<void> => {
    try {
        // Initialize pipeline with text-generation and assert its type
        const pipe = await downloadModel(apiSettings.model, 'text-generation', (progress) => {
            logTransformersActivity({
                type: 'info',
                message: 'Preparing model',
                details: `${formatBytes(progress.loaded)} of ${progress.total ? formatBytes(progress.total) : 'unknown'}`
            });
        }) as TextGenerationPipeline;

        // Add initial empty message
        setMessages(prev => [...prev, {
            content: '',
            isUser: false,
            timestamp: new Date()
        }]);

        // Generate response using existing function
        const response = await generateTransformersResponse(pipe, message, {
            max_length: apiSettings.maxTokens,
            temperature: apiSettings.temperature,
            top_p: apiSettings.topP,
            frequency_penalty: apiSettings.frequencyPenalty,
            presence_penalty: apiSettings.presencePenalty
        });

        // Update message with response
        setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (!lastMessage.isUser) {
                lastMessage.content = response;
            }
            return newMessages;
        });

        logTransformersActivity({
            type: 'success',
            message: 'Generated response',
            details: `Model: ${apiSettings.model}`
        });
    } catch (error) {
        logTransformersActivity({
            type: 'error',
            message: 'Failed to generate response',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
    }
}; 