// ============================================================
// FILE: components/common/ResizableTable.js
// PURPOSE: Wrap any MUI Table to make columns draggable-resizable.
//          Auto-detects column count. Widths saved to localStorage.
//
// USAGE:  just wrap your TableContainer:
//   <ResizableTable storageKey="items_list">
//       <TableContainer>
//           <Table>...</Table>
//       </TableContainer>
//   </ResizableTable>
//
// Drag the right edge of any column header to resize.
// Double-click the resize handle to reset that column.
// ============================================================

import { useRef, useEffect, useCallback, useState } from 'react';
import { Box } from '@mui/material';

export function ResizableTable({ children, storageKey }) {
    const containerRef = useRef(null);
    const [savedWidths, setSavedWidths] = useState(() => {
        try {
            const s = localStorage.getItem(`col_w_${storageKey}`);
            return s ? JSON.parse(s) : {};
        } catch { return {}; }
    });

    const saveWidths = useCallback((widthMap) => {
        localStorage.setItem(`col_w_${storageKey}`, JSON.stringify(widthMap));
        setSavedWidths(widthMap);
    }, [storageKey]);

    const startDrag = useCallback((th, colIndex, e) => {
        e.preventDefault();
        const startX = e.clientX;
        const startW = th.offsetWidth;

        const onMove = (ev) => {
            const newW = Math.max(50, startW + (ev.clientX - startX));
            th.style.width    = `${newW}px`;
            th.style.minWidth = `${newW}px`;

            // Sync body column widths
            if (containerRef.current) {
                const tds = containerRef.current.querySelectorAll(`tbody tr td:nth-child(${colIndex + 1})`);
                tds.forEach(td => { td.style.width = `${newW}px`; td.style.maxWidth = `${newW}px`; });
            }
        };

        const onUp = () => {
            // Collect all current th widths and save
            if (containerRef.current) {
                const ths = containerRef.current.querySelectorAll('thead th');
                const map = {};
                ths.forEach((t, i) => { map[i] = t.offsetWidth; });
                saveWidths(map);
            }
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup',   onUp);
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup',   onUp);
    }, [saveWidths]);

    // Inject resizers + restore saved widths after every render
    useEffect(() => {
        if (!containerRef.current) return;
        const ths = containerRef.current.querySelectorAll('thead th');

        ths.forEach((th, i) => {
            th.style.position = 'relative';
            th.style.overflow = 'hidden';
            th.style.userSelect = 'none';

            // Restore saved width
            if (savedWidths[i]) {
                th.style.width    = `${savedWidths[i]}px`;
                th.style.minWidth = `${savedWidths[i]}px`;
            }

            // Sync body column
            if (savedWidths[i] && containerRef.current) {
                const tds = containerRef.current.querySelectorAll(`tbody tr td:nth-child(${i + 1})`);
                tds.forEach(td => {
                    td.style.width    = `${savedWidths[i]}px`;
                    td.style.maxWidth = `${savedWidths[i]}px`;
                    td.style.overflow = 'hidden';
                    td.style.textOverflow = 'ellipsis';
                });
            }

            // Remove existing resizer
            const old = th.querySelector('.col-resizer');
            if (old) old.remove();

            // Add resizer div
            const r = document.createElement('div');
            r.className = 'col-resizer';
            Object.assign(r.style, {
                position:   'absolute', right: '0', top: '0', bottom: '0',
                width:      '6px', cursor: 'col-resize', zIndex: '20',
                background: 'transparent', transition: 'background 0.15s',
            });
            r.title = 'Drag to resize · Double-click to reset';
            r.addEventListener('mouseenter', () => r.style.background = 'rgba(255,255,255,0.45)');
            r.addEventListener('mouseleave', () => r.style.background = 'transparent');
            r.addEventListener('mousedown',  (e) => startDrag(th, i, e));
            r.addEventListener('dblclick',   () => {
                th.style.width = ''; th.style.minWidth = '';
                // Remove from saved
                const map = { ...savedWidths };
                delete map[i];
                saveWidths(map);
            });
            th.appendChild(r);
        });
    });

    return (
        <Box ref={containerRef} sx={{ overflowX: 'auto', width: '100%',
            '& table': { tableLayout: 'fixed' } }}>
            {children}
        </Box>
    );
}
