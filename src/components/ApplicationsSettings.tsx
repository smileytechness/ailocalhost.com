import React, { useState } from 'react';
import TransformersSettings from './TransformersSettings';
import LangChainSettings from './LangChainSettings';
import langchainLogo from '../assets/langchain-color.svg';
import onnxLogo from '../assets/onnxlogo.png';
import jsLogo from '../assets/javascript-logo.webp';

const ApplicationsSettings: React.FC = () => {
    const [expandedApp, setExpandedApp] = useState<string | null>(null);

    const handleExpand = (appName: string, isExpanded: boolean) => {
        setExpandedApp(isExpanded ? appName : null);
    };

    return (
        <div className="space-y-4 h-full overflow-y-auto">
            <div className="border border-gray-700/50 rounded-lg overflow-hidden">
                <TransformersSettings 
                    isExpanded={expandedApp === 'transformers'} 
                    onExpandedChange={(expanded) => handleExpand('transformers', expanded)}
                    logoOverlay={[
                        { src: onnxLogo, alt: 'ONNX', className: 'w-10 h-10' },
                        { src: jsLogo, alt: 'JavaScript', className: 'w-6 h-6 translate-x-4 translate-y-4' }
                    ]}
                />
            </div>
            <div className="border border-gray-700/50 rounded-lg overflow-hidden">
                <LangChainSettings 
                    isExpanded={expandedApp === 'langchain'} 
                    onExpandedChange={(expanded) => handleExpand('langchain', expanded)}
                    logo={{ src: langchainLogo, alt: 'LangChain', className: 'w-12 h-12' }}
                />
            </div>
        </div>
    );
};

export default ApplicationsSettings; 