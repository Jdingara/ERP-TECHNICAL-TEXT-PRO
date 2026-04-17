// ============================================================
// FILE: components/layout/MainLayout.js
// ============================================================

import { useState, useEffect } from 'react';
import {
    Box, AppBar, Toolbar, Typography, IconButton,
    Avatar, Menu, MenuItem, Divider, Chip,
    Button, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { useSettings } from '../../context/SettingsContext';
import LogoutIcon               from '@mui/icons-material/Logout';
import PersonOutlineIcon        from '@mui/icons-material/PersonOutline';
import NotificationsNoneIcon    from '@mui/icons-material/NotificationsNone';
import SettingsIcon             from '@mui/icons-material/Settings';
import AdminPanelSettingsIcon   from '@mui/icons-material/AdminPanelSettings';
import BusinessIcon             from '@mui/icons-material/Business';
import KeyboardArrowDownIcon    from '@mui/icons-material/KeyboardArrowDown';
import CheckIcon                from '@mui/icons-material/Check';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar  from './Sidebar';
import ChatBot  from '../common/ChatBot';

const PAGE_TITLES = {
    '/dashboard':                           'Dashboard',
    '/master-data/items':                   'Items & Products',
    '/master-data/suppliers':               'Suppliers',
    '/master-data/customers':               'Customers',
    '/master-data/warehouses':              'Warehouses',
    '/inventory/stock-list':                'Stock List',
    '/inventory/stock-movement':            'Stock Movement',
    '/purchasing/purchase-orders':          'Purchase Orders',
    '/purchasing/create-purchase-order':    'Create Purchase Order',
    '/purchasing/goods-receipt':            'Goods Receipt (GRN)',
    '/sales/inquiries':                     'Customer Inquiries',
    '/sales/quotations':                    'Quotations',
    '/sales/order-journey':                 'Order Journey',
    '/sales/sales-orders':                  'Sales Orders',
    '/sales/create-sales-order':            'Create Sales Order',
    '/finance/chart-of-accounts':           'Chart of Accounts',
    '/finance/journal-entries':             'Journal Entries',
    '/finance/trial-balance':               'Trial Balance',
    '/hr-payroll/employees':                'Employees',
    '/hr-payroll/attendance':               'Attendance',
    '/hr-payroll/salary':                   'Salary Processing',
    '/production/bill-of-materials':        'Bill of Materials',
    '/production/work-orders':              'Work Orders',
    '/production/create-work-order':        'Create Work Order',
    '/production/machines':                 'Machine Master',
    '/production/quality-checks':          'Quality Checks',
    '/production/batches':                 'Batch List',
    '/technical-textile/product-categories':'Product Categories',
    '/technical-textile/performance-specs': 'Performance Specs',
    '/technical-textile/samples':           'Sample Management',
    '/technical-textile/data-sheets':       'Technical Data Sheets',
    '/technical-textile/testing-lab':       'Testing Lab',
    '/technical-textile/rd-projects':       'R&D Projects',
    '/medical-textile/compliance':          'Regulatory Compliance',
    '/medical-textile/batch-traceability':  'Batch Traceability',
    '/medical-textile/sterility':           'Sterility Records',
    '/medical-textile/capa':               'CAPA Management',
    '/medical-textile/audit-trail':         'Audit Trail',
    '/medical-textile/shelf-life':          'Shelf Life Tracking',
    '/reports/production':                  'Production Report',
    '/reports/inventory':                   'Inventory Report',
    '/reports/sales':                       'Sales Report',
    '/reports/finance':                     'Finance Report',
    '/reports/hr':                          'HR Report',
    '/settings':                            'Settings',
    '/settings/company-master':             'Company Master',
    '/settings/format-panel':              'Format Panel',
    '/settings/message-templates':         'Message Templates',
    '/admin':                               'Admin Panel',
};

const MODULE_CHIP = {
    '/dashboard':             { label: 'Home',             color: '#6366f1' },
    '/master-data':           { label: 'Master Data',      color: '#06b6d4' },
    '/inventory':             { label: 'Inventory',        color: '#3b82f6' },
    '/purchasing':            { label: 'Purchasing',       color: '#10b981' },
    '/sales':                 { label: 'Sales',            color: '#f59e0b' },
    '/finance':               { label: 'Finance',          color: '#ef4444' },
    '/hr-payroll':            { label: 'HR & Payroll',     color: '#8b5cf6' },
    '/production':            { label: 'Production',       color: '#f97316' },
    '/technical-textile':     { label: 'Technical',        color: '#14b8a6' },
    '/medical-textile':       { label: 'Medical',          color: '#ec4899' },
    '/reports':               { label: 'Reports',          color: '#a78bfa' },
    '/settings':              { label: 'Settings',         color: '#64748b' },
    '/admin':                 { label: 'Admin',            color: '#ef4444' },
};

function getModuleChip(pathname) {
    const key = Object.keys(MODULE_CHIP).find(k => pathname.startsWith(k));
    return key ? MODULE_CHIP[key] : null;
}

function LiveClock() {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const t = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);
    return (
        <Typography variant="caption" color="text.secondary"
            sx={{ fontFamily: 'monospace', fontSize: 12, display: { xs: 'none', md: 'block' } }}>
            {time.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}
            &nbsp;&nbsp;
            {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </Typography>
    );
}

function MainLayout({ children, currentUser, onLogout, permissions, isAdmin }) {
    const location = useLocation();
    const navigate = useNavigate();
    const [anchor, setAnchor] = useState(null);
    const { settings } = useSettings();

    // ── Company switcher state ──
    const [companies,      setCompanies]      = useState([]);
    const [activeCompany,  setActiveCompany]  = useState(null);
    const [companyAnchor,  setCompanyAnchor]  = useState(null);
    const [switchConfirm,  setSwitchConfirm]  = useState(null); // company object to confirm

    useEffect(() => {
        Promise.all([
            fetch('/api/master-data/settings/companies/').then(r => r.json()),
            fetch('/api/master-data/settings/companies/active/').then(r => r.json()),
        ]).then(([list, active]) => {
            if (!Array.isArray(list)) return;
            setCompanies(list);
            if (active && active.id) {
                setActiveCompany(active);
                localStorage.setItem('meitexz_active_company', JSON.stringify(active));
            }
        }).catch(() => {});
    }, []);

    const confirmSwitch = async () => {
        const company = switchConfirm;
        setSwitchConfirm(null);
        setCompanyAnchor(null);
        try {
            await fetch('/api/master-data/settings/companies/switch/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ company_id: company.id }),
            });
            localStorage.setItem('meitexz_active_company', JSON.stringify(company));
            window.location.reload();
        } catch {}
    };

    const pageTitle  = PAGE_TITLES[location.pathname] || 'MEI TEXZ ERP';
    const moduleChip = getModuleChip(location.pathname);
    const initials   = (currentUser?.first_name?.[0] || currentUser?.username?.[0] || 'U').toUpperCase();

    return (
        <>
        <Box sx={{
            display: 'flex', minHeight: '100vh',
            backgroundColor: 'background.default',
            flexDirection:
                settings.sidebarSide === 'right'  ? 'row-reverse' :
                settings.sidebarSide === 'top'    ? 'column' :
                settings.sidebarSide === 'bottom' ? 'column-reverse' :
                'row',
        }}>

            <Sidebar permissions={permissions} isAdmin={isAdmin} />

            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>

                {/* ── Top Header ── */}
                <AppBar position="static" elevation={0} sx={{
                    backgroundColor: 'background.paper',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    zIndex: 10,
                }}>
                    <Toolbar sx={{ justifyContent: 'space-between', minHeight: '60px !important', px: 3 }}>

                        {/* Left — module badge + page title */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            {moduleChip && (
                                <Chip label={moduleChip.label} size="small" sx={{
                                    backgroundColor: moduleChip.color + '18',
                                    color: moduleChip.color, fontWeight: 600, fontSize: 11,
                                    height: 22, border: `1px solid ${moduleChip.color}30`,
                                }} />
                            )}
                            <Typography variant="subtitle1" fontWeight={600}
                                color="text.primary" fontSize={15}>
                                {pageTitle}
                            </Typography>
                        </Box>

                        {/* Right — clock + company switcher + bell + user */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <LiveClock />

                            {/* ── Company Switcher ── */}
                            {companies.length > 0 && (
                                <>
                                <Box
                                    onClick={e => setCompanyAnchor(e.currentTarget)}
                                    sx={{
                                        display: 'flex', alignItems: 'center', gap: 0.75,
                                        cursor: 'pointer',
                                        backgroundColor: 'action.hover',
                                        border: '1px solid', borderColor: 'divider',
                                        borderRadius: 2, px: 1.5, py: 0.5,
                                        '&:hover': { backgroundColor: 'action.selected' },
                                        transition: 'background 0.15s',
                                    }}>
                                    <BusinessIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                                    <Typography variant="body2" fontWeight={600} fontSize={13} color="text.primary"
                                        sx={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {activeCompany?.name || 'Select Company'}
                                    </Typography>
                                    <KeyboardArrowDownIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                </Box>

                                <Menu
                                    anchorEl={companyAnchor}
                                    open={Boolean(companyAnchor)}
                                    onClose={() => setCompanyAnchor(null)}
                                    slotProps={{ paper: {
                                        elevation: 8,
                                        sx: {
                                            mt: 1, minWidth: 220, borderRadius: 2,
                                            border: '1px solid', borderColor: 'divider',
                                        },
                                    }}}>
                                    <Box sx={{ px: 2, py: 1 }}>
                                        <Typography fontSize={11} fontWeight={700} color="text.secondary"
                                            sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                                            Switch Company
                                        </Typography>
                                    </Box>
                                    <Divider />
                                    {companies.map(c => {
                                        const isActive = activeCompany?.id === c.id;
                                        return (
                                        <MenuItem
                                            key={c.id}
                                            onClick={() => {
                                                if (!isActive) setSwitchConfirm(c);
                                                else setCompanyAnchor(null);
                                            }}
                                            sx={{ fontSize: 14, py: 1.2, gap: 1 }}>
                                            <BusinessIcon sx={{ fontSize: 16, color: isActive ? 'primary.main' : 'text.disabled' }} />
                                            <Box sx={{ flexGrow: 1 }}>
                                                <Typography fontSize={13} fontWeight={isActive ? 700 : 500}>
                                                    {c.name}
                                                </Typography>
                                                {c.city && (
                                                    <Typography fontSize={11} color="text.secondary">{c.city}</Typography>
                                                )}
                                            </Box>
                                            {isActive && (
                                                <CheckIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                                            )}
                                        </MenuItem>
                                        );
                                    })}
                                    <Divider />
                                    <MenuItem onClick={() => { setCompanyAnchor(null); navigate('/settings/company-master'); }}
                                        sx={{ fontSize: 13, color: 'text.secondary', py: 1 }}>
                                        Manage Companies →
                                    </MenuItem>
                                </Menu>
                                </>
                            )}

                            <IconButton size="small" sx={{
                                backgroundColor: 'action.hover',
                                '&:hover': { backgroundColor: 'action.selected' },
                                width: 34, height: 34,
                            }}>
                                <NotificationsNoneIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                            </IconButton>

                            {/* User pill */}
                            <Box onClick={(e) => setAnchor(e.currentTarget)} sx={{
                                display: 'flex', alignItems: 'center', gap: 1,
                                cursor: 'pointer',
                                backgroundColor: 'action.hover',
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 2,
                                px: 1.5, py: 0.5,
                                '&:hover': { backgroundColor: 'action.selected' },
                                transition: 'background 0.15s',
                            }}>
                                <Avatar sx={{
                                    width: 28, height: 28, fontSize: 13,
                                    background: `linear-gradient(135deg, ${settings.accentColor}, ${settings.accentColor}bb)`,
                                    fontWeight: 700,
                                }}>
                                    {initials}
                                </Avatar>
                                <Typography variant="body2" fontWeight={500}
                                    color="text.primary" fontSize={13}>
                                    {currentUser?.first_name || currentUser?.username || 'User'}
                                </Typography>
                                {isAdmin && (
                                    <Chip label="Admin" size="small"
                                        sx={{ height: 18, fontSize: 10, backgroundColor: '#ef444415', color: '#ef4444' }} />
                                )}
                            </Box>
                        </Box>

                        {/* Dropdown menu */}
                        <Menu anchorEl={anchor} open={Boolean(anchor)}
                            onClose={() => setAnchor(null)}
                            slotProps={{ paper: {
                                elevation: 8,
                                sx: {
                                    mt: 1, minWidth: 200, borderRadius: 2,
                                    border: '1px solid', borderColor: 'divider',
                                    '& .MuiMenuItem-root': { fontSize: 14, py: 1 },
                                },
                            }}}>

                            {/* User info header */}
                            <Box sx={{ px: 2, py: 1.5 }}>
                                <Typography fontWeight={600} fontSize={14} color="text.primary">
                                    {currentUser?.first_name
                                        ? `${currentUser.first_name} ${currentUser.last_name || ''}`.trim()
                                        : currentUser?.username}
                                </Typography>
                                <Typography fontSize={12} color="text.secondary">
                                    {isAdmin ? 'Administrator' : 'Standard User'}
                                </Typography>
                            </Box>
                            <Divider />

                            <MenuItem onClick={() => { setAnchor(null); navigate('/settings'); }}>
                                <SettingsIcon fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} />
                                Settings
                            </MenuItem>

                            {isAdmin && (
                                <MenuItem onClick={() => { setAnchor(null); navigate('/admin'); }}>
                                    <AdminPanelSettingsIcon fontSize="small" sx={{ mr: 1.5, color: '#ef4444' }} />
                                    Admin Panel
                                </MenuItem>
                            )}

                            <MenuItem onClick={() => { setAnchor(null); navigate('/profile'); }}>
                                <PersonOutlineIcon fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} />
                                My Profile
                            </MenuItem>

                            <Divider />
                            <MenuItem onClick={() => { setAnchor(null); onLogout(); }}
                                sx={{ color: 'error.main' }}>
                                <LogoutIcon fontSize="small" sx={{ mr: 1.5 }} />
                                Logout
                            </MenuItem>
                        </Menu>
                    </Toolbar>
                </AppBar>

                {/* ── Page content ── */}
                <Box sx={{
                    flexGrow: 1, p: 3, overflowY: 'auto',
                    position: 'relative',
                    ...(settings.bgImage ? {
                        backgroundImage: `url(${settings.bgImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundAttachment: 'local',
                        '&::before': {
                            content: '""',
                            position: 'absolute', inset: 0,
                            backgroundColor: settings.themeMode === 'dark'
                                ? 'rgba(0,0,0,0.55)'
                                : 'rgba(255,255,255,0.72)',
                            pointerEvents: 'none',
                            zIndex: 0,
                        },
                        '& > *': { position: 'relative', zIndex: 1 },
                    } : {}),
                }}>
                    {children}
                </Box>
            </Box>
        </Box>

        {/* Floating ERP chatbot — visible on every page */}
        <ChatBot />

        {/* Company switch confirmation dialog */}
        <Dialog open={Boolean(switchConfirm)} onClose={() => setSwitchConfirm(null)} maxWidth="xs" fullWidth>
            <DialogTitle fontWeight={700} sx={{ pb: 1 }}>Switch Company?</DialogTitle>
            <DialogContent>
                <Typography fontSize={14} color="text.secondary" mb={1}>
                    You are switching the active company to:
                </Typography>
                <Box sx={{ background: 'action.hover', borderRadius: 2, p: 2, border: '1px solid', borderColor: 'divider' }}>
                    <Typography fontWeight={700} fontSize={15}>{switchConfirm?.name}</Typography>
                    {switchConfirm?.city && (
                        <Typography fontSize={13} color="text.secondary">{switchConfirm.city}</Typography>
                    )}
                </Box>
                <Typography fontSize={13} color="warning.main" mt={2}>
                    All prints (quotations, invoices, sales orders) will use this company's details.
                </Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={() => setSwitchConfirm(null)}>Cancel</Button>
                <Button variant="contained" onClick={confirmSwitch}>
                    Yes, Switch
                </Button>
            </DialogActions>
        </Dialog>
        </>
    );
}

export default MainLayout;
