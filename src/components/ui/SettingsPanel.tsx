import React from 'react';
import { LogoProps } from '../../types/settings';

interface SettingsPanelProps {
    title: string;
    description: string;
    isExpanded: boolean;
    onExpandedChange: (expanded: boolean) => void;
    logo?: LogoProps;
    logoOverlay?: LogoProps[];
    children: React.ReactNode;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
    title,
    description,
    isExpanded,
    onExpandedChange,
    logo,
    logoOverlay,
    children
}) => {
    return (
        <div className="w-full">
            <button
                onClick={() => onExpandedChange(!isExpanded)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
            >
                <div className="flex items-center space-x-4">
                    <div className="relative">
                        {logo && (
                            <img
                                src={logo.src}
                                alt={logo.alt}
                                className={logo.className}
                            />
                        )}
                        {logoOverlay && logoOverlay.map((overlay, index) => (
                            <img
                                key={index}
                                src={overlay.src}
                                alt={overlay.alt}
                                className={overlay.className}
                            />
                        ))}
                    </div>
                    <div className="text-left">
                        <h3 className="text-lg font-semibold">{title}</h3>
                        <p className="text-sm text-gray-400">{description}</p>
                    </div>
                </div>
                <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                    ▼
                </div>
            </button>
            {isExpanded && (
                <div className="p-4 border-t border-gray-700/50">
                    {children}
                </div>
            )}
        </div>
    );
}; 