// ============================================================
// FILE: components/layout/Sidebar.js
// ============================================================

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Box, List, ListItem, ListItemButton,
    ListItemIcon, ListItemText, Collapse, Typography,
    Menu, MenuItem,
} from '@mui/material';
import { useSettings, getShades } from '../../context/SettingsContext';

import DashboardIcon         from '@mui/icons-material/Dashboard';
import InventoryIcon         from '@mui/icons-material/Inventory';
import ShoppingCartIcon      from '@mui/icons-material/ShoppingCart';
import PointOfSaleIcon       from '@mui/icons-material/PointOfSale';
import AccountBalanceIcon    from '@mui/icons-material/AccountBalance';
import PeopleIcon            from '@mui/icons-material/People';
import FactoryIcon           from '@mui/icons-material/Factory';
import ScienceIcon           from '@mui/icons-material/Science';
import LocalHospitalIcon     from '@mui/icons-material/LocalHospital';
import AssessmentIcon        from '@mui/icons-material/Assessment';
import TuneIcon              from '@mui/icons-material/Tune';
import CategoryIcon          from '@mui/icons-material/Category';
import ExpandLess            from '@mui/icons-material/ExpandLess';
import ExpandMore            from '@mui/icons-material/ExpandMore';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

// Static constants that don't change with theme
const BG_HOVER  = 'rgba(255,255,255,0.06)';
const TEXT_PRI  = '#f1f5f9';
const TEXT_SEC  = '#94a3b8';
const DIVIDER   = 'rgba(255,255,255,0.07)';

// Font scale multiplier — applied to every hardcoded fontSize in the sidebar
const FONT_SCALE = { small: 0.88, medium: 1, large: 1.13 };
const makeFs = (fontSizeSetting) => (base) => Math.round(base * (FONT_SCALE[fontSizeSetting] || 1) * 10) / 10;

