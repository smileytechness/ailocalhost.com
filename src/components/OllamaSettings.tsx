import React, { useState, useEffect } from 'react';
import { FiSettings } from 'react-icons/fi';

interface LogoProps {
    src: string;
    alt: string;
    className?: string;
}

interface OllamaSettingsProps {
    isExpanded?: boolean;
    onExpandedChange?: (expanded: boolean) => void;
    logo?: LogoProps;
}

const OllamaSettings: React.FC<OllamaSettingsProps> = ({
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
                        <div className="w-16 h-16 rounded-lg bg-gray-100/95 flex items-center justify-center shrink-0 relative overflow-hidden">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.1)_100%)]" />
                            <img
                                src={logo.src}
                                alt={logo.alt}
                                className="w-10 h-10 object-contain relative z-10"
                            />
                        </div>
                    )}
                    <div>
                        <h3 className="text-base font-medium text-gray-200">Ollama</h3>
                        <p className="text-sm text-gray-400">Manage your Ollama models and configurations from the browser</p>
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
                        Ollama integration is currently under development. Stay tuned for updates!
                    </p>
                </div>
            </div>
        </div>
    );
};

export default OllamaSettings; 