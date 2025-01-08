import React, { useState, useEffect } from 'react';
import { saveSettings, loadSettings, saveApps, loadApps, getLocalStorageSize } from '../utils/localStorage';
import { useTheme } from '../context/ThemeContext';
import { App } from '../types/app';
import { FiEdit2, FiTrash2, FiSave } from 'react-icons/fi';
import { BiPaintRoll } from 'react-icons/bi';
import { IoSettingsSharp, IoApps } from 'react-icons/io5';
import { AiOutlineAppstore } from 'react-icons/ai';
import ApplicationsSettings from './ApplicationsSettings';

interface SettingsProps {
    onClose: () => void;
}

interface EditingApp extends App {
    isEditing: boolean;
}

const Settings: React.FC<SettingsProps> = ({ onClose }) => {
    const [apps, setApps] = useState<EditingApp[]>(
        loadApps().map(app => ({ ...app, isEditing: false }))
    );
    const [appName, setAppName] = useState('');
    const [appURL, setAppURL] = useState('');
    const [userName, setUserName] = useState('');
    const { darkMode, toggleDarkMode } = useTheme();
    const [activeTab, setActiveTab] = useState('apps'); // ['apps', 'applications', 'appearance', 'system']

    useEffect(() => {
        const settings = loadSettings();
        setUserName(settings.userName || '');
    }, []);

    const handleAddApp = () => {
        if (!appName || !appURL) return;
        const newApp = {
            name: appName,
            url: appURL,
            isEditing: false
        };
        const updatedApps: EditingApp[] = [...apps, newApp];
        setApps(updatedApps);
        saveApps(updatedApps.map(({ isEditing: _, ...app }) => app));
        setAppName('');
        setAppURL('');
    };

    const handleSaveUserName = () => {
        const settings = loadSettings();
        saveSettings({ ...settings, userName });
    };

    const handleDeleteApp = (index: number) => {
        const updatedApps = apps.filter((_: App, i: number) => i !== index);
        setApps(updatedApps);
        saveApps(updatedApps);
    };

    const handleEditApp = (index: number) => {
        setApps(apps.map((app, i) => ({
            ...app,
            isEditing: i === index ? !app.isEditing : app.isEditing
        })));
    };

    const handleSaveApp = (index: number) => {
        const newApps = apps.map((app, i) => {
            if (i === index) {
                return {
                    ...app,
                    isEditing: false
                };
            }
            return app;
        });
        setApps(newApps);
        saveApps(newApps.map(({ isEditing: _, ...app }) => app));
    };

    const handleUpdateApp = (index: number, updatedApp: Partial<App>) => {
        const newApps = apps.map((app, i) => {
            if (i === index) {
                return {
                    ...app,
                    ...updatedApp
                };
            }
            return app;
        });
        setApps(newApps);
    };

    const TabButton: React.FC<{ name: string; icon: React.ReactNode; active: boolean; onClick: () => void }> = ({ name, icon, active, onClick }) => (
        <button
            onClick={onClick}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2
                ${active
                    ? 'bg-primary text-white shadow-md'
                    : 'text-secondary-dark dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
        >
            {icon}
            {name}
        </button>
    );

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="border-b border-gray-200 dark:border-slate-700 p-3 flex justify-between items-center">
                    <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">
                        iFrame OS Settings
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-3 border-b border-gray-200 dark:border-slate-700">
                    <div className="flex space-x-2">
                        <TabButton
                            name="Apps"
                            icon={<IoApps className="w-4 h-4" />}
                            active={activeTab === 'apps'}
                            onClick={() => setActiveTab('apps')}
                        />
                        <TabButton
                            name="Applications"
                            icon={<AiOutlineAppstore className="w-4 h-4" />}
                            active={activeTab === 'applications'}
                            onClick={() => setActiveTab('applications')}
                        />
                        <TabButton
                            name="Appearance"
                            icon={<BiPaintRoll className="w-4 h-4" />}
                            active={activeTab === 'appearance'}
                            onClick={() => setActiveTab('appearance')}
                        />
                        <TabButton
                            name="System"
                            icon={<IoSettingsSharp className="w-4 h-4" />}
                            active={activeTab === 'system'}
                            onClick={() => setActiveTab('system')}
                        />
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto p-4 space-y-4">
                    {activeTab === 'apps' && (
                        <div className="space-y-4">
                            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
                                <h3 className="text-base font-semibold mb-3">Add Web App</h3>
                                <div className="space-y-3">
                                    <input
                                        type="text"
                                        placeholder="App Name"
                                        value={appName}
                                        onChange={(e) => setAppName(e.target.value)}
                                        className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 
                                                 dark:bg-slate-700 focus:ring-2 focus:ring-primary focus:border-transparent"
                                    />
                                    <input
                                        type="url"
                                        placeholder="App URL (https://...)"
                                        value={appURL}
                                        onChange={(e) => setAppURL(e.target.value)}
                                        className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 
                                                 dark:bg-slate-700 focus:ring-2 focus:ring-primary focus:border-transparent"
                                    />
                                    <button
                                        onClick={handleAddApp}
                                        className="w-full px-3 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-lg 
                                                 transition-colors duration-200"
                                    >
                                        Add App
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
                                <h3 className="text-base font-semibold mb-3">Installed Apps</h3>
                                <div className="space-y-1">
                                    {apps.map((app, index) => (
                                        <div key={index}
                                            className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 
                                                     dark:hover:bg-slate-700 transition-colors"
                                        >
                                            {app.isEditing ? (
                                                <div className="flex-1 flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={app.name}
                                                        onChange={(e) => handleUpdateApp(index, { name: e.target.value })}
                                                        className="flex-1 px-2 py-1 rounded border dark:bg-slate-700"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={app.url}
                                                        onChange={(e) => handleUpdateApp(index, { url: e.target.value })}
                                                        className="flex-1 px-2 py-1 rounded border dark:bg-slate-700"
                                                    />
                                                    <button
                                                        onClick={() => handleSaveApp(index)}
                                                        className="p-1.5 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 
                                                                 rounded-lg transition-colors"
                                                    >
                                                        <FiSave className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div>
                                                        <h4 className="font-medium text-sm">{app.name}</h4>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">{app.url}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => handleEditApp(index)}
                                                            className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 
                                                                     rounded-lg transition-colors"
                                                        >
                                                            <FiEdit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteApp(index)}
                                                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 
                                                                     rounded-lg transition-colors"
                                                        >
                                                            <FiTrash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'applications' && (
                        <ApplicationsSettings />
                    )}

                    {activeTab === 'appearance' && (
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-4">Theme</h3>
                                <button
                                    onClick={toggleDarkMode}
                                    className="w-full flex items-center justify-between px-4 py-3 rounded-lg border 
                                             border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700"
                                >
                                    <span>Dark Mode</span>
                                    <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 
                                                  ${darkMode ? 'bg-primary' : 'bg-gray-200 dark:bg-slate-700'}`}>
                                        <div className={`w-4 h-4 rounded-full bg-white transform transition-transform duration-200 
                                                       ${darkMode ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'system' && (
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-4">Storage</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Local Storage Usage: {(getLocalStorageSize() / 1024).toFixed(2)} KB
                                </p>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold mb-4">User Profile</h3>
                                <input
                                    type="text"
                                    placeholder="Your Name"
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 
                                             dark:bg-slate-700 focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                                <button
                                    onClick={handleSaveUserName}
                                    className="mt-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg 
                                             transition-colors duration-200"
                                >
                                    Save Profile
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;
