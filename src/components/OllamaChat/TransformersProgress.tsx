import React from 'react';
import { FiCpu, FiZap } from 'react-icons/fi';

interface TransformersProgressProps {
    isLoaded: boolean;
    memoryUsage: number | null;
    progress: number;
    stage: 'idle' | 'loading' | 'generating' | 'error';
    isWebGPU: boolean;
}

const TransformersProgress: React.FC<TransformersProgressProps> = ({
    isLoaded,
    memoryUsage,
    progress,
    stage,
    isWebGPU
}) => {
    if (stage === 'idle') return null;

    return (
        <div className="fixed top-[70px] left-1/2 transform -translate-x-1/2 z-50
                      bg-gray-800/95 backdrop-blur-sm border border-gray-700/50
                      rounded-full shadow-lg px-3 py-1.5 text-xs">
            <div className="flex items-center space-x-2">
                {/* Status Icon */}
                <div className="flex items-center">
                    {isWebGPU ? (
                        <FiZap className={`w-3.5 h-3.5 ${isLoaded ? 'text-yellow-400' : 'text-gray-500'}`} />
                    ) : (
                        <FiCpu className={`w-3.5 h-3.5 ${isLoaded ? 'text-blue-400' : 'text-gray-500'}`} />
                    )}
                </div>

                {/* Status Text */}
                <div className="text-gray-300 min-w-[80px]">
                    {stage === 'loading' && 'Loading Model...'}
                    {stage === 'generating' && 'Generating...'}
                    {stage === 'error' && 'Error'}
                </div>

                {/* Progress Bar */}
                {(stage === 'loading' || stage === 'generating') && (
                    <div className="w-24 h-1 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-blue-500 transition-all duration-300 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}

                {/* Memory Usage */}
                {memoryUsage && (
                    <div className="text-gray-400 ml-2 w-[60px] text-right">
                        {Math.round(memoryUsage / 1024 / 1024)}MB
                    </div>
                )}
            </div>
        </div>
    );
};

export default TransformersProgress; 