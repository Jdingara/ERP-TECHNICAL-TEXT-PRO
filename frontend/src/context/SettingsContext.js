// ============================================================
// FILE: context/SettingsContext.js
// PURPOSE: Global UI settings — theme, font, sidebar position.
//          Saved to localStorage so they persist across sessions.
// ============================================================

import { createContext, useContext, useState, useCallback } from 'react';

const STORAGE_KEY = 'sasi_erp_settings';

const DEFAULTS = {
    themeMode:       'light',         // 'light' | 'dark'
    accentColor:     '#6366f1',       // any hex color
    fontFamily:      'Inter',         // 'Inter' | 'Roboto' | 'Poppins' | 'DM Sans'
    fontSize:        'medium',        // 'small' | 'medium' | 'large'
    sidebarSide:     'left',          // 'left' | 'right'
};

function loadSettings() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? { ...DEFAULTS, ...JSON.parse(saved) } : DEFAULTS;
    } catch {
        return DEFAULTS;
    }
}

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
    const [settings, setSettings] = useState(loadSettings);

    const updateSetting = useCallback((key, value) => {
        setSettings(prev => {
            const next = { ...prev, [key]: value };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    }, []);

    const resetSettings = useCallback(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULTS));
        setSettings(DEFAULTS);
    }, []);

    return (
        <SettingsContext.Provider value={{ settings, updateSetting, resetSettings }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    return useContext(SettingsContext);
}

export { DEFAULTS };
