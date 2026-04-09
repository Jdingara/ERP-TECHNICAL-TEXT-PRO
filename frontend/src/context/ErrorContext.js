// ============================================================
// FILE: src/context/ErrorContext.js
// PURPOSE: Global error context — intercepts ALL fetch() calls
//          across the entire app automatically, maps errors to
//          friendly categorised messages, and exposes showError /
//          showSuccess for manual use.
// ============================================================

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { detectErrorKey, ERROR_MESSAGES, ERROR_CATEGORIES } from '../utils/errorMessages';

const ErrorContext = createContext(null);

export function useError() {
    return useContext(ErrorContext);
}

export function ErrorProvider({ children }) {
    const [notification, setNotification] = useState(null); // { key, rawMessage, type:'error'|'success' }
    const originalFetch = useRef(null);

    // ── Show error by key ─────────────────────────────────────
    const showError = useCallback((key, rawMessage = '') => {
        setNotification({ key, rawMessage, type: 'error' });
    }, []);

    // ── Show success ──────────────────────────────────────────
    const showSuccess = useCallback((message) => {
        setNotification({ rawMessage: message, type: 'success' });
    }, []);

    // ── Dismiss ───────────────────────────────────────────────
    const dismiss = useCallback(() => setNotification(null), []);

    // ── Patch window.fetch globally ───────────────────────────
    // This intercepts EVERY fetch call across the whole app.
    // No changes needed in existing pages.
    useEffect(() => {
        originalFetch.current = window.fetch.bind(window);

        window.fetch = async (...args) => {
            // Skip non-API calls (e.g. CDN assets)
            const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
            const isApiCall = url.startsWith('/api/') || url.includes('/api/');

            try {
                const response = await originalFetch.current(...args);

                if (isApiCall && !response.ok) {
                    // Clone so the real handler can still read the body
                    const cloned = response.clone();
                    try {
                        const data = await cloned.json();
                        const serverMsg = data.message || data.error || data.detail || '';
                        const key = detectErrorKey(response.status, serverMsg);
                        if (key) {
                            showError(key, serverMsg);
                        } else if (serverMsg) {
                            // Unknown error — show raw backend message with generic category
                            showError('__raw__', serverMsg);
                        } else {
                            showError(response.status >= 500 ? 'server_error' : 'required_field_missing', '');
                        }
                    } catch {
                        const key = detectErrorKey(response.status, '');
                        showError(key || 'server_error', '');
                    }
                }

                return response;
            } catch (networkErr) {
                if (isApiCall) showError('network_error', '');
                throw networkErr;
            }
        };

        return () => {
            if (originalFetch.current) window.fetch = originalFetch.current;
        };
    }, [showError]);

    return (
        <ErrorContext.Provider value={{ showError, showSuccess, dismiss, notification }}>
            {children}
        </ErrorContext.Provider>
    );
}

// ── Hook: expose categories for use in the alert component ───
export { ERROR_MESSAGES, ERROR_CATEGORIES };
