import React, { useState, useRef, useEffect } from 'react';
import { FiPlus, FiX, FiMic, FiUpload, FiCamera, FiFile, FiLink, FiVideo, FiMonitor, FiList } from 'react-icons/fi';
import { saveImportedFile, getImportedFilesSize } from '../../utils/fileStorage';
import toast from 'react-hot-toast';
import AVCaptureDashboard from './AVCaptureDashboard';
import FileSelectionModal from './FileSelectionModal';

declare global {
    interface Window {
        webkitSpeechRecognition: any;
        SpeechRecognition: any;
    }

    interface SpeechRecognitionResult {
        readonly isFinal: boolean;
        readonly [0]: SpeechRecognitionAlternative;
        readonly length: number;
    }

    interface SpeechRecognitionResultList {
        readonly [index: number]: SpeechRecognitionResult;
        readonly length: number;
    }

    interface SpeechRecognitionEvent extends Event {
        readonly resultIndex: number;
        readonly results: SpeechRecognitionResultList;
    }

    interface SpeechRecognitionAlternative {
        readonly transcript: string;
        readonly confidence: number;
    }

    interface SpeechRecognitionErrorEvent extends Event {
        readonly error: string;
        readonly message: string;
    }
}

interface EnhancedInputProps {
    value: string;
    onChange: (value: string) => void;
    onSend: () => void;
    className?: string;
}

interface DetectedUrl {
    url: string;
    start: number;
    end: number;
}

interface AttachedFile {
    id: string;
    name: string;
    type: string;
    data: string;
    size: number;
}

