import React, { useState, useEffect } from 'react';
import { FiSettings } from 'react-icons/fi';

interface LogoProps {
    src: string;
    alt: string;
    className?: string;
}

interface LangChainSettingsProps {
    isExpanded?: boolean;
    onExpandedChange?: (expanded: boolean) => void;
    logo?: LogoProps;
}

const LangChainSettings: React.FC<LangChainSettingsProps> = ({
    isExpanded: propIsExpanded,
    onExpandedChange,
    logo
}) => {
    const [isExpanded, setIsExpanded] = useState(propIsExpanded ?? false);

    useEffect(() => {
        if (propIsExpanded !== undefined) {
            setIsExpanded(propIsExpanded);
        }
    }, [propIsExpanded]);

    const handleExpandToggle = () => {
        const newExpanded = !isExpanded;
        setIsExpanded(newExpanded);
        onExpandedChange?.(newExpanded);
    };

    return (
        <div className="space-y-2">
            {/* Header */}
            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                    {logo && (
                        <div className="w-16 h-16 bg-gray-900/50 rounded-lg flex items-center justify-center shrink-0 relative overflow-hidden">
                            <img
                                src={logo.src}
                                alt={logo.alt}
                                className={`${logo.className} w-12 h-12 object-contain relative z-10 [filter:brightness(0)_invert(1)]`}
                            />
                        </div>
                    )}
                    <div>
                        <h3 className="text-base font-medium text-gray-200">LangChain</h3>
                        <p className="text-sm text-gray-400">JavaScript LangChain integration for RAG, Agents, and more.</p>
                    </div>
                </div>
                <button
                    onClick={handleExpandToggle}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-all duration-200 transform"
                >
                    <FiSettings 
                        className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${
                            isExpanded ? 'rotate-90' : ''
                        }`}
                    />
                </button>
            </div>

            {/* Expanded content */}
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
            }`}>
                <div className="p-6 bg-gray-800/30 rounded-lg text-center">
                    <h4 className="text-lg font-medium text-gray-300 mb-2">Coming Soon</h4>
                    <p className="text-sm text-gray-400">
                        LangChain integration is currently under development. Stay tuned for updates!
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LangChainSettings; 