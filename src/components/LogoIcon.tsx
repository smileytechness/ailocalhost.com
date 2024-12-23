import React, { useState } from 'react';
import { getClearbitLogoUrl } from '../utils/urlUtils';
import { FiSettings } from 'react-icons/fi';
import { VscTerminalCmd } from 'react-icons/vsc';
import { IoChatboxEllipses } from 'react-icons/io5';

interface LogoIconProps {
    url: string;
    name: string;
    className?: string;
}

const LogoIcon: React.FC<LogoIconProps> = ({ url, name, className = '' }) => {
    const [imageError, setImageError] = useState(false);
    const logoUrl = getClearbitLogoUrl(url);

    if (!logoUrl || imageError || url === 'settings' || url === 'console' || url === 'ollama-chat') {
        return (
            <div className={`rounded-2xl bg-gradient-to-br from-primary to-primary-dark
                           flex items-center justify-center text-white text-xl font-semibold
                           ring-1 ring-black/5 shadow-lg backdrop-blur-sm
                           ${className}`}>
                {url === 'settings' ? <FiSettings className="w-8 h-8" /> :
                    url === 'console' ? <VscTerminalCmd className="w-8 h-8" /> :
                    url === 'ollama-chat' ? <IoChatboxEllipses className="w-8 h-8" /> :
                        name.charAt(0)}
            </div>
        );
    }

    return (
        <div className={`rounded-2xl overflow-hidden bg-surface-light dark:bg-surface-dark
                        ring-1 ring-black/5 dark:ring-white/5 shadow-lg backdrop-blur-sm
                        ${className}`}>
            <img
                src={logoUrl}
                alt={`${name} logo`}
                className="w-full h-full object-contain p-2"
                onError={() => setImageError(true)}
            />
        </div>
    );
};

export default LogoIcon; 
