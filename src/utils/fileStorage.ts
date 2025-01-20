import { v4 as uuidv4 } from 'uuid';

export interface ImportedFile {
    id: string;
    name: string;
    type: 'audio' | 'video' | 'image' | 'document' | 'text';
    size: number;
    data: string; // Base64 encoded data
    timestamp: string;
    groupId?: string; // For file grouping
}

export interface FileGroup {
    id: string;
    name: string;
    timestamp: string;
    files: string[]; // Array of file IDs
}

const DB_NAME = 'imported_files_db';
const DB_VERSION = 1;
const FILES_STORE = 'files';
const GROUPS_STORE = 'groups';

// Initialize IndexedDB
const initDB = async (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            
            // Create stores if they don't exist
            if (!db.objectStoreNames.contains(FILES_STORE)) {
                db.createObjectStore(FILES_STORE, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(GROUPS_STORE)) {
                db.createObjectStore(GROUPS_STORE, { keyPath: 'id' });
            }
        };
    });
};

// Load all imported files
export const loadImportedFiles = async (): Promise<ImportedFile[]> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(FILES_STORE, 'readonly');
        const store = transaction.objectStore(FILES_STORE);
        const request = store.getAll();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const files = request.result;
            resolve(files.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
        };
    });
};

// Load all file groups
export const loadFileGroups = async (): Promise<FileGroup[]> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(GROUPS_STORE, 'readonly');
        const store = transaction.objectStore(GROUPS_STORE);
        const request = store.getAll();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const groups = request.result;
            resolve(groups.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
        };
    });
};

// Save a new file
export const saveImportedFile = async (file: File): Promise<ImportedFile> => {
    const db = await initDB();
    
    // Convert file to base64
    const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            resolve(base64.split(',')[1]);
        };
        reader.readAsDataURL(file);
    });

    // Determine file type
    let type: ImportedFile['type'] = 'document';
    if (file.type.startsWith('audio/')) type = 'audio';
    else if (file.type.startsWith('image/')) type = 'image';
    else if (file.type.startsWith('video/')) type = 'video';

    const newFile: ImportedFile = {
        id: uuidv4(),
        name: file.name,
        type,
        size: file.size,
        data: base64,
        timestamp: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(FILES_STORE, 'readwrite');
        const store = transaction.objectStore(FILES_STORE);
        const request = store.add(newFile);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            window.dispatchEvent(new Event('importedFilesUpdated'));
            resolve(newFile);
        };
    });
};

// Delete a file
export const deleteImportedFile = async (fileId: string): Promise<void> => {
    const db = await initDB();
    
    // Delete file
    await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(FILES_STORE, 'readwrite');
        const store = transaction.objectStore(FILES_STORE);
        const request = store.delete(fileId);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });

    // Update groups
    const groups = await loadFileGroups();
    const updatedGroups = groups.map(group => ({
        ...group,
        files: group.files.filter(id => id !== fileId)
    }));

    await Promise.all(updatedGroups.map(group => updateFileGroup(group.id, group)));
    window.dispatchEvent(new Event('importedFilesUpdated'));
};

// Clear all files
export const clearAllImportedFiles = async (): Promise<void> => {
    const db = await initDB();
    
    // Clear files
    await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(FILES_STORE, 'readwrite');
        const store = transaction.objectStore(FILES_STORE);
        const request = store.clear();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });

    // Clear groups
    await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(GROUPS_STORE, 'readwrite');
        const store = transaction.objectStore(GROUPS_STORE);
        const request = store.clear();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });

    window.dispatchEvent(new Event('importedFilesUpdated'));
};

// Create a new file group
export const createFileGroup = async (name: string, fileIds: string[]): Promise<FileGroup> => {
    const db = await initDB();
    
    const newGroup: FileGroup = {
        id: uuidv4(),
        name,
        timestamp: new Date().toISOString(),
        files: fileIds
    };

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(GROUPS_STORE, 'readwrite');
        const store = transaction.objectStore(GROUPS_STORE);
        const request = store.add(newGroup);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            window.dispatchEvent(new Event('importedFilesUpdated'));
            resolve(newGroup);
        };
    });
};

// Update file group
export const updateFileGroup = async (groupId: string, updates: Partial<FileGroup>): Promise<void> => {
    const db = await initDB();
    const groups = await loadFileGroups();
    const group = groups.find(g => g.id === groupId);
    
    if (!group) return;

    const updatedGroup = { ...group, ...updates };
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(GROUPS_STORE, 'readwrite');
        const store = transaction.objectStore(GROUPS_STORE);
        const request = store.put(updatedGroup);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            window.dispatchEvent(new Event('importedFilesUpdated'));
            resolve();
        };
    });
};

// Delete file group
export const deleteFileGroup = async (groupId: string): Promise<void> => {
    const db = await initDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(GROUPS_STORE, 'readwrite');
        const store = transaction.objectStore(GROUPS_STORE);
        const request = store.delete(groupId);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            window.dispatchEvent(new Event('importedFilesUpdated'));
            resolve();
        };
    });
};

// Add files to group
export const addFilesToGroup = async (groupId: string, fileIds: string[]): Promise<void> => {
    const groups = await loadFileGroups();
    const group = groups.find(g => g.id === groupId);
    
    if (!group) return;

    const newFiles = [...new Set([...group.files, ...fileIds])];
    await updateFileGroup(groupId, { ...group, files: newFiles });
};

// Remove files from group
export const removeFilesFromGroup = async (groupId: string, fileIds: string[]): Promise<void> => {
    const groups = await loadFileGroups();
    const group = groups.find(g => g.id === groupId);
    
    if (!group) return;

    const updatedFiles = group.files.filter(id => !fileIds.includes(id));
    await updateFileGroup(groupId, { ...group, files: updatedFiles });
};

// Rename file
export const renameImportedFile = async (fileId: string, newName: string): Promise<void> => {
    const db = await initDB();
    const files = await loadImportedFiles();
    const file = files.find(f => f.id === fileId);
    
    if (!file) return;

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(FILES_STORE, 'readwrite');
        const store = transaction.objectStore(FILES_STORE);
        const request = store.put({ ...file, name: newName });

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            window.dispatchEvent(new Event('importedFilesUpdated'));
            resolve();
        };
    });
};

// Get total storage size
export const getImportedFilesSize = async (): Promise<number> => {
    const files = await loadImportedFiles();
    return files.reduce((total, file) => total + file.size, 0);
}; 