// If these types are truly unused, remove the import:
// import type { PretrainedOptions, env } from '@huggingface/transformers';

// If they are used elsewhere, we need to export them:
export type { PretrainedOptions, env } from '@huggingface/transformers';

export interface WebGPUFlags {
  device: any;
  adapter: any;
  available: boolean;
}

export interface TransformersEnvironment {
  backends: {
    onnx: {
      wasm: {
        numThreads: number;
        simd: boolean;
        proxy: boolean;
        initialized: boolean;
        wasmPaths?: string;
      };
    };
    webgpu: WebGPUFlags;
  };
  useBrowserCache?: boolean;
  useCustomCache?: boolean;
  cacheDir?: string;
  numThreads?: number;
}

export interface PretrainedModelOptions {
  progress_callback?: (progress: any) => void;
}

declare global {
  interface Navigator {
    gpu?: {
      requestAdapter(options?: any): Promise<any>;
    };
  }
}

export interface TextStreamerOptions {
  skip_special_tokens?: boolean;
  callback?: (text: string) => void;
}

export type PipelineType =
  | "text-classification"
  | "token-classification"
  | "question-answering"
  | "fill-mask"
  | "summarization"
  | "translation"
  | "text-generation"
  | "text-to-image"
  | "text-classification"
  | "token-classification"
  | "question-answering"
  | "fill-mask"
  | "summarization"
  | "translation"
  | "text-generation"
  | "text-to-image";