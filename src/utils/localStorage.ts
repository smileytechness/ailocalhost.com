// src/utils/localStorage.ts

import { App } from '../types/app';

// Update the types
interface Settings {
    userName?: string;
    darkMode: boolean;
}

// Save settings to local storage
export const saveSettings = (settings: Settings) => {
    localStorage.setItem('userSettings', JSON.stringify(settings));
};

// Load settings from local storage
export const loadSettings = (): Settings => {
    const settings = localStorage.getItem('userSettings');
    return settings ? JSON.parse(settings) : { darkMode: false };
};

// Save apps to local storage
export const saveApps = (apps: App[]) => {
    localStorage.setItem('userApps', JSON.stringify(apps));
};

// Load apps from local storage
export const loadApps = (): App[] => {
    const apps = localStorage.getItem('userApps');
    if (apps) {
        return JSON.parse(apps);
    } else {
        // Add default apps
        const defaultApps: App[] = [
            { name: 'Snapdrop', url: 'https://snapdrop.net' }
        ];
        saveApps(defaultApps);
        return defaultApps;
    }
};

// Get the size of local storage in bytes
export const getLocalStorageSize = () => {
    let total = 0;
    for (const key of Object.keys(localStorage)) {
        if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
            total += (localStorage[key].length + key.length) * 2;
        }
    }
    return total;
};
