// ============================================================
// FILE: components/common/useColumnResize.js
// PURPOSE: Hook + ColResizer for draggable table column widths.
//          Widths are saved to localStorage per storageKey.
// USAGE:
//   const { widths, ColResizer } = useColumnResize('items_list', [180, 120, 200, 100]);
//   <TableCell style={{ width: widths[0], position:'relative' }}>
//       Name <ColResizer index={0} />
//   </TableCell>
// ============================================================

import { useState, useCallback, useRef } from 'react';

export function useColumnResize(storageKey, defaultWidths) {
    const [widths, setWidths] = useState(() => {
        try {
            const saved = localStorage.getItem(`col_widths_${storageKey}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length === defaultWidths.length) return parsed;
            }
        } catch {}
        return defaultWidths;
    });

    const dragging = useRef(null); // { index, startX, startW }

    const onMouseDown = useCallback((index, e) => {
        e.preventDefault();
        dragging.current = { index, startX: e.clientX, startW: widths[index] };

        const onMove = (ev) => {
            if (!dragging.current) return;
            const delta = ev.clientX - dragging.current.startX;
            const newW  = Math.max(60, dragging.current.startW + delta);
            setWidths(prev => {
                const next = [...prev];
                next[dragging.current.index] = newW;
                return next;
            });
        };

        const onUp = () => {
            if (dragging.current) {
                // Save final widths to localStorage
                setWidths(prev => {
                    localStorage.setItem(`col_widths_${storageKey}`, JSON.stringify(prev));
                    return prev;
                });
            }
            dragging.current = null;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup',   onUp);
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup',   onUp);
    }, [widths, storageKey]);

    const ColResizer = useCallback(({ index }) => (
        <div
            onMouseDown={(e) => onMouseDown(index, e)}
            style={{
                position:    'absolute',
                right:       0,
                top:         0,
                bottom:      0,
                width:       6,
                cursor:      'col-resize',
                userSelect:  'none',
                zIndex:      10,
                borderRight: '2px solid transparent',
                transition:  'border-color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderRightColor = '#6366f1'}
            onMouseLeave={e => e.currentTarget.style.borderRightColor = 'transparent'}
        />
    ), [onMouseDown]);

    const resetWidths = useCallback(() => {
        localStorage.removeItem(`col_widths_${storageKey}`);
        setWidths(defaultWidths);
    }, [storageKey, defaultWidths]);

    return { widths, ColResizer, resetWidths };
}
