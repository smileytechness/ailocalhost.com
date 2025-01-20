import React, { useState, useEffect, useRef } from 'react';
import { FiSearch, FiX, FiDownload, FiEdit2, FiEye, FiTrash2, FiMoreVertical } from 'react-icons/fi';
import { loadImportedFiles, deleteImportedFile, renameImportedFile } from '../../utils/fileStorage';
import { toast } from 'react-hot-toast';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { createPortal } from 'react-dom';

interface FileSelectionModalProps {
    onClose: () => void;
    onSelect: (files: Array<{ id: string; name: string; type: string; data: string; size: number }>) => void;
}

// Helper function to determine if a file is text-based
const isTextFile = (filename: string): boolean => {
    const textExtensions = [
        '.txt', '.json', '.csv', '.md', '.js', '.jsx', '.ts', '.tsx', 
        '.html', '.css', '.scss', '.py', '.java', '.cpp', '.c', '.h',
        '.sql', '.yml', '.yaml', '.xml', '.sh', '.bash', '.zsh', '.fish',
        '.ini', '.conf', '.config', '.env', '.gitignore', '.log'
    ];
    return textExtensions.some(ext => filename.toLowerCase().endsWith(ext));
};

// Helper function to get language for syntax highlighting
const getLanguage = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const languageMap: { [key: string]: string } = {
        'js': 'javascript',
        'jsx': 'jsx',
        'ts': 'typescript',
        'tsx': 'tsx',
        'py': 'python',
        'java': 'java',
        'cpp': 'cpp',
        'c': 'c',
        'h': 'c',
        'css': 'css',
        'scss': 'scss',
        'html': 'html',
        'xml': 'xml',
        'json': 'json',
        'yaml': 'yaml',
        'yml': 'yaml',
        'md': 'markdown',
        'sh': 'bash',
        'bash': 'bash',
        'zsh': 'bash',
        'fish': 'bash',
        'sql': 'sql'
    };
    return languageMap[ext] || 'text';
};

