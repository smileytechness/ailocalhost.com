import React, { useState, useEffect, useRef } from 'react';
import { FiTrash2, FiEdit2, FiFolder, FiFolderPlus, FiX, FiChevronDown, FiDownload, FiEye, FiPlus, FiMoreVertical } from 'react-icons/fi';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
    ImportedFile,
    loadImportedFiles,
    deleteImportedFile,
    renameImportedFile,
    clearAllImportedFiles,
    createFileGroup,
    updateFileGroup,
    FileGroup,
    getImportedFilesSize,
    loadFileGroups,
    deleteFileGroup
} from '../../utils/fileStorage';
import { toast } from 'react-hot-toast';

interface ImportedFilesProps {
    onAppendToChat?: (file: ImportedFile) => void;
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

const ImportedFiles: React.FC<ImportedFilesProps> = ({ onAppendToChat }) => {
    const [files, setFiles] = useState<ImportedFile[]>([]);
    const [groups, setGroups] = useState<FileGroup[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
    const [showNewGroupDialog, setShowNewGroupDialog] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [editingFile, setEditingFile] = useState<{ id: string; name: string } | null>(null);
    const [editingGroup, setEditingGroup] = useState<{ id: string; name: string } | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
    const [totalSize, setTotalSize] = useState<number>(0);
    const [previewFile, setPreviewFile] = useState<ImportedFile | null>(null);
    const [showMoreOptions, setShowMoreOptions] = useState<string | null>(null);
    const moreOptionsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadFiles = async () => {
            const [loadedFiles, loadedGroups, size] = await Promise.all([
                loadImportedFiles(),
                loadFileGroups(),
                getImportedFilesSize()
            ]);
            setFiles(loadedFiles);
            setGroups(loadedGroups);
            setTotalSize(size);
        };
        loadFiles();
        
        const handleFilesUpdate = () => {
            loadFiles();
        };
        
        window.addEventListener('importedFilesUpdated', handleFilesUpdate);
        return () => {
            window.removeEventListener('importedFilesUpdated', handleFilesUpdate);
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (moreOptionsRef.current && !moreOptionsRef.current.contains(event.target as Node)) {
                setShowMoreOptions(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    };

    const handleCreateGroup = async () => {
        if (newGroupName.trim()) {
            await createFileGroup(newGroupName.trim(), selectedFiles);
            setNewGroupName('');
            setShowNewGroupDialog(false);
            setSelectedFiles([]);
        }
    };

    const handleRenameFile = async (id: string, newName: string) => {
        await renameImportedFile(id, newName);
        setEditingFile(null);
    };

    const handleRenameGroup = async (id: string, newName: string) => {
        await updateFileGroup(id, { name: newName });
        setEditingGroup(null);
    };

    const handleDeleteSelected = async () => {
        await Promise.all(selectedFiles.map(deleteImportedFile));
        setSelectedFiles([]);
        setShowDeleteConfirm(false);
    };

    const toggleFileSelection = (id: string) => {
        setSelectedFiles(prev => 
            prev.includes(id) 
                ? prev.filter(fid => fid !== id)
                : [...prev, id]
        );
    };

    const toggleGroupExpansion = (groupId: string) => {
        setExpandedGroups(prev => 
            prev.includes(groupId)
                ? prev.filter(id => id !== groupId)
                : [...prev, groupId]
        );
    };

    const calculateGroupSize = (files: ImportedFile[]): number => {
        return files.reduce((total, file) => total + file.size, 0);
    };

    const handleDeleteFile = async (fileId: string) => {
        try {
            await deleteImportedFile(fileId);
        } catch (error) {
            console.error('Error deleting file:', error);
            toast.error('Failed to delete file');
        }
    };

    const handleDeleteGroup = async (groupId: string) => {
        try {
            await deleteFileGroup(groupId);
        } catch (error) {
            console.error('Error deleting group:', error);
            toast.error('Failed to delete group');
        }
    };

    const handleClearAllFiles = async () => {
        try {
            await clearAllImportedFiles();
            toast.success('All files cleared');
        } catch (error) {
            console.error('Error clearing files:', error);
            toast.error('Failed to clear files');
        }
    };

    const handleDownload = (file: ImportedFile) => {
        try {
            // Convert base64 to blob
            const byteCharacters = atob(file.data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray]);

            // Create download link
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

    const handlePreview = (file: ImportedFile) => {
        setPreviewFile(file);
    };

    const handleAppendToChat = (file: ImportedFile) => {
        if (onAppendToChat) {
            onAppendToChat(file);
            toast.success('File added to chat');
        }
    };

    const renderFileItem = (file: ImportedFile) => (
        <div
            key={file.id}
            className="flex items-center justify-between 
                     bg-gray-800/30 hover:bg-gray-800/50 
                     rounded p-2 group"
        >
            <div className="flex items-center space-x-2 min-w-0 flex-1">
                <input
                    type="checkbox"
                    checked={selectedFiles.includes(file.id)}
                    onChange={() => toggleFileSelection(file.id)}
                    className="rounded border-gray-600 
                             text-blue-500 focus:ring-blue-500"
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
                    />
                ) : (
                    <div className="relative group/tooltip flex-1 min-w-0">
                        <span className="text-xs text-gray-300 truncate block">{file.name}</span>
                        <div className="absolute bottom-full left-0 mb-1 hidden group-hover/tooltip:block">
                            <div className="bg-gray-900 text-xs text-gray-300 px-2 py-1 rounded shadow-lg border border-gray-700 whitespace-nowrap">
                                {file.name}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <div className="flex items-center space-x-2 text-[10px] text-gray-500 shrink-0">
                <span>{formatFileSize(file.size)}</span>
                <div className="flex items-center space-x-1">
                    <button
                        onClick={() => handleAppendToChat(file)}
                        className="p-1 hover:bg-gray-700 rounded group/button"
                        title="Add to chat"
                    >
                        <FiPlus className="w-2.5 h-2.5" />
                        <span className="absolute hidden group-hover/button:block bottom-full right-0 mb-1 bg-gray-900 text-xs text-gray-300 px-2 py-1 rounded shadow-lg border border-gray-700 whitespace-nowrap">
                            Add to chat
                        </span>
                    </button>
                    <div className="relative">
                        <button
                            onClick={() => setShowMoreOptions(showMoreOptions === file.id ? null : file.id)}
                            className="p-1 hover:bg-gray-700 rounded group/button"
                            title="More options"
                        >
                            <FiMoreVertical className="w-2.5 h-2.5" />
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
                                        handlePreview(file);
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
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col">
            {/* Header with storage info */}
            <div className="flex flex-col p-2 border-b border-gray-700">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-200">Imported Files</h3>
                    <div className="flex items-center space-x-2">
                        {selectedFiles.length > 0 && (
                            <>
                                <button
                                    onClick={() => setShowNewGroupDialog(true)}
                                    className="flex items-center space-x-1 px-2 py-1 text-xs
                                             bg-gray-700 hover:bg-gray-600 rounded"
                                >
                                    <FiFolderPlus className="w-3 h-3" />
                                    <span>New Group</span>
                                </button>
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="flex items-center space-x-1 px-2 py-1 text-xs
                                             bg-red-500/20 hover:bg-red-500/30 
                                             text-red-400 hover:text-red-300 rounded"
                                >
                                    <FiTrash2 className="w-3 h-3" />
                                    <span>Delete Selected</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                    <div className="space-x-2">
                        <span>{groups.length} Folders</span>
                        <span>•</span>
                        <span>{files.length} Files</span>
                    </div>
                    <span>{formatFileSize(totalSize)}</span>
                </div>
            </div>

            {/* File list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {/* Groups */}
                {groups.map(group => {
                    const groupFiles = files.filter(file => group.files.includes(file.id));
                    const isExpanded = expandedGroups.includes(group.id);
                    const groupSize = calculateGroupSize(groupFiles);

                    return (
                        <div key={group.id} className="space-y-1">
                            <div className="flex items-center justify-between 
                                          bg-gray-800/50 rounded p-2 cursor-pointer
                                          hover:bg-gray-800/70"
                                 onClick={() => toggleGroupExpansion(group.id)}
                            >
                                <div className="flex items-center space-x-2">
                                    <FiChevronDown className={`w-3 h-3 text-gray-400 transform transition-transform
                                                             ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                                    <FiFolder className="w-3.5 h-3.5 text-gray-400" />
                                    {editingGroup?.id === group.id ? (
                                        <input
                                            type="text"
                                            value={editingGroup.name}
                                            onChange={e => setEditingGroup({ ...editingGroup, name: e.target.value })}
                                            onBlur={() => handleRenameGroup(group.id, editingGroup.name)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                    handleRenameGroup(group.id, editingGroup.name);
                                                }
                                            }}
                                            className="bg-gray-700 px-1 rounded text-xs"
                                            autoFocus
                                            onClick={e => e.stopPropagation()}
                                        />
                                    ) : (
                                        <span className="text-xs text-gray-300">{group.name}</span>
                                    )}
                                    <div className="text-[10px] text-gray-500">
                                        {groupFiles.length} files • {formatFileSize(groupSize)}
                                    </div>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingGroup({ id: group.id, name: group.name });
                                        }}
                                        className="p-1 hover:bg-gray-700 rounded"
                                    >
                                        <FiEdit2 className="w-3 h-3 text-gray-400" />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteGroup(group.id);
                                        }}
                                        className="p-1 hover:bg-gray-700 rounded"
                                    >
                                        <FiTrash2 className="w-3 h-3 text-gray-400" />
                                    </button>
                                </div>
                            </div>

                            {/* Files in group */}
                            {isExpanded && (
                                <div className="pl-4 space-y-1">
                                    {groupFiles.map(file => renderFileItem(file))}
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Ungrouped files */}
                {files
                    .filter(file => !groups.some(g => g.files.includes(file.id)))
                    .map(file => renderFileItem(file))}

                {files.length === 0 && (
                    <div className="text-center text-xs text-gray-500 py-8">
                        No imported files yet
                    </div>
                )}
            </div>

            {/* Footer */}
            {files.length > 0 && (
                <div className="p-2 border-t border-gray-700">
                    <button
                        onClick={handleClearAllFiles}
                        className="w-full px-3 py-2 text-sm text-red-400 
                                 hover:text-red-300 bg-red-500/10 
                                 hover:bg-red-500/20 rounded"
                    >
                        Clear All Files
                    </button>
                </div>
            )}

            {/* New group dialog */}
            {showNewGroupDialog && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
                    <div className="bg-gray-900 p-4 rounded-lg shadow-lg border border-gray-700 w-80">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium text-gray-200">Create New Group</h3>
                            <button
                                onClick={() => setShowNewGroupDialog(false)}
                                className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-gray-300"
                            >
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>
                        <input
                            type="text"
                            value={newGroupName}
                            onChange={e => setNewGroupName(e.target.value)}
                            placeholder="Group name"
                            className="w-full p-2 bg-gray-800 border border-gray-700 
                                     rounded mb-4 text-gray-200 placeholder-gray-400 
                                     focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex justify-end space-x-2">
                            <button
                                onClick={() => setShowNewGroupDialog(false)}
                                className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 
                                         text-gray-300 hover:text-gray-200 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateGroup}
                                className="px-4 py-2 text-sm bg-blue-500 
                                         hover:bg-blue-600 text-white rounded"
                                disabled={!newGroupName.trim()}
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete confirmation dialog */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
                    <div className="bg-gray-900 p-4 rounded-lg shadow-lg border border-gray-700 w-80">
                        <h3 className="text-lg font-medium text-gray-200 mb-2">Delete Files?</h3>
                        <p className="text-sm text-gray-400 mb-4">
                            Are you sure you want to delete {selectedFiles.length} selected file(s)?
                        </p>
                        <div className="flex justify-end space-x-2">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 
                                         text-gray-300 hover:text-gray-200 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteSelected}
                                className="px-4 py-2 text-sm bg-red-500/20 hover:bg-red-500/30 
                                         text-red-400 hover:text-red-300 rounded"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
};

export default ImportedFiles; 