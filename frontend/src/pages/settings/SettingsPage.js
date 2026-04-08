// ============================================================
// FILE: pages/settings/SettingsPage.js
// PURPOSE: UI settings — theme, accent color, font, sidebar.
//          All settings saved to localStorage instantly.
// ============================================================

import { Box, Typography, Paper, Grid, ToggleButton,
    ToggleButtonGroup, Divider, Button, Tooltip, Chip, Alert } from '@mui/material';
import { useSettings } from '../../context/SettingsContext';
import { useState } from 'react';
import LightModeIcon   from '@mui/icons-material/LightMode';
import DarkModeIcon    from '@mui/icons-material/DarkMode';
import CheckIcon       from '@mui/icons-material/Check';
import WallpaperIcon   from '@mui/icons-material/Wallpaper';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

const ACCENT_COLORS = [
    { label: 'Indigo',   value: '#6366f1' },
    { label: 'Violet',   value: '#8b5cf6' },
    { label: 'Blue',     value: '#3b82f6' },
    { label: 'Teal',     value: '#14b8a6' },
    { label: 'Green',    value: '#10b981' },
    { label: 'Orange',   value: '#f97316' },
    { label: 'Rose',     value: '#f43f5e' },
    { label: 'Slate',    value: '#475569' },
];

const FONT_OPTIONS = [
    { label: 'Inter',    value: 'Inter',    preview: 'The quick brown fox' },
    { label: 'Roboto',   value: 'Roboto',   preview: 'The quick brown fox' },
    { label: 'Poppins',  value: 'Poppins',  preview: 'The quick brown fox' },
    { label: 'DM Sans',  value: 'DM Sans',  preview: 'The quick brown fox' },
];

function Section({ title, subtitle, children }) {
    return (
        <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} color="text.primary" mb={0.5}>
                {title}
            </Typography>
            {subtitle && (
                <Typography variant="body2" color="text.secondary" mb={2}>{subtitle}</Typography>
            )}
            {children}
        </Paper>
    );
}

// Modules for per-module layout reset
const LAYOUT_MODULES = [
    { label: 'Dashboard',         prefixes: ['panel_row_dash', 'chart_h_dash'] },
    { label: 'Master Data',       prefixes: ['col_w_items_list', 'col_w_customer', 'col_w_vendor', 'col_w_warehouse', 'col_w_unit', 'col_w_categor'] },
    { label: 'Inventory',         prefixes: ['col_w_stock', 'col_w_inventory', 'col_w_movement', 'col_w_adjustment'] },
    { label: 'Purchasing',        prefixes: ['col_w_purchase', 'col_w_po_', 'col_w_supplier'] },
    { label: 'Sales',             prefixes: ['col_w_sales', 'col_w_so_', 'col_w_invoice', 'col_w_customer_order'] },
    { label: 'Production',        prefixes: ['col_w_production', 'col_w_job', 'col_w_bom', 'col_w_work'] },
    { label: 'HR & Payroll',      prefixes: ['col_w_employee', 'col_w_payroll', 'col_w_attendance', 'col_w_hr'] },
    { label: 'Finance',           prefixes: ['col_w_finance', 'col_w_journal', 'col_w_ledger', 'col_w_payment'] },
    { label: 'Technical Textile', prefixes: ['col_w_technical', 'col_w_yarn', 'col_w_fabric', 'col_w_loom'] },
    { label: 'Medical Textile',   prefixes: ['col_w_medical', 'col_w_surgical', 'col_w_bandage'] },
    { label: 'Reports',           prefixes: ['panel_row_report', 'chart_h_report', 'col_w_report',
                                              'inventoryreport', 'salesreport', 'purchasereport', 'financereport', 'productionreport'] },
];

function clearLayoutKeys(prefixes) {
    const keys = Object.keys(localStorage);
    const layoutPrefixes = prefixes || ['col_w_', 'chart_h_', 'panel_row_'];
    keys.forEach(k => {
        if (layoutPrefixes.some(p => k.startsWith(p))) {
            localStorage.removeItem(k);
        }
    });
}