const MENU_ITEMS = [
    { title: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', children: [] },
    { title: 'Master Data', icon: <CategoryIcon />, children: [
        { title: 'Items / Products',  path: '/master-data/items' },
        { title: 'Suppliers',         path: '/master-data/suppliers' },
        { title: 'Customers',         path: '/master-data/customers' },
        { title: 'Warehouses',        path: '/master-data/warehouses' },
    ]},
    { title: 'Inventory', icon: <InventoryIcon />, children: [
        { title: 'Stock List',     path: '/inventory/stock-list' },
        { title: 'Stock Movement', path: '/inventory/stock-movement' },
    ]},
    { title: 'Purchasing', icon: <ShoppingCartIcon />, children: [
        { title: 'Purchase Orders',       path: '/purchasing/purchase-orders' },
        { title: 'Create Purchase Order', path: '/purchasing/create-purchase-order' },
        { title: 'Goods Receipt (GRN)',   path: '/purchasing/goods-receipt' },
    ]},
    { title: 'Sales', icon: <PointOfSaleIcon />, children: [
        { title: 'Inquiries',          path: '/sales/inquiries' },
        { title: 'Quotations',         path: '/sales/quotations' },
        { title: 'Order Journey',      path: '/sales/order-journey' },
        { title: 'Sales Orders',       path: '/sales/sales-orders' },
        { title: 'Create Sales Order', path: '/sales/create-sales-order' },
        { title: 'Invoices (AR)',      path: '/sales/invoices' },
    ]},
    { title: 'Finance', icon: <AccountBalanceIcon />, children: [
        { title: 'Chart of Accounts', path: '/finance/chart-of-accounts' },
        { title: 'Journal Entries',   path: '/finance/journal-entries' },
        { title: 'Trial Balance',     path: '/finance/trial-balance' },
    ]},
    { title: 'HR & Payroll', icon: <PeopleIcon />, children: [
        { title: 'Employees',  path: '/hr-payroll/employees' },
        { title: 'Attendance', path: '/hr-payroll/attendance' },
        { title: 'Salary',     path: '/hr-payroll/salary' },
    ]},
    { title: 'Production', icon: <FactoryIcon />, children: [
        { title: 'Bill of Materials', path: '/production/bill-of-materials' },
        { title: 'Work Orders',       path: '/production/work-orders' },
        { title: 'Create Work Order', path: '/production/create-work-order' },
        { title: 'Machines',          path: '/production/machines' },
        { title: 'Quality Checks',    path: '/production/quality-checks' },
        { title: 'Batch List',        path: '/production/batches' },
    ]},
    { title: 'Technical Textile', icon: <ScienceIcon />, children: [
        { title: 'Product Categories',   path: '/technical-textile/product-categories' },
        { title: 'Performance Specs',    path: '/technical-textile/performance-specs' },
        { title: 'Sample Management',    path: '/technical-textile/samples' },
        { title: 'Technical Data Sheet', path: '/technical-textile/data-sheets' },
        { title: 'Testing Lab',          path: '/technical-textile/testing-lab' },
        { title: 'R&D Projects',         path: '/technical-textile/rd-projects' },
    ]},
    { title: 'Medical Textile', icon: <LocalHospitalIcon />, children: [
        { title: 'Regulatory Compliance', path: '/medical-textile/compliance' },
        { title: 'Batch Traceability',    path: '/medical-textile/batch-traceability' },
        { title: 'Sterility Records',     path: '/medical-textile/sterility' },
        { title: 'CAPA Management',       path: '/medical-textile/capa' },
        { title: 'Audit Trail',           path: '/medical-textile/audit-trail' },
        { title: 'Shelf Life Tracking',   path: '/medical-textile/shelf-life' },
    ]},
    { title: 'Reports', icon: <AssessmentIcon />, children: [
        { title: 'Production Report', path: '/reports/production' },
        { title: 'Inventory Report',  path: '/reports/inventory' },
        { title: 'Sales Report',      path: '/reports/sales' },
        { title: 'Finance Report',    path: '/reports/finance' },
        { title: 'HR Report',         path: '/reports/hr' },
    ]},
    { title: 'Settings', icon: <TuneIcon />, children: [
        { title: 'Format Panel',      path: '/settings/format-panel' },
    ]},
];

const MODULE_COLORS = {
    'Dashboard':         '#6366f1',
    'Master Data':       '#06b6d4',
    'Inventory':         '#3b82f6',
    'Purchasing':        '#10b981',
    'Sales':             '#f59e0b',
    'Finance':           '#ef4444',
    'HR & Payroll':      '#8b5cf6',
    'Production':        '#f97316',
    'Technical Textile': '#14b8a6',
    'Medical Textile':   '#ec4899',
    'Settings':          '#64748b',
    'Reports':           '#a78bfa',
};

// ── Horizontal Sidebar (Top / Bottom) ────────────────────────
function HorizontalSidebar({ visibleMenu, navigate, location, shades, isBottom, fs }) {
    const [anchorEl,   setAnchorEl]   = useState(null);
    const [activeMenu, setActiveMenu] = useState(null);

    const ACCENT = shades.accent;
    const isActive      = (path) => location.pathname === path;
    const isGroupActive = (item) =>
        item.children?.some(c => location.pathname === c.path) ||
        location.pathname === item.path;

    const handleOpen  = (e, item) => { setAnchorEl(e.currentTarget); setActiveMenu(item); };
    const handleClose = ()         => { setAnchorEl(null); setActiveMenu(null); };

    return (
        <Box sx={{
            width: '100%', height: 52, flexShrink: 0,
            backgroundColor: shades.sidebarHeader,
            display: 'flex', alignItems: 'center',
            borderBottom: !isBottom ? `1px solid ${DIVIDER}` : 'none',
            borderTop:     isBottom ? `1px solid ${DIVIDER}` : 'none',
            px: 1, zIndex: 100,
        }}>
            {/* Logo */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, flexShrink: 0 }}>
                <Box sx={{
                    width: 28, height: 28, borderRadius: 1,
                    background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT}99)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <Typography fontWeight={700} color="white" fontSize={fs(13)}>S</Typography>
                </Box>
                <Typography fontWeight={700} color={TEXT_PRI} fontSize={fs(14)} sx={{ whiteSpace: 'nowrap' }}>
                    SASI ERP
                </Typography>
            </Box>

            {/* Vertical divider */}
            <Box sx={{ width: 1, height: 28, backgroundColor: DIVIDER, mx: 1, flexShrink: 0 }} />

            {/* Nav items — horizontal scrollable */}
            <Box sx={{
                display: 'flex', alignItems: 'center', gap: 0.5,
                overflowX: 'auto', flexGrow: 1,
                '&::-webkit-scrollbar': { display: 'none' },
            }}>
                {visibleMenu.map(item => {
                    const color       = MODULE_COLORS[item.title] || ACCENT;
                    const groupActive = isGroupActive(item);
                    const isOpen      = activeMenu?.title === item.title && Boolean(anchorEl);

                    return (
                        <Box key={item.title}>
                            <Box
                                onClick={(e) => {
                                    if (item.children.length === 0) navigate(item.path);
                                    else isOpen ? handleClose() : handleOpen(e, item);
                                }}
                                sx={{
                                    display: 'flex', alignItems: 'center', gap: 0.6,
                                    px: 1.5, py: 0.8, borderRadius: 1.5,
                                    cursor: 'pointer', whiteSpace: 'nowrap',
                                    backgroundColor: groupActive ? shades.activeAlpha : 'transparent',
                                    borderBottom: groupActive ? `2px solid ${color}` : '2px solid transparent',
                                    transition: 'all 0.15s',
                                    '&:hover': { backgroundColor: BG_HOVER },
                                }}>
                                <Box sx={{ color: groupActive ? color : TEXT_SEC, display: 'flex', '& svg': { fontSize: fs(16) } }}>
                                    {item.icon}
                                </Box>
                                <Typography fontSize={fs(12.5)} fontWeight={groupActive ? 600 : 400}
                                    color={groupActive ? TEXT_PRI : TEXT_SEC}>
                                    {item.title}
                                </Typography>
                                {item.children.length > 0 && (
                                    <ExpandMore sx={{ color: TEXT_SEC, fontSize: fs(14) }} />
                                )}
                            </Box>
                        </Box>
                    );
                })}
            </Box>

            {/* Dropdown */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                anchorOrigin={{ vertical: isBottom ? 'top' : 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: isBottom ? 'bottom' : 'top', horizontal: 'left' }}
                slotProps={{ paper: { sx: {
                    backgroundColor: shades.sidebarBg,
                    border: `1px solid ${DIVIDER}`,
                    borderRadius: 2, minWidth: 210, py: 0.5,
                }}}}
            >
                {activeMenu?.children.map(child => {
                    const active = isActive(child.path);
                    const color  = MODULE_COLORS[activeMenu.title] || ACCENT;
                    return (
                        <MenuItem
                            key={child.path}
                            onClick={() => { navigate(child.path); handleClose(); }}
                            sx={{
                                fontSize: fs(13), py: 0.9, px: 2,
                                color:           active ? TEXT_PRI : TEXT_SEC,
                                fontWeight:      active ? 600 : 400,
                                backgroundColor: active ? shades.activeAlpha : 'transparent',
                                borderLeft:      active ? `3px solid ${color}` : '3px solid transparent',
                                '&:hover': { backgroundColor: BG_HOVER, color: TEXT_PRI },
                            }}>
                            <FiberManualRecordIcon sx={{ fontSize: active ? fs(7) : fs(5), mr: 1.5, color: active ? color : TEXT_SEC }} />
                            {child.title}
                        </MenuItem>
                    );
                })}
            </Menu>
        </Box>
    );
}

// ── Vertical Sidebar (Left / Right) ──────────────────────────
function Sidebar({ permissions, isAdmin }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [open, setOpen] = useState({ Dashboard: true });
    const { settings } = useSettings();
    const shades = getShades(settings.accentColor);
    const ACCENT    = shades.accent;
    const BG        = shades.sidebarBg;
    const BG_ACTIVE = shades.activeAlpha;
    const fs        = makeFs(settings.fontSize);

    const canSee = (path) =>
        isAdmin || permissions === 'all' ||
        (Array.isArray(permissions) && permissions.includes(path));

    // Only show menu groups that have at least one visible page
    const visibleMenu = MENU_ITEMS.map(item => {
        if (item.children.length === 0) return item; // Dashboard always shown
        const visibleChildren = item.children.filter(c => canSee(c.path));
        return visibleChildren.length > 0 ? { ...item, children: visibleChildren } : null;
    }).filter(Boolean);

    const toggle     = (title) => setOpen(prev => ({ ...prev, [title]: !prev[title] }));
    const isActive   = (path)  => location.pathname === path;
    const isGroupActive = (item) =>
        item.children?.some(c => location.pathname === c.path) ||
        location.pathname === item.path;

    // Top / Bottom → horizontal layout
    if (settings.sidebarSide === 'top' || settings.sidebarSide === 'bottom') {
        return (
            <HorizontalSidebar
                visibleMenu={visibleMenu}
                navigate={navigate}
                location={location}
                shades={shades}
                isBottom={settings.sidebarSide === 'bottom'}
                fs={fs}
            />
        );
    }

    return (
        <Box sx={{
            width: 252, minWidth: 252, height: '100vh',
            backgroundColor: BG, display: 'flex', flexDirection: 'column',
            overflowX: 'hidden',
            borderRight: `1px solid ${DIVIDER}`,
        }}>

            {/* Logo */}
            <Box sx={{
                px: 2.5, py: 2.5,
                backgroundColor: shades.sidebarHeader,
                borderBottom: `1px solid ${DIVIDER}`,
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{
                        width: 36, height: 36, borderRadius: 1.5,
                        background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT}aa)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: `0 4px 12px ${ACCENT}55`,
                    }}>
                        <Typography fontWeight="bold" color="white" fontSize={fs(16)}>S</Typography>
                    </Box>
                    <Box>
                        <Typography fontWeight={700} color={TEXT_PRI} fontSize={fs(16)} lineHeight={1.2}>
                            SASI ERP
                        </Typography>
                        <Typography color={TEXT_SEC} fontSize={fs(10)} letterSpacing={0.5}>
                            MEDICAL · TECHNICAL TEXTILE
                        </Typography>
                    </Box>
                </Box>
            </Box>

            {/* Nav — scrollable */}
            <List sx={{
                px: 1, py: 1.5, flexGrow: 1,
                overflowY: 'auto', overflowX: 'hidden',
                '&::-webkit-scrollbar': { width: 4 },
                '&::-webkit-scrollbar-track': { background: 'transparent' },
                '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.15)', borderRadius: 2 },
            }}>
                {visibleMenu.map((item) => {
                    const color       = MODULE_COLORS[item.title] || ACCENT;
                    const groupOpen   = open[item.title];
                    const groupActive = isGroupActive(item);

                    return (
                        <Box key={item.title} mb={0.3}>
                            <ListItem disablePadding>
                                <ListItemButton
                                    onClick={() => {
                                        if (item.children.length === 0) navigate(item.path);
                                        else toggle(item.title);
                                    }}
                                    sx={{
                                        borderRadius: 1.5, py: 0.9, px: 1.5,
                                        backgroundColor: (groupActive && item.children.length === 0) ? BG_ACTIVE : 'transparent',
                                        borderLeft: groupActive ? `3px solid ${color}` : '3px solid transparent',
                                        transition: 'all 0.15s ease',
                                        '&:hover': { backgroundColor: BG_HOVER },
                                    }}>
                                    <ListItemIcon sx={{
                                        minWidth: 34,
                                        color: groupActive ? color : TEXT_SEC,
                                        '& svg': { fontSize: fs(20) },
                                    }}>
                                        {item.icon}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={item.title}
                                        slotProps={{ primary: {
                                            fontSize: fs(13.5),
                                            fontWeight: groupActive ? 600 : 400,
                                            color: groupActive ? TEXT_PRI : TEXT_SEC,
                                            letterSpacing: 0.1,
                                        }}}
                                    />
                                    {item.children.length > 0 && (
                                        groupOpen
                                            ? <ExpandLess sx={{ color: TEXT_SEC, fontSize: fs(18) }} />
                                            : <ExpandMore sx={{ color: TEXT_SEC, fontSize: fs(18) }} />
                                    )}
                                </ListItemButton>
                            </ListItem>

                            {item.children.length > 0 && (
                                <Collapse in={groupOpen} timeout="auto">
                                    <List disablePadding sx={{ pl: 1, mt: 0.3 }}>
                                        {item.children.map((child) => {
                                            const active = isActive(child.path);
                                            return (
                                                <ListItem key={child.path} disablePadding sx={{ mb: 0.2 }}>
                                                    <ListItemButton
                                                        onClick={() => navigate(child.path)}
                                                        sx={{
                                                            borderRadius: 1.5, py: 0.65, pl: 2.5,
                                                            backgroundColor: active ? BG_ACTIVE : 'transparent',
                                                            transition: 'all 0.15s ease',
                                                            '&:hover': { backgroundColor: BG_HOVER },
                                                        }}>
                                                        <FiberManualRecordIcon sx={{
                                                            fontSize: active ? fs(8) : fs(6),
                                                            color: active ? color : TEXT_SEC,
                                                            mr: 1.5,
                                                        }} />
                                                        <ListItemText
                                                            primary={child.title}
                                                            slotProps={{ primary: {
                                                                fontSize: fs(12.5),
                                                                fontWeight: active ? 600 : 400,
                                                                color: active ? TEXT_PRI : TEXT_SEC,
                                                            }}}
                                                        />
                                                    </ListItemButton>
                                                </ListItem>
                                            );
                                        })}
                                    </List>
                                </Collapse>
                            )}
                        </Box>
                    );
                })}
            </List>

            {/* Bottom tag */}
            <Box sx={{
                px: 2.5, py: 1.5,
                borderTop: `1px solid ${DIVIDER}`,
                display: 'flex', alignItems: 'center', gap: 1,
            }}>
                <Box sx={{
                    width: 6, height: 6, borderRadius: '50%',
                    backgroundColor: '#22c55e', boxShadow: '0 0 6px #22c55e',
                }} />
                <Typography fontSize={fs(11)} color={TEXT_SEC}>v1.0 · Development</Typography>
            </Box>
        </Box>
    );
}

export default Sidebar;
