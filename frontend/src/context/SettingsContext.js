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
    bgImage:         null,            // base64 string or null
};

// ── Color shade utilities ─────────────────────────────────────
function hexToRgb(hex) {
    const h = hex.replace('#', '');
    return {
        r: parseInt(h.substring(0, 2), 16),
        g: parseInt(h.substring(2, 4), 16),
        b: parseInt(h.substring(4, 6), 16),
    };
}

function toHex(r, g, b) {
    return '#' + [r, g, b]
        .map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0'))
        .join('');
}

function mixColor(hex, mixWith, ratio) {
    // ratio = how much of `hex` (0 = all mixWith, 1 = all hex)
    const c = hexToRgb(hex);
    const m = hexToRgb(mixWith);
    return toHex(
        c.r * ratio + m.r * (1 - ratio),
        c.g * ratio + m.g * (1 - ratio),
        c.b * ratio + m.b * (1 - ratio),
    );
}

// Returns sidebar shade variants derived from the chosen accent color.
// sidebarHeader — darkest (SASI ERP logo area)
// sidebarBg     — dark tinted (menu list area, slightly lighter)
// activeAlpha   — transparent bg for the active menu item
export function getShades(accent) {
    return {
        sidebarHeader: mixColor(accent, '#030508', 0.32),
        sidebarBg:     mixColor(accent, '#080c18', 0.16),
        activeAlpha:   accent + '28',
        accent,
    };
}

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
