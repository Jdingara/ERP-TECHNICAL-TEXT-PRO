import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SettingsProvider, useSettings } from './context/SettingsContext';

const FONT_SIZES        = { small: 13,   medium: 14.5, large: 16   };
const HTML_FONT_SIZES   = { small: '13px', medium: '15px', large: '17px' };

// Border radius scale per setting
const BR_SCALE = { sharp: 2, medium: 8, round: 16 };

// Table cell padding per density
const CELL_PAD = {
    compact:     '5px 10px',
    normal:      '10px 16px',
    comfortable: '14px 20px',
};

function ThemedApp() {
    const { settings } = useSettings();

    // Apply font size to <html> so all rem-based values scale with it
    document.documentElement.style.fontSize = HTML_FONT_SIZES[settings.fontSize] || '15px';

    const br       = BR_SCALE[settings.borderRadius] ?? 8;
    const cellPad  = CELL_PAD[settings.density]      ?? '10px 16px';

    const theme = createTheme({
        palette: {
            mode:    settings.themeMode,
            primary: { main: settings.accentColor },
            background: {
                default: settings.themeMode === 'dark' ? '#0f172a' : '#f8fafc',
                paper:   settings.themeMode === 'dark' ? '#1e293b' : '#ffffff',
            },
        },
        typography: {
            fontFamily:  `'${settings.fontFamily}', 'Segoe UI', -apple-system, sans-serif`,
            fontSize:    FONT_SIZES[settings.fontSize] || 14.5,
            h4:  { fontWeight: 700 },
            h5:  { fontWeight: 700 },
            h6:  { fontWeight: 600 },
            subtitle1: { fontWeight: 600 },
        },
        shape: { borderRadius: br },
        components: {
            MuiPaper: {
                styleOverrides: {
                    root: { backgroundImage: 'none', borderRadius: br },
                },
            },
            MuiButton: {
                styleOverrides: {
                    root: { textTransform: 'none', fontWeight: 600, borderRadius: Math.max(br, 4) },
                    contained: {
                        boxShadow: 'none',
                        '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.15)' },
                    },
                },
            },
            MuiChip: {
                styleOverrides: { root: { fontWeight: 600, fontSize: 12 } },
            },
            MuiTableHead: {
                styleOverrides: {
                    root: {
                        '& .MuiTableCell-head': {
                            fontWeight: 600, fontSize: 13,
                            borderBottom: '2px solid',
                            borderColor: settings.themeMode === 'dark' ? '#334155' : '#e2e8f0',
                            backgroundColor: settings.themeMode === 'dark' ? '#1e293b' : '#f8fafc',
                        },
                    },
                },
            },
            MuiTableCell: {
                styleOverrides: {
                    root: { fontSize: 13.5, padding: cellPad },
                },
            },
            MuiTableRow: {
                styleOverrides: {
                    root: { '&:last-child td': { borderBottom: 0 } },
                },
            },
            MuiTextField: {
                defaultProps: { size: 'small' },
                styleOverrides: {
                    root: { '& .MuiOutlinedInput-root': { borderRadius: br } },
                },
            },
            MuiDialog: {
                styleOverrides: { paper: { borderRadius: Math.min(br * 2, 24) } },
            },
            MuiAlert: {
                styleOverrides: { root: { borderRadius: br } },
            },
            MuiCard: {
                styleOverrides: { root: { borderRadius: br } },
            },
        },
    });

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <App />
        </ThemeProvider>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <React.StrictMode>
        <SettingsProvider>
            <ThemedApp />
        </SettingsProvider>
    </React.StrictMode>
);

reportWebVitals();
