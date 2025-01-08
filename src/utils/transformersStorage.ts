import { TransformersModel, TransformersSettings } from '../types/transformers';

export const TRANSFORMERS_STORAGE_KEY = 'transformers_settings';
export const TRANSFORMERS_UI_STATE_KEY = 'transformers_ui_state';

interface TransformersUIState {
    isExpanded: boolean;
    isConsoleExpanded: boolean;
    selectedTab: string;
}

const defaultSettings: TransformersSettings = {
    enabled: false,
    useWebGPU: false,
    models: []
};

const defaultUIState: TransformersUIState = {
    isExpanded: false,
    isConsoleExpanded: false,
    selectedTab: 'api'
};

export function loadTransformersSettings(): TransformersSettings {
    const savedSettings = localStorage.getItem(TRANSFORMERS_STORAGE_KEY);
    if (!savedSettings) {
        return defaultSettings;
    }
    return JSON.parse(savedSettings);
}

export function loadTransformersUIState(): TransformersUIState {
    const savedState = localStorage.getItem(TRANSFORMERS_UI_STATE_KEY);
    if (!savedState) {
        return defaultUIState;
    }
    return JSON.parse(savedState);
}

export function saveTransformersUIState(state: Partial<TransformersUIState>) {
    const currentState = loadTransformersUIState();
    const newState = { ...currentState, ...state };
    localStorage.setItem(TRANSFORMERS_UI_STATE_KEY, JSON.stringify(newState));
}

// Save settings to localStorage
export const saveTransformersSettings = (settings: TransformersSettings): void => {
    localStorage.setItem(TRANSFORMERS_STORAGE_KEY, JSON.stringify(settings));
    // Dispatch event for other components
    window.dispatchEvent(new Event('transformersSettingsUpdated'));
};

// Add a new model
export const addTransformersModel = (model: Omit<TransformersModel, 'id' | 'timestamp'>): TransformersModel => {
    const settings = loadTransformersSettings();
    const newModel: TransformersModel = {
        ...model,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString()
    };
    
    settings.models.push(newModel);
    saveTransformersSettings(settings);
    return newModel;
};

// Delete a model
export const deleteTransformersModel = (id: string): void => {
    const settings = loadTransformersSettings();
    settings.models = settings.models.filter(model => model.id !== id);
    saveTransformersSettings(settings);
};

// Toggle enabled state
export const toggleTransformersEnabled = (enabled: boolean): void => {
    const settings = loadTransformersSettings();
    settings.enabled = enabled;
    saveTransformersSettings(settings);
};

// Toggle WebGPU usage
export const toggleWebGPU = (useWebGPU: boolean): void => {
    const settings = loadTransformersSettings();
    settings.useWebGPU = useWebGPU;
    saveTransformersSettings(settings);
};

// Get total storage used by models
export const getTransformersStorageUsage = (): number => {
    const settings = loadTransformersSettings();
    return settings.models.reduce((total, model) => total + model.size, 0);
}; 