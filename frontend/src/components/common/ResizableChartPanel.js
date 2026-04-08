// ============================================================
// FILE: components/common/ResizableChartPanel.js
// PURPOSE: Chart panel with a drag handle at the bottom to
//          resize height. Height saved to localStorage by key.
// USAGE:
//   <ResizableChartPanel storageKey="dashboard_revenue" defaultHeight={320}
//       title="Monthly Revenue" subtitle="Last 6 months">
//       <YourChart />
//   </ResizableChartPanel>
// ============================================================

import { useState, useRef, useCallback } from 'react';
import { Paper, Typography, Box, Tooltip, IconButton } from '@mui/material';
import HeightIcon from '@mui/icons-material/Height';

export function ResizableChartPanel({
    storageKey,
    defaultHeight = 300,
    title,
    subtitle,
    children,
    extra,          // optional JSX placed top-right
}) {
    const [height, setHeight] = useState(() => {
        try {
            const saved = localStorage.getItem(`chart_h_${storageKey}`);
            if (saved) return parseInt(saved, 10);
        } catch {}
        return defaultHeight;
    });

    const dragging = useRef(null);

    const onMouseDown = useCallback((e) => {
        e.preventDefault();
        dragging.current = { startY: e.clientY, startH: height };

        const onMove = (ev) => {
            if (!dragging.current) return;
            const delta = ev.clientY - dragging.current.startY;
            const newH  = Math.max(120, dragging.current.startH + delta);
            setHeight(newH);
        };

        const onUp = () => {
            if (dragging.current) {
                setHeight(prev => {
                    localStorage.setItem(`chart_h_${storageKey}`, String(prev));
                    return prev;
                });
            }
            dragging.current = null;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup',   onUp);
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup',   onUp);
    }, [height, storageKey]);

    const resetHeight = () => {
        localStorage.removeItem(`chart_h_${storageKey}`);
        setHeight(defaultHeight);
    };

    return (
        <Paper sx={{ p: 2.5, borderRadius: 2, boxShadow: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                <Box>
                    <Typography variant="subtitle2" fontWeight="bold" color="primary.main" fontSize={14}>
                        {title}
                    </Typography>
                    {subtitle && (
                        <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
                    )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {extra}
                    <Tooltip title="Double-click to reset height" placement="left">
                        <span style={{ display: 'flex' }}>
                            <HeightIcon sx={{ fontSize: 14, color: 'text.disabled', mt: 0.3 }} />
                        </span>
                    </Tooltip>
                </Box>
            </Box>

            {/* Chart area */}
            <Box sx={{ height, flexShrink: 0, overflow: 'hidden' }}>
                {children}
            </Box>

            {/* Drag handle */}
            <Box
                onMouseDown={onMouseDown}
                onDoubleClick={resetHeight}
                sx={{
                    height: 8,
                    mt: 1,
                    borderRadius: 1,
                    cursor: 'ns-resize',
                    backgroundColor: 'divider',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.15s',
                    userSelect: 'none',
                    '&:hover': { backgroundColor: 'primary.main', opacity: 0.5 },
                    '&::before': {
                        content: '""',
                        width: 32, height: 3,
                        borderRadius: 2,
                        backgroundColor: 'text.disabled',
                    },
                }}
            />
        </Paper>
    );
}
