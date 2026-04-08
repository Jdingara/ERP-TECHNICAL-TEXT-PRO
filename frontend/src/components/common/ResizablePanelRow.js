// ============================================================
// FILE: components/common/ResizablePanelRow.js
// PURPOSE: Flex row of panels with vertical drag handles BETWEEN
//          them to resize widths left ↔ right.
//          Widths stored as percentages in localStorage.
//
// USAGE:
//   <ResizablePanelRow storageKey="dash_section2" defaultPercents={[67, 33]}>
//       <ResizableChartPanel ...>...</ResizableChartPanel>
//       <ResizableChartPanel ...>...</ResizableChartPanel>
//   </ResizablePanelRow>
// ============================================================

import { useState, useRef, useCallback, Children } from 'react';
import { Box } from '@mui/material';

export function ResizablePanelRow({ children, storageKey, defaultPercents, gap = 12 }) {
    const items = Children.toArray(children);

    const [percents, setPercents] = useState(() => {
        try {
            const s = localStorage.getItem(`panel_row_${storageKey}`);
            if (s) {
                const p = JSON.parse(s);
                if (Array.isArray(p) && p.length === items.length) return p;
            }
        } catch {}
        // fallback: equal distribution
        return defaultPercents || items.map(() => Math.floor(100 / items.length));
    });

    const rowRef  = useRef(null);
    const dragging = useRef(null);

    const onDividerMouseDown = useCallback((dividerIndex, e) => {
        e.preventDefault();
        const rowW = rowRef.current?.offsetWidth || 1000;
        dragging.current = {
            dividerIndex,
            startX: e.clientX,
            startPercents: [...percents],
            rowW,
        };

        const onMove = (ev) => {
            if (!dragging.current) return;
            const { dividerIndex: idx, startX, startPercents, rowW } = dragging.current;
            const deltaPercent = ((ev.clientX - startX) / rowW) * 100;

            setPercents(prev => {
                const next = [...startPercents];
                const left  = idx;
                const right = idx + 1;
                next[left]  = Math.max(8, startPercents[left]  + deltaPercent);
                next[right] = Math.max(8, startPercents[right] - deltaPercent);
                // keep total constant
                const total = next[left] + next[right];
                const orig  = startPercents[left] + startPercents[right];
                if (Math.abs(total - orig) > 0.1) {
                    next[right] = orig - next[left];
                }
                return next;
            });
        };

        const onUp = () => {
            setPercents(prev => {
                localStorage.setItem(`panel_row_${storageKey}`, JSON.stringify(prev));
                return prev;
            });
            dragging.current = null;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, [percents, storageKey]);

    const resetWidths = () => {
        localStorage.removeItem(`panel_row_${storageKey}`);
        setPercents(defaultPercents || items.map(() => Math.floor(100 / items.length)));
    };

    return (
        <Box ref={rowRef} sx={{ display: 'flex', alignItems: 'stretch', width: '100%', mb: 2 }}>
            {items.map((child, i) => (
                <Box key={i} sx={{ display: 'flex', flexDirection: 'column' }}
                    style={{ width: `${percents[i]}%`, flexShrink: 0, flexGrow: 0 }}>
                    {child}

                    {/* Vertical divider handle on the RIGHT of each panel (except last) */}
                    {i < items.length - 1 && (
                        <Box
                            onMouseDown={(e) => onDividerMouseDown(i, e)}
                            onDoubleClick={resetWidths}
                            title="Drag ↔ to resize width · Double-click to reset"
                            sx={{
                                position: 'absolute',
                                // rendered as sibling below, but we use a wrapper trick
                            }}
                        />
                    )}
                </Box>
            ))}

            {/* Invisible: rebuild with proper divider placement */}
        </Box>
    );
}

// Internal — renders properly with dividers between panels
export function ResizablePanelRowInner({ children, storageKey, defaultPercents }) {
    const items = Children.toArray(children);

    const [percents, setPercents] = useState(() => {
        try {
            const s = localStorage.getItem(`panel_row_${storageKey}`);
            if (s) {
                const p = JSON.parse(s);
                if (Array.isArray(p) && p.length === items.length) return p;
            }
        } catch {}
        return defaultPercents || items.map(() => parseFloat((100 / items.length).toFixed(2)));
    });

    const rowRef   = useRef(null);
    const dragging = useRef(null);

    const startDrag = useCallback((idx, e) => {
        e.preventDefault();
        const rowW = rowRef.current?.offsetWidth || 900;
        const snap = [...percents];

        const onMove = (ev) => {
            const dp = ((ev.clientX - e.clientX) / rowW) * 100;
            setPercents(() => {
                const next = [...snap];
                next[idx]     = Math.max(8, snap[idx]     + dp);
                next[idx + 1] = Math.max(8, snap[idx + 1] - dp);
                return next;
            });
        };
        const onUp = () => {
            setPercents(p => { localStorage.setItem(`panel_row_${storageKey}`, JSON.stringify(p)); return p; });
            dragging.current = null;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, [percents, storageKey]);

    const reset = () => {
        const d = defaultPercents || items.map(() => parseFloat((100 / items.length).toFixed(2)));
        localStorage.removeItem(`panel_row_${storageKey}`);
        setPercents(d);
    };

    return (
        <Box ref={rowRef} sx={{ display: 'flex', alignItems: 'stretch', width: '100%', mb: 2, gap: 0 }}>
            {items.map((child, i) => (
                <Box key={i} sx={{ display: 'flex', flexShrink: 0, flexGrow: 0, flexDirection: 'column' }}
                    style={{ width: `calc(${percents[i]}% - ${i < items.length - 1 ? 6 : 0}px)` }}>
                    {child}
                </Box>
            )).reduce((acc, panel, i) => {
                acc.push(panel);
                if (i < items.length - 1) {
                    acc.push(
                        <Box
                            key={`divider-${i}`}
                            onMouseDown={(e) => startDrag(i, e)}
                            onDoubleClick={reset}
                            title="Drag ↔ to resize · Double-click to reset"
                            sx={{
                                width: 8, flexShrink: 0, cursor: 'col-resize',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                userSelect: 'none', position: 'relative',
                                '&:hover .divider-line': { backgroundColor: 'primary.main', opacity: 0.6 },
                            }}>
                            <Box className="divider-line" sx={{
                                width: 3, height: '60%', borderRadius: 2,
                                backgroundColor: 'divider', transition: 'all 0.15s',
                            }} />
                        </Box>
                    );
                }
                return acc;
            }, [])}
        </Box>
    );
}
