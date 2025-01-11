import { type PipelineType } from '@huggingface/transformers';

export interface TransformersModel {
    id: string;
    name: string;
    details?: string;
    size?: string;
    source: 'huggingface' | 'local';
    format: 'onnx';
    pipeline?: PipelineType;
    modelId?: string;
    quantization?: 4 | 8 | 16 | 32;
    timestamp?: string;
}

export interface TransformersSettings {
    enabled: boolean;
    useWebGPU: boolean;
    models: TransformersModel[];
}

export interface FileProgress {
    name: string;
    size: string;
    progress: number;
}

export interface DownloadState {
    isDownloading: boolean;
    progress: number;
    loaded: number;
    total: number | null;
    status: 'downloading' | 'processing' | 'complete' | 'error' | 'cached' | 'cancelled' | 'ready';
    files?: Array<{
        name: string;
        size: number;
        progress: number;
    }>;
}

export interface LogEntry {
    type: 'info' | 'error' | 'warning' | 'success' | 'network' | 'command';
    message: string;
    details?: string;
    timestamp?: string;
    updateId?: string;
}

export const TRANSFORMERS_STORAGE_KEY = 'transformers-settings'; 