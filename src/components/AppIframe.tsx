import React from 'react';
import { formatUrl } from '../utils/urlUtils';
import { IoClose } from 'react-icons/io5';
import { BiFullscreen, BiExitFullscreen } from 'react-icons/bi';
import { IoMdRefresh } from 'react-icons/io';

interface AppIframeProps {
    url: string;
    onClose: () => void;
}

const AppIframe: React.FC<AppIframeProps> = ({ url, onClose }) => {
    const [isFullscreen, setIsFullscreen] = React.useState(true);
    const formattedUrl = formatUrl(url);

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    return (
        <div className={`h-full flex flex-col ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
            {!isFullscreen && (
                <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 p-2
                              flex items-center justify-between">
                    <span className="text-sm font-medium truncate">{url}</span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => window.location.reload()}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 
                                     text-gray-500 dark:text-gray-400"
                        >
                            <IoMdRefresh className="w-5 h-5" />
                        </button>
                        <button
                            onClick={toggleFullscreen}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 
                                     text-gray-500 dark:text-gray-400"
                        >
                            <BiFullscreen className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            <div className="flex-grow relative">
                <iframe
                    src={formattedUrl}
                    className="w-full h-full"
                    title="App Content"
                />

                <div className="fixed bottom-6 right-6 flex gap-2 z-50">
                    {isFullscreen && (
                        <button
                            onClick={toggleFullscreen}
                            className="p-3 rounded-full bg-gray-900/80 text-white hover:bg-gray-900 
                                     backdrop-blur-sm shadow-lg transition-all"
                        >
                            <BiExitFullscreen className="w-6 h-6" />
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="p-3 rounded-full bg-gray-900/80 text-white hover:bg-gray-900 
                                 backdrop-blur-sm shadow-lg transition-all"
                    >
                        <IoClose className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AppIframe;
