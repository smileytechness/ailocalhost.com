import React, { useState, useRef, useEffect } from 'react';
import { FiMic, FiCamera, FiMonitor, FiX, FiPlay, FiPause, FiTrash2, FiCheck, FiVideo, FiMicOff } from 'react-icons/fi';
import { saveImportedFile, getImportedFilesSize } from '../../utils/fileStorage';
import toast from 'react-hot-toast';
import { createPortal } from 'react-dom';

interface AVCaptureDashboardProps {
    onClose: () => void;
    onFileCapture: (file: { id: string; name: string; type: string }) => void;
    initialMode?: CaptureMode;
    initialVideoMode?: boolean;
}

type CaptureMode = 'audio' | 'camera' | 'screen';
type CaptureState = 'idle' | 'preview' | 'recording' | 'paused' | 'reviewing';

interface DeviceOption {
    deviceId: string;
    label: string;
}

const AVCaptureDashboard: React.FC<AVCaptureDashboardProps> = ({ onClose, onFileCapture, initialMode = 'audio', initialVideoMode = false }) => {
    const [activeTab, setActiveTab] = useState<CaptureMode>(initialMode);
    const [captureState, setCaptureState] = useState<CaptureState>('idle');
    const [audioLevel, setAudioLevel] = useState<number>(0);
    const [isMicEnabled, setIsMicEnabled] = useState(true);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isVideoMode, setIsVideoMode] = useState(initialVideoMode);
    const [audioDevices, setAudioDevices] = useState<DeviceOption[]>([]);
    const [videoDevices, setVideoDevices] = useState<DeviceOption[]>([]);
    const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
    const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioAnalyserRef = useRef<AnalyserNode | null>(null);
    const audioDataRef = useRef<Uint8Array | null>(null);
    const animationFrameRef = useRef<number>();

    // Add constant for dimensions
    const PREVIEW_HEIGHT = 240; // Smaller height for all preview areas
    const PREVIEW_WIDTH = 360;  // Maintain aspect ratio

    useEffect(() => {
        loadAvailableDevices();
        navigator.mediaDevices.addEventListener('devicechange', loadAvailableDevices);
        
        return () => {
            navigator.mediaDevices.removeEventListener('devicechange', loadAvailableDevices);
            cleanupResources();
        };
    }, []);

    useEffect(() => {
        if (activeTab !== 'screen' && captureState === 'idle') {
            const initStream = async () => {
                try {
                    await startStream();
                } catch (error) {
                    console.error('Error initializing stream:', error);
                }
            };
            initStream();
        }
        return () => {
            if (activeTab !== 'screen') {
                cleanupResources();
            }
        };
    }, [activeTab, selectedAudioDevice, selectedVideoDevice]);

    const loadAvailableDevices = async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            
            const audioInputs = devices
                .filter(device => device.kind === 'audioinput')
                .map(device => ({
                    deviceId: device.deviceId,
                    label: device.label || `Microphone ${device.deviceId.slice(0, 4)}`
                }));
            
            const videoInputs = devices
                .filter(device => device.kind === 'videoinput')
                .map(device => ({
                    deviceId: device.deviceId,
                    label: device.label || `Camera ${device.deviceId.slice(0, 4)}`
                }));
            
            setAudioDevices(audioInputs);
            setVideoDevices(videoInputs);
            
            // Set default devices if not already set
            if (!selectedAudioDevice && audioInputs.length > 0) {
                setSelectedAudioDevice(audioInputs[0].deviceId);
            }
            if (!selectedVideoDevice && videoInputs.length > 0) {
                setSelectedVideoDevice(videoInputs[0].deviceId);
            }
        } catch (error) {
            console.error('Error loading devices:', error);
        }
    };

    const cleanupResources = () => {
        // Stop recording if active
        if (mediaRecorderRef.current && captureState === 'recording') {
            try {
                mediaRecorderRef.current.stop();
            } catch (e) {
                // Ignore errors if recorder is already stopped
            }
        }

        // Cancel any ongoing animations
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = undefined;
        }

        // Disconnect and cleanup audio analyzer
        if (audioAnalyserRef.current) {
            try {
                audioAnalyserRef.current.disconnect();
            } catch (e) {
                console.error('Error disconnecting audio analyzer:', e);
            }
            audioAnalyserRef.current = null;
        }

        // Stop all tracks in the stream
        if (streamRef.current) {
            try {
                const tracks = streamRef.current.getTracks();
                tracks.forEach(track => {
                    try {
                        track.stop();
                    } catch (e) {
                        console.error('Error stopping track:', e);
                    }
                });
            } catch (e) {
                console.error('Error accessing stream tracks:', e);
            }
            streamRef.current = null;
        }

        // Clear video element
        if (videoRef.current) {
            try {
                const video = videoRef.current;
                video.srcObject = null;
                video.src = '';
                video.load(); // Force cleanup of video resources
            } catch (e) {
                console.error('Error cleaning up video element:', e);
            }
        }

        // Cleanup preview URL
        if (previewUrl) {
            try {
                URL.revokeObjectURL(previewUrl);
            } catch (e) {
                console.error('Error revoking object URL:', e);
            }
            setPreviewUrl(null);
        }

        // Reset state
        mediaRecorderRef.current = null;
        chunksRef.current = [];
        setCaptureState('idle');
        setAudioLevel(0);
    };

    const handleRecordingEnd = async () => {
        if (mediaRecorderRef.current && captureState === 'recording') {
            mediaRecorderRef.current.stop();
            stopAllStreams();
            setCaptureState('reviewing');
        }
    };

    const stopAllStreams = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && captureState === 'recording') {
            handleRecordingEnd();
        }
    };

    const handleClose = () => {
        // First stop any active recording
        if (captureState === 'recording') {
            try {
                if (mediaRecorderRef.current) {
                    mediaRecorderRef.current.stop();
                }
            } catch (e) {
                console.error('Error stopping recording:', e);
            }
        }
        
        // Then stop all streams
        stopAllStreams();
        
        // Clean up all resources
        cleanupResources();
        
        // Finally call the onClose prop
        onClose();
    };

    const setupAudioAnalyser = (stream: MediaStream) => {
        try {
            if (audioAnalyserRef.current) {
                audioAnalyserRef.current.disconnect();
                audioAnalyserRef.current = null;
            }

            const audioContext = new AudioContext();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 128; // Smaller FFT size for better visualization
            analyser.smoothingTimeConstant = 0.7; // Smoother transitions
            source.connect(analyser);
            
            audioAnalyserRef.current = analyser;
            audioDataRef.current = new Uint8Array(analyser.frequencyBinCount);

            const updateAudioLevel = () => {
                if (!audioAnalyserRef.current || !audioDataRef.current || captureState === 'reviewing') {
                    return;
                }
                
                try {
                    audioAnalyserRef.current.getByteFrequencyData(audioDataRef.current);
                    const values = audioDataRef.current;
                    let sum = values.reduce((acc, val) => acc + val, 0);
                    const average = sum / values.length;
                    setAudioLevel(average / 256); // Normalize to 0-1
                } catch (e) {
                    console.error('Error updating audio level:', e);
                }
                
                animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
            };
            
            updateAudioLevel();
        } catch (e) {
            console.error('Error setting up audio analyser:', e);
        }
    };

    const startStream = async () => {
        try {
            // Clean up any existing streams first
            cleanupResources();

            let constraints: MediaStreamConstraints = {
                audio: activeTab === 'audio' || (activeTab === 'camera' && isMicEnabled) 
                    ? { deviceId: selectedAudioDevice } 
                    : false,
                video: activeTab === 'camera' ? {
                    deviceId: selectedVideoDevice,
                    facingMode: 'user',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                } : false
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;

            if (stream.getAudioTracks().length > 0) {
                setupAudioAnalyser(stream);
            }

            if (stream.getVideoTracks().length > 0 && videoRef.current) {
                videoRef.current.srcObject = stream;
                try {
                    await videoRef.current.play();
                } catch (error: any) {
                    if (error.name !== 'AbortError') {
                        throw error;
                    }
                    // If it's an AbortError, the play request was interrupted
                    // This is normal when rapidly switching tabs/devices
                }
            }

            setCaptureState('preview');
        } catch (error) {
            console.error('Error accessing media devices:', error);
            toast.error(`Failed to access ${activeTab} device. Please check permissions.`);
            cleanupResources();
        }
    };

    const startScreenCapture = async () => {
        try {
            cleanupResources();
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 30 }
                },
                audio: false
            });

            let combinedStream = displayStream;
            if (isMicEnabled) {
                try {
                    const audioStream = await navigator.mediaDevices.getUserMedia({
                        audio: { deviceId: selectedAudioDevice }
                    });
                    setupAudioAnalyser(audioStream); // Setup audio visualization for screen recording
                    const tracks = [...displayStream.getTracks(), ...audioStream.getTracks()];
                    combinedStream = new MediaStream(tracks);
                } catch (error) {
                    console.error('Error accessing microphone:', error);
                    toast.error('Failed to access microphone, continuing without audio');
                }
            }

            displayStream.getVideoTracks()[0].addEventListener('ended', () => {
                if (captureState === 'recording') {
                    stopRecording();
                }
                cleanupResources();
                toast.success('Screen recording ended');
            });

            streamRef.current = combinedStream;
            startRecording();
        } catch (error) {
            console.error('Error accessing screen:', error);
            toast.error('Failed to access screen. Please check permissions.');
            cleanupResources();
        }
    };

    const startRecording = () => {
        if (!streamRef.current) return;

        const mediaRecorder = new MediaRecorder(streamRef.current);
        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                chunksRef.current.push(e.data);
            }
        };

        mediaRecorder.onstart = () => {
            toast.success(`${activeTab} recording started`);
            setCaptureState('recording');
        };

        mediaRecorder.onstop = async () => {
            // Stop all streams immediately after recording ends
            const tracks = streamRef.current?.getTracks() || [];
            tracks.forEach(track => track.stop());

            const blob = new Blob(chunksRef.current, {
                type: activeTab === 'audio' ? 'audio/webm' : 'video/webm'
            });
            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);
            setCaptureState('reviewing');
            toast.success(`${activeTab} recording completed`);
        };

        mediaRecorder.start();
    };

    const pauseRecording = () => {
        if (mediaRecorderRef.current && captureState === 'recording') {
            mediaRecorderRef.current.pause();
            setCaptureState('paused');
        } else if (mediaRecorderRef.current && captureState === 'paused') {
            mediaRecorderRef.current.resume();
            setCaptureState('recording');
        }
    };

    const takePicture = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                const videoWidth = videoRef.current.videoWidth;
                const videoHeight = videoRef.current.videoHeight;
                const aspectRatio = videoWidth / videoHeight;
                
                // Set canvas size to match preview dimensions while maintaining aspect ratio
                if (aspectRatio > PREVIEW_WIDTH / PREVIEW_HEIGHT) {
                    canvasRef.current.width = PREVIEW_WIDTH;
                    canvasRef.current.height = PREVIEW_WIDTH / aspectRatio;
                } else {
                    canvasRef.current.height = PREVIEW_HEIGHT;
                    canvasRef.current.width = PREVIEW_HEIGHT * aspectRatio;
                }
                
                // First, capture the image
                context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
                
                // Then convert to blob and create preview URL
                canvasRef.current.toBlob((blob) => {
                    if (blob) {
                        // Stop the camera stream first
                        if (streamRef.current) {
                            streamRef.current.getTracks().forEach(track => track.stop());
                            streamRef.current = null;
                        }
                        if (videoRef.current) {
                            videoRef.current.srcObject = null;
                        }
                        
                        // Clean up old preview URL if it exists
                        if (previewUrl) {
                            URL.revokeObjectURL(previewUrl);
                        }
                        
                        // Create new preview URL and update state
                        const url = URL.createObjectURL(blob);
                        setPreviewUrl(url);
                        setCaptureState('reviewing');
                        toast.success('Photo captured');
                    }
                }, 'image/png');
            }
        }
    };

    const checkStorageSize = async (fileSize: number): Promise<boolean> => {
        try {
            const currentSize = await getImportedFilesSize();
            const totalSize = currentSize + fileSize;
            if (totalSize > 100 * 1024 * 1024) { // 100MB limit
                const proceed = window.confirm(
                    'Warning: Total storage size will exceed 100MB. Large files may affect performance. Continue?'
                );
                return proceed;
            }
            return true;
        } catch (error) {
            console.error('Storage error:', error);
            toast.error('Storage access error. File will still be saved.');
            return true;
        }
    };

    const saveCapture = async () => {
        if (!previewUrl) return;

        try {
            const response = await fetch(previewUrl);
            const blob = await response.blob();
            
            if (await checkStorageSize(blob.size)) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                let fileName, fileType;
                
                if (activeTab === 'camera') {
                    if (isVideoMode) {
                        fileName = `camera-video-${timestamp}.webm`;
                        fileType = 'video/webm';
                    } else {
                        fileName = `camera-photo-${timestamp}.png`;
                        fileType = 'image/png';
                    }
                } else if (activeTab === 'screen') {
                    fileName = `screen-recording-${timestamp}.webm`;
                    fileType = 'video/webm';
                } else {
                    fileName = `audio-recording-${timestamp}.webm`;
                    fileType = 'audio/webm';
                }
                
                const file = new File([blob], fileName, { type: fileType });
                const savedFile = await saveImportedFile(file);
                
                // Clean up all resources before closing
                cleanupResources();
                
                onFileCapture(savedFile);
                onClose();
            }
        } catch (error) {
            console.error('Error saving capture:', error);
            toast.error('Failed to save capture');
            // Still try to clean up even if save failed
            cleanupResources();
        }
    };

    const discardCapture = () => {
        cleanupResources();
        if (activeTab !== 'screen') {
            startStream(); // Only restart stream for audio/camera
        }
    };

    const handleTabChange = (newTab: CaptureMode) => {
        if (captureState === 'recording') {
            if (!window.confirm('Changing tabs will stop the current recording. Continue?')) {
                return;
            }
            stopRecording();
        }
        cleanupResources();
        setActiveTab(newTab);
        setIsVideoMode(newTab === 'camera' ? isVideoMode : false);
    };

    const handleMicToggle = () => {
        const newMicState = !isMicEnabled;
        setIsMicEnabled(newMicState);
        
        if (streamRef.current) {
            const audioTracks = streamRef.current.getAudioTracks();
            audioTracks.forEach(track => {
                track.enabled = newMicState;
            });
        }
    };

    const content = (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-700 w-full max-w-lg">
                {/* Header - make more compact */}
                <div className="flex items-center justify-between p-2 border-b border-gray-700">
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => handleTabChange('audio')}
                            className={`flex items-center space-x-1 px-2 py-1 rounded text-xs
                                      ${activeTab === 'audio' 
                                        ? 'bg-blue-500/20 text-blue-400' 
                                        : 'text-gray-400 hover:text-gray-300'}`}
                        >
                            <FiMic className="w-3 h-3" />
                            <span>Audio</span>
                        </button>
                        <button
                            onClick={() => handleTabChange('camera')}
                            className={`flex items-center space-x-1 px-2 py-1 rounded text-xs
                                      ${activeTab === 'camera' 
                                        ? 'bg-blue-500/20 text-blue-400' 
                                        : 'text-gray-400 hover:text-gray-300'}`}
                        >
                            <FiCamera className="w-3 h-3" />
                            <span>Camera</span>
                        </button>
                        <button
                            onClick={() => handleTabChange('screen')}
                            className={`flex items-center space-x-1 px-2 py-1 rounded text-xs
                                      ${activeTab === 'screen' 
                                        ? 'bg-blue-500/20 text-blue-400' 
                                        : 'text-gray-400 hover:text-gray-300'}`}
                        >
                            <FiMonitor className="w-3 h-3" />
                            <span>Screen</span>
                        </button>
                    </div>
                    <button onClick={handleClose} className="p-1.5 hover:bg-gray-800 rounded text-gray-300 hover:text-white">
                        <FiX className="w-5 h-5" />
                    </button>
                </div>

                {/* Content - make preview area consistent size */}
                <div className="p-2">
                    {/* Device Selection - make more compact */}
                    {(activeTab === 'audio' || activeTab === 'camera') && captureState === 'preview' && (
                        <div className="mb-2 flex space-x-2">
                            {activeTab === 'audio' && audioDevices.length > 0 && (
                                <div className="flex-1">
                                    <label className="block text-sm text-gray-400 mb-1">Microphone</label>
                                    <select
                                        value={selectedAudioDevice}
                                        onChange={(e) => setSelectedAudioDevice(e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg 
                                                 px-3 py-2 text-sm text-gray-300"
                                    >
                                        {audioDevices.map(device => (
                                            <option key={device.deviceId} value={device.deviceId}>
                                                {device.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {activeTab === 'camera' && videoDevices.length > 0 && (
                                <div className="flex-1">
                                    <label className="block text-sm text-gray-400 mb-1">Camera</label>
                                    <select
                                        value={selectedVideoDevice}
                                        onChange={(e) => setSelectedVideoDevice(e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg 
                                                 px-3 py-2 text-sm text-gray-300"
                                    >
                                        {videoDevices.map(device => (
                                            <option key={device.deviceId} value={device.deviceId}>
                                                {device.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Preview Area */}
                    <div className="relative bg-gray-800/50 rounded-lg overflow-hidden mb-2 mx-auto"
                         style={{ 
                             height: `${PREVIEW_HEIGHT}px`, 
                             width: `${PREVIEW_WIDTH}px`,
                             maxWidth: '100%'
                         }}>
                        {activeTab === 'audio' ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-full max-w-md p-4">
                                    {captureState === 'reviewing' ? (
                                        <audio
                                            src={previewUrl || undefined}
                                            controls
                                            className="w-full"
                                        />
                                    ) : (
                                        <div className="flex justify-center space-x-1">
                                            {[...Array(32)].map((_, i) => (
                                                <div
                                                    key={i}
                                                    className="w-1 bg-blue-400/80 rounded-full transition-all duration-50"
                                                    style={{
                                                        height: `${Math.max(4, audioLevel * 64)}px`,
                                                        opacity: captureState === 'recording' ? 1 : 0.5
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : activeTab === 'screen' ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                                {captureState === 'idle' ? (
                                    <div className="text-center text-gray-400">
                                        <FiMonitor className="w-8 h-8 mx-auto mb-2" />
                                        <p className="text-sm">Click the button below to select a screen and start recording</p>
                                    </div>
                                ) : (
                                    <>
                                        <video
                                            ref={videoRef}
                                            className={`w-full h-full object-contain ${captureState === 'reviewing' ? 'hidden' : ''}`}
                                            playsInline
                                            muted
                                        />
                                        {previewUrl && captureState === 'reviewing' && (
                                            <video
                                                src={previewUrl}
                                                className="w-full h-full object-contain"
                                                controls
                                                playsInline
                                            />
                                        )}
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="relative w-full h-full">
                                {captureState !== 'reviewing' && (
                                    <video
                                        ref={videoRef}
                                        className="w-full h-full object-contain"
                                        playsInline
                                        muted
                                    />
                                )}
                                {captureState === 'reviewing' && previewUrl && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        {!isVideoMode ? (
                                            <img
                                                src={previewUrl}
                                                className="max-w-full max-h-full object-contain"
                                                alt="Captured"
                                            />
                                        ) : (
                                            <video
                                                src={previewUrl}
                                                className="max-w-full max-h-full object-contain"
                                                controls
                                                playsInline
                                            />
                                        )}
                                    </div>
                                )}
                                <canvas ref={canvasRef} className="hidden" />
                            </div>
                        )}
                    </div>

                    {/* Controls - make more compact */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                            {captureState === 'preview' && activeTab === 'camera' && (
                                <div className="flex items-center space-x-2 mr-4">
                                    <button
                                        onClick={() => setIsVideoMode(false)}
                                        className={`px-3 py-1.5 rounded-full text-sm ${
                                            !isVideoMode 
                                                ? 'bg-blue-500/20 text-blue-400' 
                                                : 'text-gray-400 hover:text-gray-300'
                                        }`}
                                    >
                                        <FiCamera className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setIsVideoMode(true)}
                                        className={`px-3 py-1.5 rounded-full text-sm ${
                                            isVideoMode 
                                                ? 'bg-blue-500/20 text-blue-400' 
                                                : 'text-gray-400 hover:text-gray-300'
                                        }`}
                                    >
                                        <FiVideo className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            {(captureState === 'idle' || captureState === 'preview') && (
                                <>
                                    {activeTab === 'screen' ? (
                                        <button
                                            onClick={startScreenCapture}
                                            className="px-4 py-2 bg-red-500 hover:bg-red-600 
                                                     text-white rounded-lg text-sm"
                                        >
                                            Select Screen & Start Recording
                                        </button>
                                    ) : activeTab === 'camera' ? (
                                        <button
                                            onClick={isVideoMode ? startRecording : takePicture}
                                            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 
                                                     text-white rounded-lg text-sm"
                                        >
                                            {isVideoMode ? 'Start Recording' : 'Take Picture'}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={startRecording}
                                            className="px-4 py-2 bg-red-500 hover:bg-red-600 
                                                     text-white rounded-lg text-sm"
                                        >
                                            Start Recording
                                        </button>
                                    )}
                                </>
                            )}

                            {(captureState === 'recording' || captureState === 'paused') && (
                                <>
                                    <button
                                        onClick={pauseRecording}
                                        className="p-2 hover:bg-gray-800 rounded-lg"
                                    >
                                        {captureState === 'recording' ? (
                                            <FiPause className="w-5 h-5" />
                                        ) : (
                                            <FiPlay className="w-5 h-5" />
                                        )}
                                    </button>
                                    <button
                                        onClick={stopRecording}
                                        className="px-4 py-2 bg-red-500 hover:bg-red-600 
                                                 text-white rounded-lg text-sm"
                                    >
                                        Stop
                                    </button>
                                </>
                            )}
                            {captureState === 'reviewing' && (
                                <>
                                    <button
                                        onClick={saveCapture}
                                        className="flex items-center space-x-2 px-4 py-2 
                                                 bg-green-500/20 hover:bg-green-500/30 
                                                 text-green-400 hover:text-green-300 
                                                 rounded-lg text-sm"
                                    >
                                        <FiCheck className="w-4 h-4" />
                                        <span>Save</span>
                                    </button>
                                    <button
                                        onClick={discardCapture}
                                        className="flex items-center space-x-2 px-4 py-2 
                                                 bg-red-500/20 hover:bg-red-500/30 
                                                 text-red-400 hover:text-red-300 
                                                 rounded-lg text-sm"
                                    >
                                        <FiTrash2 className="w-4 h-4" />
                                        <span>Discard</span>
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Add mic toggle for screen recording */}
                        {(activeTab === 'camera' || activeTab === 'screen') && 
                         (captureState === 'preview' || captureState === 'idle') && (
                            <button
                                onClick={handleMicToggle}
                                className={`p-1.5 rounded ${isMicEnabled 
                                    ? 'text-gray-400 hover:text-gray-300' 
                                    : 'bg-red-500/20 text-red-400'}`}
                                title={isMicEnabled ? 'Disable microphone' : 'Enable microphone'}
                            >
                                {isMicEnabled ? <FiMic className="w-4 h-4" /> : <FiMicOff className="w-4 h-4" />}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(content, document.body);
};

export default AVCaptureDashboard; 