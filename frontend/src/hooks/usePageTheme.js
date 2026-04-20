// ============================================================
// FILE: hooks/usePageTheme.js
// PURPOSE: Returns theme-aware inline style objects for page content.
//          Light mode → white/slate palette. Dark mode → navy palette.
//          Import and call `const pt = usePageTheme()` at the top of
//          any page component, then use pt.cell, pt.th, pt.inp, etc.
// ============================================================

import { useSettings } from '../context/SettingsContext';

export function usePageTheme() {
    const { settings } = useSettings();
    const dark = settings.themeMode === 'dark';

    const colors = dark ? {
        outer:   '#0b1120',
        card:    '#1e293b',
        inner:   '#0f172a',
        border:  '#334155',
        text:    '#f1f5f9',
        muted:   '#94a3b8',
        dimText: '#64748b',
        rowHover:'#1e293b',
        success: '#14532d',
        error:   '#7f1d1d',
    } : {
        outer:   '#f1f5f9',
        card:    '#ffffff',
        inner:   '#f8fafc',
        border:  '#e2e8f0',
        text:    '#1e293b',
        muted:   '#475569',
        dimText: '#94a3b8',
        rowHover:'#f8fafc',
        success: '#dcfce7',
        error:   '#fee2e2',
    };

    const cell = {
        padding: '10px 14px',
        borderBottom: `1px solid ${colors.border}`,
        fontSize: 13,
        color: colors.text,
    };

    const th = {
        ...cell,
        backgroundColor: colors.inner,
        color: colors.muted,
        fontWeight: 600,
        textTransform: 'uppercase',
        fontSize: 11,
    };

    const inp = {
        padding: '8px 10px',
        borderRadius: 6,
        border: `1px solid ${colors.border}`,
        backgroundColor: colors.inner,
        color: colors.text,
        fontSize: 13,
        width: '100%',
        boxSizing: 'border-box',
    };

    const formPage = {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 28,
    };

    const formHeader = {
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        marginBottom: 24,
        paddingBottom: 16,
        borderBottom: `1px solid ${colors.border}`,
    };

    const backBtn = {
        padding: '7px 16px',
        background: colors.inner,
        color: colors.muted,
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 600,
    };

    const tableCard = {
        backgroundColor: colors.card,
        borderRadius: 12,
        overflow: 'hidden',
    };

    const outer = {
        padding: '24px 28px',
        fontFamily: 'Inter, sans-serif',
        color: colors.text,
        minHeight: '100vh',
        backgroundColor: colors.outer,
    };

    const label = {
        display: 'block',
        fontSize: 12,
        fontWeight: 600,
        color: colors.muted,
        marginBottom: 4,
    };

    const msgSuccess = {
        padding: '10px 16px',
        borderRadius: 8,
        backgroundColor: dark ? '#14532d' : '#dcfce7',
        color: dark ? '#fff' : '#166534',
        marginBottom: 16,
        fontSize: 13,
    };

    const msgError = {
        padding: '10px 16px',
        borderRadius: 8,
        backgroundColor: dark ? '#7f1d1d' : '#fee2e2',
        color: dark ? '#fff' : '#991b1b',
        marginBottom: 16,
        fontSize: 13,
    };

    return { dark, colors, cell, th, inp, formPage, formHeader, backBtn, tableCard, outer, label, msgSuccess, msgError };
}
