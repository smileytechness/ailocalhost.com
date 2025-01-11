import { pipeline, env, type PipelineType, type ProgressInfo } from '@huggingface/transformers';
import { logTransformersActivity } from '../components/TransformersConsoleOutput';
import { formatBytes } from './transformersUtils';
import type { DownloadState } from '../types/transformersTypes';

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