export interface TransformersModel {
    id: string;
    name: string;
    details: string;
    size: number; // in bytes
    source: 'huggingface' | 'local';
    format: 'onnx';
    timestamp: string;
}

export interface TransformersSettings {
    enabled: boolean;
    useWebGPU: boolean;
    models: TransformersModel[];
}

export const TRANSFORMERS_STORAGE_KEY = 'transformers_settings'; 