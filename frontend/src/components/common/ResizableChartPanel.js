// ============================================================
// FILE: components/common/ResizableChartPanel.js
// PURPOSE: Chart panel with TWO resize handles:
//   • Bottom bar  → drag up/down to resize HEIGHT
//   • Right edge  → handled by parent ResizablePanelRow (width)
// Double-click either handle to reset to default.
// ============================================================

import { useState, useRef, useCallback } from 'react';
import { Paper, Typography, Box } from '@mui/material';

export function ResizableChartPanel({
    storageKey,
    defaultHeight = 300,
    title,
    subtitle,
    children,
    extra,
}) {
    const [height, setHeight] = useState(() => {
        try {
            const s = localStorage.getItem(`chart_h_${storageKey}`);
            if (s) return parseInt(s, 10);
        } catch {}
        return defaultHeight;
    });

    const dragging = useRef(null);

    const onHeightMouseDown = useCallback((e) => {
        e.preventDefault();
        dragging.current = { startY: e.clientY, startH: height };

        const onMove = (ev) => {
            if (!dragging.current) return;
            const newH = Math.max(100, dragging.current.startH + (ev.clientY - dragging.current.startY));
            setHeight(newH);
        };
        const onUp = () => {
            setHeight(prev => {
                localStorage.setItem(`chart_h_${storageKey}`, String(prev));
                return prev;
            });
            dragging.current = null;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, [height, storageKey]);

    const resetHeight = () => {
        localStorage.removeItem(`chart_h_${storageKey}`);
        setHeight(defaultHeight);
    };

    return (
        <Paper sx={{
            p: 2.5, borderRadius: 2, boxShadow: 2,
            height: '100%', display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
        }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1, flexShrink: 0 }}>
                <Box>
                    <Typography variant="subtitle2" fontWeight="bold" color="primary.main" fontSize={14}>
                        {title}
                    </Typography>
                    {subtitle && (
                        <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
                    )}
                </Box>
                {extra}
            </Box>

            {/* Chart area */}
            <Box sx={{ height, flexShrink: 0, overflow: 'hidden', transition: 'height 0.05s' }}>
                {children}
            </Box>

            {/* ── Bottom handle: drag up/down for HEIGHT ── */}
            <Box
                onMouseDown={onHeightMouseDown}
                onDoubleClick={resetHeight}
                title="Drag ↕ to resize height · Double-click to reset"
                sx={{
                    mt: 1, height: 10, flexShrink: 0,
                    borderRadius: 1, cursor: 'ns-resize',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: 'divider',
                    userSelect: 'none',
                    transition: 'background 0.15s',
                    '&:hover': { backgroundColor: 'primary.main', opacity: 0.45 },
                    '&::before': {
                        content: '""', width: 36, height: 3,
                        borderRadius: 2, backgroundColor: 'text.disabled',
                    },
                }}
            />
        </Paper>
    );
}
