// src/utils/configStorage.ts
import { APISettings } from '../types/api';

const STORAGE_KEY = 'ollama_saved_configs';

export const loadSavedConfigs = (): APISettings[] => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
};

export const saveConfig = (settings: APISettings) => {
    const configs = loadSavedConfigs();
    const newConfig = {
        ...settings,
        id: Date.now().toString(),
        name: settings.name || new URL(settings.serverUrl).hostname
    };
    
    configs.push(newConfig);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
    return newConfig;
};

export const deleteConfig = (id: string) => {
    const configs = loadSavedConfigs();
    const filtered = configs.filter(config => config.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

export const updateConfigName = (id: string, newName: string) => {
    const configs = loadSavedConfigs();
    const updated = configs.map(config => 
        config.id === id ? {...config, name: newName} : config
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};