// ============================================================
// FILE: components/common/ReportToolbar.js
// PURPOSE: Reusable Print PDF + Download Excel toolbar
//          used in all report pages.
// USAGE:
//   const printRef = useRef();
//   <ReportToolbar title="Sales Report" printRef={printRef} onExcel={handleExcel} />
//   <Box ref={printRef}> ... report content ... </Box>
// ============================================================

import React from 'react';
import { Box, Button, Divider } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import * as XLSX from 'xlsx';
import ShareWidget from './ShareWidget';

// ── PDF ──────────────────────────────────────────────────────
// Opens browser print dialog. The sidebar/topbar are hidden
// via @media print CSS in index.css.
function handlePrint(printRef) {
    const content = printRef?.current;
    if (!content) { window.print(); return; }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Report</title>
            <style>
                body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 20px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
                th { background: #e8eaf6; padding: 6px 10px; text-align: left; font-size: 11px; border: 1px solid #ccc; }
                td { padding: 5px 10px; border: 1px solid #ddd; font-size: 11px; }
                tr:nth-child(even) { background: #f9f9f9; }
                h5, h6 { color: #1a237e; margin: 12px 0 6px; }
                .MuiChip-root { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 10px; background: #e0e0e0; }
                svg, canvas { display: none !important; }
                .no-print { display: none !important; }
            </style>
        </head>
        <body>
            ${content.innerHTML}
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
}

// ── EXCEL ─────────────────────────────────────────────────────
// onExcel() must return an array of sheet objects:
// [ { sheetName: 'Sales Orders', rows: [ {col1, col2, ...}, ... ] }, ... ]
function handleExcel(title, onExcel) {
    const sheets = onExcel();
    if (!sheets || sheets.length === 0) return;

    const wb = XLSX.utils.book_new();
    sheets.forEach(({ sheetName, rows }) => {
        if (!rows || rows.length === 0) return;
        const ws = XLSX.utils.json_to_sheet(rows);
        // Auto column widths
        const cols = Object.keys(rows[0]).map(k => ({ wch: Math.max(k.length, 14) }));
        ws['!cols'] = cols;
        XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
    });

    const fileName = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
}

// ── COMPONENT ─────────────────────────────────────────────────
export default function ReportToolbar({ title, printRef, onExcel }) {
    const shareMessage = `${title}\nGenerated from MEI TEXZ ERP\nDate: ${new Date().toLocaleDateString('en-IN')}`;

    return (
        <Box
            className="no-print"
            sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}
        >
            <Button
                variant="outlined"
                size="small"
                startIcon={<PrintIcon />}
                onClick={() => handlePrint(printRef)}
                sx={{ borderColor: '#1a237e', color: '#1a237e', textTransform: 'none' }}
            >
                Print / PDF
            </Button>

            {onExcel && (
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={() => handleExcel(title, onExcel)}
                    sx={{ borderColor: '#2e7d32', color: '#2e7d32', textTransform: 'none' }}
                >
                    Download Excel
                </Button>
            )}

            <ShareWidget
                title={title}
                message={shareMessage}
                subject={`${title} — MEI TEXZ ERP`}
                onPrint={() => handlePrint(printRef)}
            />

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        </Box>
    );
}
