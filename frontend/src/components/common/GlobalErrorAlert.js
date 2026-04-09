// ============================================================
// FILE: src/components/common/GlobalErrorAlert.js
// PURPOSE: The on-screen notification that appears when an
//          error is detected. Shows category badge, title,
//          message, and what the user should do next.
// ============================================================

import { useEffect } from 'react';
import { useError, ERROR_MESSAGES, ERROR_CATEGORIES } from '../../context/ErrorContext';

const AUTO_DISMISS_MS = 8000; // 8 seconds

export default function GlobalErrorAlert() {
    const { notification, dismiss } = useError();

    // Auto-dismiss
    useEffect(() => {
        if (!notification) return;
        const t = setTimeout(dismiss, AUTO_DISMISS_MS);
        return () => clearTimeout(t);
    }, [notification, dismiss]);

    if (!notification) return null;

    // ── Success toast ─────────────────────────────────────────
    if (notification.type === 'success') {
        return (
            <div style={styles.wrapper}>
                <div style={{ ...styles.card, borderLeft: '5px solid #22c55e' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 20 }}>✅</span>
                        <span style={{ color: '#166534', fontWeight: 600, fontSize: 14 }}>
                            {notification.rawMessage}
                        </span>
                        <button style={styles.closeBtn} onClick={dismiss}>✕</button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Error alert ───────────────────────────────────────────
    const isRaw   = notification.key === '__raw__';
    const entry   = isRaw ? null : ERROR_MESSAGES[notification.key];
    const cat     = entry ? ERROR_CATEGORIES[entry.cat] : null;

    // Fallback for truly unknown errors
    const title   = entry?.title   || 'Something Went Wrong';
    const message = entry?.message || notification.rawMessage || 'An unexpected error occurred.';
    const action  = entry?.action  || 'Please try again or contact support.';
    const catLabel = cat?.label    || 'Error';
    const catColor = cat?.color    || '#ef4444';
    const catBg    = cat?.bg       || '#fee2e2';
    const catWho   = cat?.who      || '';

    return (
        <div style={styles.wrapper}>
            <div style={{ ...styles.card, borderLeft: `5px solid ${catColor}` }}>

                {/* ── Top row: category badge + close ── */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{
                        backgroundColor: catBg,
                        color: catColor,
                        fontWeight: 700,
                        fontSize: 11,
                        letterSpacing: 0.8,
                        padding: '3px 10px',
                        borderRadius: 20,
                        textTransform: 'uppercase',
                    }}>
                        {catLabel}
                    </span>
                    <button style={styles.closeBtn} onClick={dismiss} title="Dismiss">✕</button>
                </div>

                {/* ── Title ── */}
                <div style={{ fontWeight: 700, fontSize: 14.5, color: '#1e293b', marginBottom: 5 }}>
                    {title}
                </div>

                {/* ── Message ── */}
                <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.5, marginBottom: 6 }}>
                    {message}
                </div>

                {/* ── What to do ── */}
                <div style={{
                    fontSize: 12.5,
                    color: catColor,
                    fontWeight: 600,
                    padding: '5px 10px',
                    backgroundColor: catBg,
                    borderRadius: 6,
                    marginBottom: cat ? 4 : 0,
                }}>
                    👉 {action}
                </div>

                {/* ── Who resolves ── */}
                {catWho && (
                    <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 4 }}>
                        {catWho}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Styles ────────────────────────────────────────────────────
const styles = {
    wrapper: {
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        maxWidth: 420,
        width: 'calc(100vw - 48px)',
        animation: 'slideUp 0.25s ease',
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 10,
        padding: '14px 16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: '#94a3b8',
        fontSize: 14,
        fontWeight: 700,
        padding: '0 2px',
        lineHeight: 1,
    },
};

// Inject animation once
if (typeof document !== 'undefined' && !document.getElementById('gea-anim')) {
    const s = document.createElement('style');
    s.id = 'gea-anim';
    s.textContent = `@keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }`;
    document.head.appendChild(s);
}
