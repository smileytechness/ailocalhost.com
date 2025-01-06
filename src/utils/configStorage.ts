// src/utils/configStorage.ts
import { APISettings } from '../types/api';

const STORAGE_KEY = 'ollama_saved_configs';
const LAST_USED_KEY = 'ollama_last_used_config';

export const loadSavedConfigs = (): APISettings[] => {
    const savedConfigs = localStorage.getItem(STORAGE_KEY);
    const configs = savedConfigs ? JSON.parse(savedConfigs) : [];
    
    // Sort by timestamp in descending order (most recent first)
    return configs.sort((a: APISettings, b: APISettings) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
    });
};

export const saveConfig = (config: APISettings): APISettings => {
    const configs = loadSavedConfigs();
    
    // Create a new config with a unique ID and timestamp
    const newConfig = {
        ...config,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString()
    };

    // Add the new config to the list
    configs.push(newConfig);
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
    
    // Update last used config
    setLastUsedConfig(config);
    
    // Dispatch storage event for other components
    window.dispatchEvent(new Event('savedConfigsUpdated'));
    
    return newConfig;
};

export const setLastUsedConfig = (config: APISettings): void => {
    localStorage.setItem(LAST_USED_KEY, JSON.stringify(config));
};

export const getLastUsedConfig = (): APISettings | null => {
    const lastUsed = localStorage.getItem(LAST_USED_KEY);
    if (lastUsed) {
        return JSON.parse(lastUsed);
    }
    const savedConfigs = loadSavedConfigs();
    return savedConfigs.length > 0 ? savedConfigs[0] : null;
};

export const deleteConfig = (id: string): void => {
    const configs = loadSavedConfigs();
    const newConfigs = configs.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfigs));
    
    // Dispatch storage event for other components
    window.dispatchEvent(new Event('savedConfigsUpdated'));
};