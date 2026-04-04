import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SettingsProvider, useSettings } from './context/SettingsContext';

const FONT_SIZES = { small: 13, medium: 14.5, large: 16 };

function ThemedApp() {
    const { settings } = useSettings();

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
        shape: { borderRadius: 10 },
        components: {
            MuiPaper: {
                styleOverrides: {
                    root: { backgroundImage: 'none' },
                },
            },
            MuiButton: {
                styleOverrides: {
                    root: { textTransform: 'none', fontWeight: 600, borderRadius: 8 },
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
                    root: { fontSize: 13.5, padding: '10px 16px' },
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
                    root: { '& .MuiOutlinedInput-root': { borderRadius: 8 } },
                },
            },
            MuiDialog: {
                styleOverrides: { paper: { borderRadius: 16 } },
            },
            MuiAlert: {
                styleOverrides: { root: { borderRadius: 10 } },
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