function SettingsPage() {
    const { settings, updateSetting, resetSettings } = useSettings();
    const [layoutResetMsg, setLayoutResetMsg] = useState('');

    const showResetMsg = (label) => {
        setLayoutResetMsg(`${label} layout reset. Refresh or navigate away and back to see the default sizes.`);
        setTimeout(() => setLayoutResetMsg(''), 5000);
    };

    const handleResetAll = () => {
        clearLayoutKeys();
        showResetMsg('All layout');
    };

    const handleResetModule = (mod) => {
        clearLayoutKeys(mod.prefixes);
        showResetMsg(mod.label);
    };

    const handleBgUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => updateSetting('bgImage', ev.target.result);
        reader.readAsDataURL(file);
        e.target.value = ''; // reset so same file can be re-selected
    };

    return (
        <Box maxWidth={720}>
            <Typography variant="h5" fontWeight={700} mb={0.5}>Settings</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Customize the look and feel of your ERP. Changes apply instantly.
            </Typography>

            {/* ── Theme ── */}
            <Section title="Theme" subtitle="Choose between light and dark mode.">
                <ToggleButtonGroup
                    value={settings.themeMode}
                    exclusive
                    onChange={(_, v) => v && updateSetting('themeMode', v)}
                    size="small">
                    <ToggleButton value="light" sx={{ px: 3, gap: 1 }}>
                        <LightModeIcon fontSize="small" /> Light
                    </ToggleButton>
                    <ToggleButton value="dark" sx={{ px: 3, gap: 1 }}>
                        <DarkModeIcon fontSize="small" /> Dark
                    </ToggleButton>
                </ToggleButtonGroup>
            </Section>

            {/* ── Accent Color ── */}
            <Section title="Accent Color" subtitle="Sets the primary color used for buttons, highlights, and active states.">
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                    {ACCENT_COLORS.map(c => (
                        <Tooltip key={c.value} title={c.label}>
                            <Box
                                onClick={() => updateSetting('accentColor', c.value)}
                                sx={{
                                    width: 36, height: 36,
                                    borderRadius: 1.5,
                                    backgroundColor: c.value,
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: settings.accentColor === c.value
                                        ? '3px solid white'
                                        : '3px solid transparent',
                                    boxShadow: settings.accentColor === c.value
                                        ? `0 0 0 2px ${c.value}`
                                        : 'none',
                                    transition: 'all 0.15s',
                                    '&:hover': { transform: 'scale(1.1)' },
                                }}>
                                {settings.accentColor === c.value && (
                                    <CheckIcon sx={{ color: 'white', fontSize: 18 }} />
                                )}
                            </Box>
                        </Tooltip>
                    ))}
                </Box>
            </Section>

            {/* ── Background Image ── */}
            <Section title="Background Image" subtitle="Sets a background picture on the main content area. Leave empty to use theme color only.">
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>

                    {/* Preview thumbnail */}
                    {settings.bgImage ? (
                        <Box sx={{
                            width: 120, height: 80, borderRadius: 2, overflow: 'hidden',
                            border: `2px solid ${settings.accentColor}`,
                            flexShrink: 0,
                        }}>
                            <img src={settings.bgImage} alt="bg preview"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </Box>
                    ) : (
                        <Box sx={{
                            width: 120, height: 80, borderRadius: 2,
                            border: '2px dashed', borderColor: 'divider',
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            color: 'text.disabled', flexShrink: 0,
                        }}>
                            <WallpaperIcon sx={{ fontSize: 28 }} />
                            <Typography variant="caption">No image</Typography>
                        </Box>
                    )}

                    {/* Buttons */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Button
                            variant="outlined" size="small"
                            startIcon={<WallpaperIcon />}
                            onClick={() => document.getElementById('bg-upload-input').click()}
                            sx={{ textTransform: 'none', borderColor: settings.accentColor, color: settings.accentColor }}
                        >
                            {settings.bgImage ? 'Change Image' : 'Upload Image'}
                        </Button>
                        <input
                            id="bg-upload-input"
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handleBgUpload}
                        />
                        {settings.bgImage && (
                            <Button
                                variant="outlined" size="small" color="error"
                                startIcon={<DeleteOutlineIcon />}
                                onClick={() => updateSetting('bgImage', null)}
                                sx={{ textTransform: 'none' }}
                            >
                                Remove Image
                            </Button>
                        )}
                        <Typography variant="caption" color="text.secondary">
                            JPG, PNG, WEBP supported
                        </Typography>
                    </Box>
                </Box>
            </Section>

            {/* ── Font Family ── */}
            <Section title="Font Family" subtitle="Choose the text font used across the application.">
                <Grid container spacing={1.5}>
                    {FONT_OPTIONS.map(f => (
                        <Grid item xs={6} sm={3} key={f.value}>
                            <Box
                                onClick={() => updateSetting('fontFamily', f.value)}
                                sx={{
                                    p: 2, borderRadius: 2, cursor: 'pointer',
                                    border: settings.fontFamily === f.value
                                        ? `2px solid ${settings.accentColor}`
                                        : '2px solid transparent',
                                    backgroundColor: settings.fontFamily === f.value
                                        ? settings.accentColor + '10'
                                        : 'action.hover',
                                    textAlign: 'center',
                                    transition: 'all 0.15s',
                                    '&:hover': { backgroundColor: settings.accentColor + '15' },
                                }}>
                                <Typography
                                    fontFamily={f.value}
                                    fontWeight={600}
                                    fontSize={13}
                                    color={settings.fontFamily === f.value ? settings.accentColor : 'text.primary'}>
                                    {f.label}
                                </Typography>
                                <Typography fontFamily={f.value} fontSize={11} color="text.secondary" mt={0.3}>
                                    {f.preview}
                                </Typography>
                            </Box>
                        </Grid>
                    ))}
                </Grid>
            </Section>

            {/* ── Font Size ── */}
            <Section title="Font Size" subtitle="Adjust the overall text size.">
                <ToggleButtonGroup
                    value={settings.fontSize}
                    exclusive
                    onChange={(_, v) => v && updateSetting('fontSize', v)}
                    size="small">
                    <ToggleButton value="small"  sx={{ px: 3 }}>Small</ToggleButton>
                    <ToggleButton value="medium" sx={{ px: 3 }}>Medium</ToggleButton>
                    <ToggleButton value="large"  sx={{ px: 3 }}>Large</ToggleButton>
                </ToggleButtonGroup>
            </Section>

            {/* ── Sidebar Position ── */}
            <Section title="Sidebar Position" subtitle="Move the navigation sidebar to any side of the screen.">
                <ToggleButtonGroup
                    value={settings.sidebarSide}
                    exclusive
                    onChange={(_, v) => v && updateSetting('sidebarSide', v)}
                    size="small">
                    <ToggleButton value="left"   sx={{ px: 3 }}>Left</ToggleButton>
                    <ToggleButton value="right"  sx={{ px: 3 }}>Right</ToggleButton>
                    <ToggleButton value="top"    sx={{ px: 3 }}>Top</ToggleButton>
                    <ToggleButton value="bottom" sx={{ px: 3 }}>Bottom</ToggleButton>
                </ToggleButtonGroup>
            </Section>

            {/* ── Layout Reset ── */}
            <Section title="Reset Column & Chart Sizes"
                subtitle="Reset column widths and chart sizes that you've resized. Changes take effect after navigating to the page.">

                {layoutResetMsg && (
                    <Alert severity="success" sx={{ mb: 2 }} onClose={() => setLayoutResetMsg('')}>
                        {layoutResetMsg}
                    </Alert>
                )}

                {/* Reset All button */}
                <Button
                    variant="contained" color="error" size="small"
                    startIcon={<RestartAltIcon />}
                    onClick={handleResetAll}
                    sx={{ mb: 2, textTransform: 'none' }}>
                    Reset All — Columns & Charts
                </Button>

                {/* Per-module reset buttons */}
                <Typography variant="body2" color="text.secondary" mb={1}>
                    Or reset individual modules:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {LAYOUT_MODULES.map(mod => (
                        <Button
                            key={mod.label}
                            variant="outlined" size="small"
                            startIcon={<RestartAltIcon />}
                            onClick={() => handleResetModule(mod)}
                            sx={{ textTransform: 'none', fontSize: 12 }}>
                            {mod.label}
                        </Button>
                    ))}
                </Box>
            </Section>

            <Divider sx={{ my: 3 }} />

            {/* ── Current settings summary ── */}
            <Paper sx={{ p: 2.5, borderRadius: 2, mb: 3, backgroundColor: 'action.hover' }}>
                <Typography variant="body2" fontWeight={600} mb={1.5} color="text.secondary">
                    Current Settings
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    <Chip size="small" label={`Theme: ${settings.themeMode}`} />
                    <Chip size="small" label={`Font: ${settings.fontFamily}`} />
                    <Chip size="small" label={`Size: ${settings.fontSize}`} />
                    <Chip size="small" label={`Sidebar: ${settings.sidebarSide}`} />
                    <Chip size="small"
                        label={`Accent: ${ACCENT_COLORS.find(c => c.value === settings.accentColor)?.label || 'Custom'}`}
                        sx={{ backgroundColor: settings.accentColor, color: 'white' }} />
                </Box>
            </Paper>

            <Button variant="outlined" color="error"
                onClick={() => { resetSettings(); updateSetting('bgImage', null); }}>
                Reset to Defaults
            </Button>
        </Box>
    );
}

export default SettingsPage;