const FileSelectionModal: React.FC<FileSelectionModalProps> = ({ onClose, onSelect }) => {
    const [files, setFiles] = useState<Array<{ id: string; name: string; type: string; data: string; size: number }>>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
    const [showMoreOptions, setShowMoreOptions] = useState<string | null>(null);
    const [editingFile, setEditingFile] = useState<{ id: string; name: string } | null>(null);
    const [previewFile, setPreviewFile] = useState<{ id: string; name: string; type: string; data: string } | null>(null);
    const moreOptionsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (moreOptionsRef.current && !moreOptionsRef.current.contains(event.target as Node)) {
                setShowMoreOptions(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const loadFiles = async () => {
            const importedFiles = await loadImportedFiles();
            setFiles(importedFiles.map(file => ({
                id: file.id,
                name: file.name,
                type: file.type,
                data: file.data,
                size: file.size
            })));
        };
        loadFiles();
    }, []);

    const filteredFiles = files.filter(file =>
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSelect = () => {
        const selectedFileObjects = files.filter(file => selectedFiles.has(file.id));
        onSelect(selectedFileObjects);
        onClose();
    };

    const toggleFileSelection = (fileId: string) => {
        const newSelected = new Set(selectedFiles);
        if (newSelected.has(fileId)) {
            newSelected.delete(fileId);
        } else {
            newSelected.add(fileId);
        }
        setSelectedFiles(newSelected);
    };

    const handleDownload = (file: { id: string; name: string; type: string; data: string }) => {
        try {
            const byteCharacters = atob(file.data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray]);

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading file:', error);
            toast.error('Failed to download file');
        }
    };

    const handleRenameFile = async (id: string, newName: string) => {
        await renameImportedFile(id, newName);
        setEditingFile(null);
        const importedFiles = await loadImportedFiles();
        setFiles(importedFiles.map(file => ({
            id: file.id,
            name: file.name,
            type: file.type,
            data: file.data,
            size: file.size
        })));
    };

    const handleDeleteFile = async (fileId: string) => {
        try {
            await deleteImportedFile(fileId);
            setFiles(prev => prev.filter(f => f.id !== fileId));
            setSelectedFiles(prev => {
                const newSelected = new Set(prev);
                newSelected.delete(fileId);
                return newSelected;
            });
        } catch (error) {
            console.error('Error deleting file:', error);
            toast.error('Failed to delete file');
        }
    };

    const content = (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-700 w-full max-w-lg">
                <div className="flex items-center justify-between p-3 border-b border-gray-700">
                    <h3 className="text-sm font-medium text-gray-200">Select Files</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-gray-300">
                        <FiX className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-3">
                    <div className="relative mb-3">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search files..."
                            className="w-full pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 
                                     rounded-lg text-sm text-gray-200 placeholder-gray-400 
                                     focus:ring-2 focus:ring-blue-500"
                        />
                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 
                                           w-4 h-4 text-gray-400" />
                    </div>

                    <div className="max-h-[300px] overflow-y-auto">
                        {filteredFiles.map(file => (
                            <div
                                key={file.id}
                                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer 
                                          ${selectedFiles.has(file.id) 
                                              ? 'bg-blue-500/20 text-blue-400' 
                                              : 'text-gray-300 hover:bg-gray-800'}`}
                            >
                                <div className="flex items-center flex-1 min-w-0" onClick={() => toggleFileSelection(file.id)}>
                                    <input
                                        type="checkbox"
                                        checked={selectedFiles.has(file.id)}
                                        onChange={() => toggleFileSelection(file.id)}
                                        className="mr-3"
                                    />
                                    {editingFile?.id === file.id ? (
                                        <input
                                            type="text"
                                            value={editingFile.name}
                                            onChange={e => setEditingFile({ ...editingFile, name: e.target.value })}
                                            onBlur={() => handleRenameFile(file.id, editingFile.name)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                    handleRenameFile(file.id, editingFile.name);
                                                }
                                            }}
                                            className="bg-gray-700 px-1 rounded text-xs"
                                            autoFocus
                                            onClick={e => e.stopPropagation()}
                                        />
                                    ) : (
                                        <div className="relative group/tooltip flex-1 min-w-0">
                                            <span className="text-sm truncate block">{file.name}</span>
                                            <div className="absolute bottom-full left-0 mb-1 hidden group-hover/tooltip:block">
                                                <div className="bg-gray-900 text-xs text-gray-300 px-2 py-1 rounded shadow-lg border border-gray-700 whitespace-nowrap">
                                                    {file.name}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="relative flex items-center" onClick={e => e.stopPropagation()}>
                                    <button
                                        onClick={() => setShowMoreOptions(showMoreOptions === file.id ? null : file.id)}
                                        className="p-1 hover:bg-gray-700 rounded group/button"
                                        title="More options"
                                    >
                                        <FiMoreVertical className="w-3.5 h-3.5" />
                                        <span className="absolute hidden group-hover/button:block bottom-full right-0 mb-1 bg-gray-900 text-xs text-gray-300 px-2 py-1 rounded shadow-lg border border-gray-700 whitespace-nowrap">
                                            More options
                                        </span>
                                    </button>
                                    {showMoreOptions === file.id && (
                                        <div ref={moreOptionsRef} className="absolute right-0 top-full mt-1 bg-gray-800 rounded-lg shadow-lg border border-gray-700 py-1 z-10">
                                            <button
                                                onClick={() => {
                                                    handleDownload(file);
                                                    setShowMoreOptions(null);
                                                }}
                                                className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700"
                                            >
                                                <FiDownload className="w-3 h-3" />
                                                <span>Download</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditingFile({ id: file.id, name: file.name });
                                                    setShowMoreOptions(null);
                                                }}
                                                className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700"
                                            >
                                                <FiEdit2 className="w-3 h-3" />
                                                <span>Rename</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setPreviewFile(file);
                                                    setShowMoreOptions(null);
                                                }}
                                                className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700"
                                            >
                                                <FiEye className="w-3 h-3" />
                                                <span>Preview</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    handleDeleteFile(file.id);
                                                    setShowMoreOptions(null);
                                                }}
                                                className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-red-400 hover:bg-gray-700"
                                            >
                                                <FiTrash2 className="w-3 h-3" />
                                                <span>Delete</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end space-x-2 p-3 border-t border-gray-700">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSelect}
                        disabled={selectedFiles.size === 0}
                        className="px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 
                                 text-white rounded-lg disabled:opacity-50 
                                 disabled:hover:bg-blue-500"
                    >
                        Attach Selected
                    </button>
                </div>
            </div>

            {/* Preview Modal */}
            {previewFile && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                    <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-700 w-full max-w-3xl max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b border-gray-700">
                            <h3 className="text-sm font-medium text-gray-200">{previewFile.name}</h3>
                            <button
                                onClick={() => setPreviewFile(null)}
                                className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-gray-300"
                            >
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-4">
                            {previewFile.type === 'image' && (
                                <img 
                                    src={`data:image;base64,${previewFile.data}`}
                                    alt={previewFile.name}
                                    className="max-w-full h-auto"
                                />
                            )}
                            {previewFile.type === 'video' && (
                                <video 
                                    src={`data:video/webm;base64,${previewFile.data}`}
                                    controls
                                    className="max-w-full h-auto"
                                />
                            )}
                            {previewFile.type === 'audio' && (
                                <audio 
                                    src={`data:audio/webm;base64,${previewFile.data}`}
                                    controls
                                    className="w-full"
                                />
                            )}
                            {(previewFile.type === 'document' || previewFile.type === 'text') && isTextFile(previewFile.name) && (
                                <div className="bg-gray-800 rounded overflow-hidden">
                                    <SyntaxHighlighter
                                        language={getLanguage(previewFile.name)}
                                        style={vscDarkPlus}
                                        customStyle={{
                                            margin: 0,
                                            borderRadius: 0,
                                            background: 'transparent'
                                        }}
                                    >
                                        {atob(previewFile.data)}
                                    </SyntaxHighlighter>
                                </div>
                            )}
                            {(previewFile.type === 'document' || previewFile.type === 'text') && !isTextFile(previewFile.name) && (
                                <div className="bg-gray-800 p-4 rounded">
                                    <p className="text-sm text-gray-400">
                                        Preview not available for this file type.
                                        Please download the file to view its contents.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    return createPortal(content, document.body);
};

export default FileSelectionModal; 