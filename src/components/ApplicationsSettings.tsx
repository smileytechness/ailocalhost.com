import React, { useState } from 'react';
import TransformersSettings from '../features/transformers/components/TransformersSettingsPanel';
import LangChainSettings from './LangChainSettings';
import LlamaIndexSettings from './LlamaIndexSettings';
import OllamaSettings from './OllamaSettings';
import langchainLogo from '../assets/langchain-color.svg';
import onnxLogo from '../assets/onnxlogo.png';
import jsLogo from '../assets/Javascript.png';
import ollamaLogo from '../assets/ollama.png';
import llamaindexLogo from '../assets/llamaindexlogo.jpeg';

const ApplicationsSettings: React.FC = () => {
    const [expandedApp, setExpandedApp] = useState<string | null>(null);

    const handleExpand = (appName: string, isExpanded: boolean) => {
        setExpandedApp(isExpanded ? appName : null);
    };

    return (
        <div className="space-y-4">
            <div className="text-yellow-100/70 text-sm p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">⚠️ Applications section is under development - some features may not be fully functional.</div>
            <div className="border border-gray-700/50 rounded-lg overflow-visible">
                <TransformersSettings 
                    isExpanded={expandedApp === 'transformers'} 
                    onExpandedChange={(expanded) => handleExpand('transformers', expanded)}
                    logoOverlay={[
                        { src: onnxLogo, alt: 'ONNX', className: 'w-10 h-10' },
                        { src: jsLogo, alt: 'JavaScript', className: 'w-4 h-4 translate-x-4 translate-y-4' }
                    ]}
                />
            </div>
            <div className="border border-gray-700/50 rounded-lg overflow-visible">
                <LangChainSettings 
                    isExpanded={expandedApp === 'langchain'} 
                    onExpandedChange={(expanded) => handleExpand('langchain', expanded)}
                    logo={{ src: langchainLogo, alt: 'LangChain', className: 'w-10 h-10' }}
                />
            </div>
            <div className="border border-gray-700/50 rounded-lg overflow-visible">
                <LlamaIndexSettings 
                    isExpanded={expandedApp === 'llamaindex'} 
                    onExpandedChange={(expanded) => handleExpand('llamaindex', expanded)}
                    logo={{ src: llamaindexLogo, alt: 'LlamaIndex', className: 'w-10 h-10' }}
                />
            </div>
            <div className="border border-gray-700/50 rounded-lg overflow-visible">
                <OllamaSettings 
                    isExpanded={expandedApp === 'ollama'} 
                    onExpandedChange={(expanded) => handleExpand('ollama', expanded)}
                    logo={{ src: ollamaLogo, alt: 'Ollama', className: 'w-10 h-10' }}
                />
            </div>
        </div>
    );
};

export default ApplicationsSettings; 