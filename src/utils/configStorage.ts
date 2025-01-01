// src/utils/configStorage.ts
import { APISettings } from '../types/api';

const STORAGE_KEY = 'ollama_saved_configs';
const LAST_USED_KEY = 'ollama_last_used_config';

export const loadSavedConfigs = (): APISettings[] => {
    const savedConfigs = localStorage.getItem(STORAGE_KEY);
    return savedConfigs ? JSON.parse(savedConfigs) : [];
};

export const saveConfig = (config: APISettings): APISettings => {
    const configs = loadSavedConfigs();
    const existingIndex = configs.findIndex(c => c.serverUrl === config.serverUrl);

    if (existingIndex >= 0) {
        configs[existingIndex] = config;
    } else {
        configs.push(config);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
    setLastUsedConfig(config);
    return config;
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

export const deleteConfig = (serverUrl: string): void => {
    const configs = loadSavedConfigs();
    const newConfigs = configs.filter(c => c.serverUrl !== serverUrl);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfigs));
};