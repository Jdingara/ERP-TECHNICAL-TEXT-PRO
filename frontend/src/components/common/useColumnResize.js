// ============================================================
// FILE: components/common/useColumnResize.js
// PURPOSE: Clean React hook for resizable table columns.
//          Returns widths array + Resizer component to place
//          inside each <th>.
//
// USAGE:
//   const { widths, Resizer } = useColumnResize('items_list', [120,200,100,120,100,120,100,80]);
//
//   <TableCell style={{ width: widths[0], position:'relative', userSelect:'none' }}>
//       Item Code <Resizer index={0} />
//   </TableCell>
// ============================================================

import { useState, useRef, useCallback } from 'react';

export function useColumnResize(storageKey, defaultWidths) {
    const [widths, setWidths] = useState(() => {
        try {
            const saved = localStorage.getItem(`col_w_${storageKey}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length === defaultWidths.length)
                    return parsed;
            }
        } catch {}
        return defaultWidths;
    });

    const dragging = useRef(null);

    const startDrag = useCallback((index, e) => {
        e.preventDefault();
        e.stopPropagation();
        dragging.current = { index, startX: e.clientX, startW: widths[index] };

        const onMove = (ev) => {
            if (!dragging.current) return;
            const newW = Math.max(40, dragging.current.startW + (ev.clientX - dragging.current.startX));
            setWidths(prev => {
                const next = [...prev];
                next[dragging.current.index] = newW;
                return next;
            });
        };

        const onUp = () => {
            setWidths(prev => {
                localStorage.setItem(`col_w_${storageKey}`, JSON.stringify(prev));
                return prev;
            });
            dragging.current = null;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, [widths, storageKey]);

    // Resizer: place DIRECTLY inside a TableCell that has sx={{ position:'relative' }}
    // Uses top:0/bottom:0 so it spans the full cell height without needing height:'100%'
    function Resizer({ index }) {
        const [hovered, setHovered] = useState(false);
        return (
            <div
                onMouseDown={(e) => startDrag(index, e)}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                title="Drag ↔ to resize this column"
                style={{
                    position: 'absolute',
                    right: 0, top: 0, bottom: 0,
                    width: 8,
                    cursor: 'col-resize',
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    userSelect: 'none',
                }}
            >
                <div style={{
                    width: 2,
                    height: '60%',
                    backgroundColor: hovered ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.25)',
                    borderRadius: 2,
                    transition: 'background 0.15s',
                    pointerEvents: 'none',
                }} />
            </div>
        );
    }

    const resetWidths = () => {
        localStorage.removeItem(`col_w_${storageKey}`);
        setWidths(defaultWidths);
    };

    return { widths, Resizer, resetWidths };
}