const EnhancedInput: React.FC<EnhancedInputProps> = ({
    value,
    onChange,
    onSend,
    className = ''
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingType, setRecordingType] = useState<'audio' | 'video' | null>(null);
    const [detectedUrls, setDetectedUrls] = useState<DetectedUrl[]>([]);
    const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
    const [showFileSelection, setShowFileSelection] = useState(false);
    const [showAVCapture, setShowAVCapture] = useState(false);
    const [captureMode, setCaptureMode] = useState<'audio' | 'camera' | 'screen'>('audio');
    const [isVideoMode, setIsVideoMode] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dropSuccess, setDropSuccess] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const dropZoneRef = useRef<HTMLDivElement>(null);

    // URL detection regex
    const urlRegex = /(https?:\/\/[^\s]+)/g;

    useEffect(() => {
        // Detect URLs in input
        const urls: DetectedUrl[] = [];
        let match;
        while ((match = urlRegex.exec(value)) !== null) {
            urls.push({
                url: match[0],
                start: match.index,
                end: match.index + match[0].length
            });
        }
        setDetectedUrls(urls);
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const adjustTextareaHeight = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    };

    useEffect(() => {
        adjustTextareaHeight();
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend();
        }
    };

    const checkStorageSize = async (fileSize: number): Promise<boolean> => {
        try {
            const currentSize = await getImportedFilesSize();
            const totalSize = currentSize + fileSize;
            if (totalSize > 100 * 1024 * 1024) { // 100MB
                const proceed = window.confirm(
                    'Warning: Total storage size will exceed 100MB. Large files may affect performance. Continue?'
                );
                return proceed;
            }
            return true;
        } catch (error) {
            console.error('Storage error:', error);
            toast.error('Storage access error. File will still be saved.');
            return true; // Continue anyway
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        for (const file of files) {
            if (await checkStorageSize(file.size)) {
                const savedFile = await saveImportedFile(file);
                setAttachedFiles(prev => [...prev, {
                    id: savedFile.id,
                    name: savedFile.name,
                    type: savedFile.type,
                    data: '',
                    size: savedFile.size
                }]);
                toast.success(
                    `File "${file.name}" imported and attached. View in History>Imported Files`,
                    { duration: 4000 }
                );
            }
        }
        setIsMenuOpen(false);
    };

    const handleCaptureClick = (mode: 'audio' | 'camera' | 'screen', isVideo = false) => {
        setCaptureMode(mode);
        if (mode === 'camera') {
            setIsVideoMode(isVideo);
            setRecordingType('video');
        } else if (mode === 'audio') {
            setRecordingType('audio');
        } else {
            setRecordingType(null);
        }
        setShowAVCapture(true);
        setIsMenuOpen(false);
    };

    const handleFileCapture = (file: { id: string; name: string; type: string }) => {
        setAttachedFiles(prev => [...prev, {
            id: file.id,
            name: file.name,
            type: file.type,
            data: '',
            size: 0
        }]);
        toast.success(
            <div>
                <b>File captured successfully!</b>
                <br />
                <span className="text-sm opacity-90">View in History {'>'} Imported Files</span>
            </div>,
            { duration: 4000 }
        );
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        let successCount = 0;

        for (const file of files) {
            if (await checkStorageSize(file.size)) {
                const savedFile = await saveImportedFile(file);
                setAttachedFiles(prev => [...prev, {
                    id: savedFile.id,
                    name: savedFile.name,
                    type: savedFile.type,
                    data: '',
                    size: savedFile.size
                }]);
                successCount++;
            }
        }

        if (successCount > 0) {
            setDropSuccess(true);
            toast.success(
                <div>
                    <b>Files added successfully!</b>
                    <br />
                    <span className="text-sm opacity-90">View in History {'>'} Imported Files</span>
                </div>,
                { duration: 4000 }
            );
            setTimeout(() => setDropSuccess(false), 2000);
        }
    };

    const removeAttachedFile = (id: string) => {
        setAttachedFiles(prev => prev.filter(f => f.id !== id));
    };

    const handleSelectFromImported = () => {
        setShowFileSelection(true);
        setIsMenuOpen(false);
    };

    const handleFileSelection = (files: Array<{ id: string; name: string; type: string; data: string; size: number }>) => {
        setAttachedFiles(prev => [...prev, ...files]);
        toast.success(
            <div>
                <b>{files.length} file{files.length !== 1 ? 's' : ''} attached successfully!</b>
            </div>,
            { duration: 4000 }
        );
    };

    const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const items = Array.from(e.clipboardData.items);
        items.forEach(async (item) => {
            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                if (file && await checkStorageSize(file.size)) {
                    const savedFile = await saveImportedFile(file);
                    setAttachedFiles(prev => [...prev, {
                        id: savedFile.id,
                        name: savedFile.name,
                        type: savedFile.type,
                        data: '',
                        size: savedFile.size
                    }]);
                    toast.success(
                        <div>
                            <b>Image pasted successfully!</b>
                            <br />
                            <span className="text-sm opacity-90">View in History {'>'} Imported Files</span>
                        </div>,
                        { duration: 4000 }
                    );
                }
            }
        });
    };

    return (
        <div className="relative w-full">
            {/* Recording indicator */}
            {isRecording && (
                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 
                               bg-red-500/90 text-white px-4 py-2 rounded-full
                               flex items-center space-x-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    <span className="text-sm">Recording {recordingType}</span>
                    <button
                        onClick={() => setIsRecording(false)}
                        className="ml-2 p-1 hover:bg-red-400/20 rounded-full"
                    >
                        <FiX className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Attached files */}
            {attachedFiles.length > 0 && (
                <div className="absolute -top-10 left-0 right-0 flex flex-wrap gap-2">
                    {attachedFiles.map((file) => (
                        <div
                            key={file.id}
                            className="flex items-center space-x-1 bg-gray-800/90 px-2 py-1 rounded-full
                                     text-xs text-gray-300 border border-gray-700"
                        >
                            {file.type === 'audio' && <FiMic className="w-3 h-3" />}
                            {file.type === 'video' && <FiVideo className="w-3 h-3" />}
                            {file.type === 'image' && <FiCamera className="w-3 h-3" />}
                            {file.type === 'document' && <FiFile className="w-3 h-3" />}
                            <span className="max-w-[150px] truncate">{file.name}</span>
                            <button
                                onClick={() => removeAttachedFile(file.id)}
                                className="p-0.5 hover:bg-gray-700 rounded-full"
                            >
                                <FiX className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex items-center space-x-2">
                {/* Input area */}
                <div className="flex-1 relative">
                    <textarea
                        ref={textareaRef}
                        value={value}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        onPaste={handlePaste}
                        placeholder="Type a message..."
                        rows={1}
                        style={{
                            minHeight: '36px',
                            maxHeight: '200px',
                            height: '36px',
                            resize: 'none',
                            paddingTop: '8px',
                            paddingBottom: '8px',
                            lineHeight: '20px'
                        }}
                        className={`w-full px-3 text-sm bg-transparent
                                  rounded-lg focus:outline-none placeholder:text-gray-500
                                  overscroll-y-contain ${className}`}
                    />

                    {/* URL highlights - adjusted positioning */}
                    {detectedUrls.map((url, index) => (
                        <div
                            key={index}
                            className="absolute top-0 left-0 pointer-events-none"
                            style={{
                                transform: `translate(${url.start * 8}px, ${Math.floor(url.start / 50) * 20 + 6}px)`
                            }}
                        >
                            <div className="flex items-center space-x-1 bg-blue-500/20 px-1 rounded">
                                <FiLink className="w-3 h-3 text-blue-400" />
                                <span className="text-xs text-blue-400">Web resource attached</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Menu button - updated styling */}
                <div className="relative flex items-center" ref={menuRef}>
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="w-7 h-7 text-gray-400 hover:text-blue-400 transition-colors
                                 flex items-center justify-center bg-gray-800 rounded-lg border border-gray-700
                                 hover:bg-gray-700/50"
                    >
                        <FiPlus className="w-4 h-4" />
                    </button>

                    {/* Menu popup */}
                    {isMenuOpen && (
                        <div className="absolute bottom-full right-0 mb-2 w-72
                                      bg-gray-800 rounded-lg shadow-lg border border-gray-700
                                      overflow-hidden">
                            {/* Menu items */}
                            <div className="p-2 space-y-1 text-xs">
                                {/* Live Inference Tools */}
                                <div className="text-xs font-medium text-gray-400 px-2 py-1 opacity-50">
                                    Live Inference Tools (Coming Soon)
                                </div>
                                <div className="flex items-center space-x-1">
                                    <button
                                        className="flex-1 flex items-center space-x-2 px-2 py-1.5 
                                                 rounded text-sm text-gray-500 cursor-not-allowed"
                                        disabled
                                    >
                                        <FiMic className="w-3.5 h-3.5" />
                                        <span>Mic</span>
                                    </button>
                                    <button
                                        className="flex-1 flex items-center space-x-2 px-2 py-1.5 
                                                 rounded text-sm text-gray-500 cursor-not-allowed"
                                        disabled
                                    >
                                        <FiCamera className="w-3.5 h-3.5" />
                                        <span>Camera</span>
                                    </button>
                                    <button
                                        className="flex-1 flex items-center space-x-2 px-2 py-1.5 
                                                 rounded text-sm text-gray-500 cursor-not-allowed"
                                        disabled
                                    >
                                        <FiMonitor className="w-3.5 h-3.5" />
                                        <span>Screen</span>
                                    </button>
                                </div>

                                <div className="h-px bg-gray-700 my-2" />

                                {/* Capture */}
                                <div className="text-xs font-medium text-gray-400 px-2 py-1">
                                    Capture
                                </div>
                                <div className="grid grid-cols-2 gap-1">
                                    <button
                                        onClick={() => handleCaptureClick('audio')}
                                        className="flex items-center space-x-2 px-2 py-1.5 
                                                 hover:bg-gray-700/50 rounded text-xs text-gray-300"
                                    >
                                        <FiMic className="w-3.5 h-3.5" />
                                        <span>Record Audio</span>
                                    </button>
                                    <button
                                        onClick={() => handleCaptureClick('camera', true)}
                                        className="flex items-center space-x-2 px-2 py-1.5 
                                                 hover:bg-gray-700/50 rounded text-xs text-gray-300"
                                    >
                                        <FiVideo className="w-3.5 h-3.5" />
                                        <span>Record Video</span>
                                    </button>
                                    <button
                                        onClick={() => handleCaptureClick('camera', false)}
                                        className="flex items-center space-x-2 px-2 py-1.5 
                                                 hover:bg-gray-700/50 rounded text-xs text-gray-300"
                                    >
                                        <FiCamera className="w-3.5 h-3.5" />
                                        <span>Take Photo</span>
                                    </button>
                                    <button
                                        onClick={() => handleCaptureClick('screen')}
                                        className="flex items-center space-x-2 px-2 py-1.5 
                                                 hover:bg-gray-700/50 rounded text-xs text-gray-300"
                                    >
                                        <FiMonitor className="w-3.5 h-3.5" />
                                        <span>Screen Capture</span>
                                    </button>
                                </div>

                                <div className="h-px bg-gray-700 my-2" />

                                {/* Attach */}
                                <div className="text-xs font-medium text-gray-400 px-2 py-1">
                                    Attach
                                </div>
                                <div className="flex items-center space-x-1">
                                    <label className="flex-1 flex items-center space-x-2 px-2 py-1.5 
                                                    hover:bg-gray-700/50 rounded text-xs text-gray-300
                                                    cursor-pointer">
                                        <FiUpload className="w-3.5 h-3.5" />
                                        <span>Upload</span>
                                        <input
                                            type="file"
                                            multiple
                                            className="hidden"
                                            onChange={handleFileUpload}
                                        />
                                    </label>
                                    <button
                                        onClick={handleSelectFromImported}
                                        className="flex-1 flex items-center space-x-2 px-2 py-1.5 
                                                 hover:bg-gray-700/50 rounded text-xs text-gray-300"
                                    >
                                        <FiList className="w-3.5 h-3.5" />
                                        <span>Select from Imported</span>
                                    </button>
                                </div>

                                {/* Drop zone */}
                                <div 
                                    ref={dropZoneRef}
                                    className={`mt-2 p-3 border-t border-gray-700 transition-colors duration-300
                                              ${isDragging ? 'bg-blue-500/10' : ''}
                                              ${dropSuccess ? 'bg-green-500/10' : ''}`}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                >
                                    <div className={`border-2 border-dashed rounded-lg p-3
                                                   text-center text-xs transition-colors duration-300
                                                   ${isDragging 
                                                       ? 'border-blue-500/50 text-blue-400'
                                                       : dropSuccess
                                                           ? 'border-green-500/50 text-green-400'
                                                           : 'border-gray-700 text-gray-400'}`}>
                                        <p className="font-bold">
                                            {dropSuccess 
                                                ? 'Files added successfully!'
                                                : isDragging
                                                    ? 'Drop to add files'
                                                    : 'Drag files here'}
                                        </p>
                                        <p className="text-[10px] mt-1 opacity-75">
                                            Supports audio, images, videos, and documents
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* AV Capture Dashboard */}
            {showAVCapture && (
                <AVCaptureDashboard
                    onClose={() => setShowAVCapture(false)}
                    onFileCapture={handleFileCapture}
                    initialMode={captureMode}
                    initialVideoMode={isVideoMode}
                />
            )}

            {/* Add FileSelectionModal */}
            {showFileSelection && (
                <FileSelectionModal
                    onClose={() => setShowFileSelection(false)}
                    onSelect={handleFileSelection}
                />
            )}
        </div>
    );
};

export default EnhancedInput; 