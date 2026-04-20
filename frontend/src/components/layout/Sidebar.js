// ============================================================
// FILE: components/layout/Sidebar.js
// ============================================================

import { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Box, List, ListItem, ListItemButton,
    ListItemIcon, ListItemText, Collapse, Typography,
    Menu, MenuItem, Tooltip, IconButton,
} from '@mui/material';
import { useSettings, getShades } from '../../context/SettingsContext';
import ChevronLeftIcon   from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon  from '@mui/icons-material/ChevronRight';
import PushPinIcon       from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';

import DashboardIcon         from '@mui/icons-material/Dashboard';
import CategoryIcon          from '@mui/icons-material/Category';
import ShoppingCartIcon      from '@mui/icons-material/ShoppingCart';
import WarehouseIcon         from '@mui/icons-material/Warehouse';
import EventNoteIcon         from '@mui/icons-material/EventNote';
import FactoryIcon           from '@mui/icons-material/Factory';
import TaskAltIcon           from '@mui/icons-material/TaskAlt';
import LocalShippingIcon     from '@mui/icons-material/LocalShipping';
import AccountTreeIcon       from '@mui/icons-material/AccountTree';
import AssessmentIcon        from '@mui/icons-material/Assessment';
import TuneIcon              from '@mui/icons-material/Tune';
import HistoryIcon           from '@mui/icons-material/History';
import BuildIcon             from '@mui/icons-material/Build';
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
    { title: 'Masters', icon: <CategoryIcon />, children: [
        { title: 'Yarn Master',      path: '/masters/yarn' },
        { title: 'Item Master',      path: '/masters/items' },
        { title: 'Machines',         path: '/masters/machines' },
        { title: 'Processes',        path: '/masters/processes' },
        { title: 'Products / Design',path: '/masters/products' },
        { title: 'BOM',              path: '/masters/bom' },
        { title: 'Vendors',          path: '/masters/vendors' },
        { title: 'Customers',        path: '/masters/customers' },
        { title: 'Locations',        path: '/masters/locations' },
        { title: 'UOM',              path: '/masters/uom' },
    ]},
    { title: 'Purchase', icon: <ShoppingCartIcon />, children: [
        { title: 'Purchase Orders', path: '/purchase/orders' },
        { title: 'GRN',             path: '/purchase/grn' },
        { title: 'Lot Stock',       path: '/purchase/lots' },
        { title: 'Invoices (AP)',   path: '/purchase/invoices' },
    ]},
    { title: 'Lot Inventory', icon: <WarehouseIcon />, children: [
        { title: 'Stock Dashboard', path: '/lot-inventory/dashboard' },
        { title: 'Movements',       path: '/lot-inventory/movements' },
        { title: 'Adjustments',     path: '/lot-inventory/adjustments' },
    ]},
    { title: 'Planning', icon: <EventNoteIcon />, children: [
        { title: 'Customer Forecasts', path: '/planning/forecasts' },
        { title: 'Sales Orders',       path: '/planning/sales-orders' },
        { title: 'Production Orders',  path: '/planning/production-orders' },
        { title: 'Daily Plan',         path: '/planning/daily-plan' },
    ]},
    { title: 'Production', icon: <FactoryIcon />, children: [
        { title: 'Yarn Issue',      path: '/production/yarn-issues' },
        { title: 'Process Entries', path: '/production/entries' },
        { title: 'Batches',         path: '/production/batches' },
        { title: 'Beam Outward',    path: '/production/beams' },
        { title: '— Stage Screens —', path: '' },
        { title: 'Warping',         path: '/production/stages/warping' },
        { title: 'Weaving',         path: '/production/stages/weaving' },
        { title: 'Stenter',         path: '/production/stages/stenter' },
        { title: 'Tumbler',         path: '/production/stages/tumbler' },
        { title: 'Lamination',      path: '/production/stages/lamination' },
        { title: 'Embossing',       path: '/production/stages/embossing' },
    ]},
    { title: 'Quality', icon: <TaskAltIcon />, children: [
        { title: 'QC Dashboard',   path: '/quality/dashboard' },
        { title: 'Inspections',    path: '/quality/inspections' },
        { title: 'Defect Types',   path: '/quality/defect-types' },
        { title: 'Sample Testing', path: '/quality/sample-testing' },
    ]},
    { title: 'Dispatch', icon: <LocalShippingIcon />, children: [
        { title: 'Dispatch Entries',    path: '/dispatch/entries' },
        { title: 'Delivery Challans',   path: '/dispatch/delivery-challans' },
        { title: 'Sales Invoices',      path: '/dispatch/invoices' },
    ]},
    { title: 'Maintenance', icon: <BuildIcon />, children: [
        { title: 'Schedule Master',    path: '/maintenance/schedule' },
        { title: 'Maintenance Log',    path: '/maintenance/log' },
        { title: 'Escalation Config',  path: '/maintenance/escalation' },
    ]},
    { title: 'Traceability', icon: <AccountTreeIcon />, path: '/traceability', children: [] },
    { title: 'Inventory', icon: <WarehouseIcon />, children: [
        { title: 'Finished Goods', path: '/inventory/finished-goods' },
    ]},
    { title: 'Reports', icon: <AssessmentIcon />, children: [
        { title: 'Production Report',  path: '/reports/production' },
        { title: 'Lot Stock Report',   path: '/reports/lot-stock' },
        { title: 'Quality Report',     path: '/reports/quality' },
        { title: 'Reconciliation',     path: '/reports/reconciliation' },
    ]},
    { title: 'Analytics', icon: <AssessmentIcon />, path: '/analytics', children: [] },
    { title: 'Daily Feed', icon: <DashboardIcon />, path: '/feed', children: [] },
    { title: 'Settings', icon: <TuneIcon />, children: [
        { title: 'Company Master',     path: '/settings/company-master' },
        { title: 'Format Panel',       path: '/settings/format-panel' },
        { title: 'Tally Integration',  path: '/settings/tally' },
    ]},
    { title: 'Activity Log', icon: <HistoryIcon />, path: '/audit/activity-log', children: [] },
];

const MODULE_COLORS = {
    'Dashboard':      '#6366f1',
    'Masters':        '#06b6d4',
    'Purchase':       '#10b981',
    'Lot Inventory':  '#3b82f6',
    'Planning':       '#f59e0b',
    'Production':     '#f97316',
    'Quality':        '#14b8a6',
    'Dispatch':       '#8b5cf6',
    'Traceability':   '#ec4899',
    'Inventory':      '#06b6d4',
    'Reports':        '#a78bfa',
    'Analytics':      '#f97316',
    'Daily Feed':     '#10b981',
    'Settings':       '#64748b',
    'Activity Log':   '#0ea5e9',
};

// ── Horizontal Sidebar (Top / Bottom) ────────────────────────
function HorizontalSidebar({ visibleMenu, navigate, location, accent, isBottom }) {
    const [anchorEl,   setAnchorEl]   = useState(null);
    const [activeMenu, setActiveMenu] = useState(null);
    const scrollRef = useRef(null);

    const isGroupActive = (item) =>
        (item.children || []).some(c => location.pathname === c.path) ||
        location.pathname === item.path;

    const handleOpen  = (e, item) => { setAnchorEl(e.currentTarget); setActiveMenu(item); };
    const handleClose = ()        => { setAnchorEl(null); setActiveMenu(null); };

    const scrollBy = (dir) => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: dir * 200, behavior: 'smooth' });
        }
    };

    const scrollBtnStyle = {
        flexShrink: 0,
        width: 28, height: 28,
        borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.18)',
        backgroundColor: 'rgba(255,255,255,0.08)',
        color: '#cbd5e1',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        fontSize: 18,
        userSelect: 'none',
        transition: 'background 0.15s',
    };

    return (
        <div style={{
            width: '100%',
            height: 56,
            flexShrink: 0,
            backgroundColor: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            boxShadow: isBottom ? '0 -2px 12px rgba(0,0,0,0.4)' : '0 2px 12px rgba(0,0,0,0.4)',
            paddingLeft: 16,
            paddingRight: 16,
            boxSizing: 'border-box',
            zIndex: 1200,
            position: 'relative',
        }}>

            {/* ── Logo ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginRight: 12 }}>
                <div style={{
                    width: 30, height: 30, borderRadius: 6, flexShrink: 0,
                    background: `linear-gradient(135deg, ${accent}, ${accent}99)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <span style={{ fontWeight: 700, color: 'white', fontSize: 14 }}>S</span>
                </div>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#f1f5f9', whiteSpace: 'nowrap' }}>
                    MEI TEXZ
                </span>
            </div>

            {/* ── Divider ── */}
            <div style={{ width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.15)', marginLeft: 12, marginRight: 12, flexShrink: 0 }} />

            {/* ── Scroll Left button ── */}
            <div
                style={scrollBtnStyle}
                onClick={() => scrollBy(-1)}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.18)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'}
            >
                <ChevronLeftIcon style={{ fontSize: 18 }} />
            </div>

            {/* ── Nav items ── */}
            <div
                ref={scrollRef}
                style={{
                    display: 'flex', alignItems: 'center', flexGrow: 1,
                    overflowX: 'auto', gap: 4,
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    padding: '0 6px',
                }}>
                {visibleMenu.map(item => {
                    const color       = MODULE_COLORS[item.title] || accent;
                    const groupActive = isGroupActive(item);
                    const isOpen      = activeMenu?.title === item.title && Boolean(anchorEl);
                    const hasChildren = (item.children || []).length > 0;

                    return (
                        <div
                            key={item.title}
                            onClick={(e) => {
                                if (!hasChildren) navigate(item.path);
                                else isOpen ? handleClose() : handleOpen(e, item);
                            }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 5,
                                padding: '6px 12px',
                                borderRadius: 8,
                                flexShrink: 0,
                                cursor: 'pointer',
                                userSelect: 'none',
                                backgroundColor: groupActive || isOpen ? `${color}30` : 'transparent',
                                borderBottom: `2px solid ${groupActive ? color : 'transparent'}`,
                                transition: 'background 0.15s',
                                whiteSpace: 'nowrap',
                            }}
                            onMouseEnter={e => { if (!groupActive && !isOpen) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; }}
                            onMouseLeave={e => { if (!groupActive && !isOpen) e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                            {/* Icon */}
                            <span style={{
                                display: 'flex', alignItems: 'center',
                                color: groupActive ? color : '#94a3b8',
                                fontSize: 16,
                            }}>
                                {item.icon}
                            </span>
                            {/* Label */}
                            <span style={{
                                fontSize: 12.5,
                                fontWeight: groupActive ? 700 : 400,
                                color: groupActive ? '#ffffff' : '#cbd5e1',
                            }}>
                                {item.title}
                            </span>
                            {/* Arrow */}
                            {hasChildren && (
                                <span style={{
                                    display: 'flex', alignItems: 'center',
                                    color: '#94a3b8', fontSize: 14,
                                    transform: isOpen ? 'rotate(180deg)' : 'none',
                                    transition: 'transform 0.2s',
                                }}>
                                    <ExpandMore style={{ fontSize: 14 }} />
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ── Scroll Right button ── */}
            <div
                style={scrollBtnStyle}
                onClick={() => scrollBy(1)}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.18)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'}
            >
                <ChevronRightIcon style={{ fontSize: 18 }} />
            </div>

            {/* ── Dropdown ── */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl) && Boolean(activeMenu)}
                onClose={handleClose}
                disableScrollLock
                anchorOrigin={{ vertical: isBottom ? 'top' : 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: isBottom ? 'bottom' : 'top', horizontal: 'left' }}
                slotProps={{ paper: { sx: {
                    backgroundColor: '#1e293b',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 2,
                    minWidth: 220,
                    py: 0.5,
                    mt: isBottom ? 0 : 0.5,
                    boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                }}}}
            >
                {activeMenu && (
                    <Box sx={{
                        px: 2, py: 1,
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        mb: 0.5,
                        display: 'flex', alignItems: 'center', gap: 1,
                    }}>
                        <Box sx={{ color: MODULE_COLORS[activeMenu.title] || accent, display: 'flex', '& svg': { fontSize: 16 } }}>
                            {activeMenu.icon}
                        </Box>
                        <Typography fontSize={11} fontWeight={700} letterSpacing={0.8}
                            sx={{ color: MODULE_COLORS[activeMenu.title] || accent, textTransform: 'uppercase' }}>
                            {activeMenu.title}
                        </Typography>
                    </Box>
                )}

                {activeMenu?.children.map(child => {
                    const active = location.pathname === child.path;
                    const color  = MODULE_COLORS[activeMenu.title] || accent;
                    return (
                        <MenuItem
                            key={child.path}
                            onClick={() => { navigate(child.path); handleClose(); }}
                            sx={{
                                px: 2, py: 1, fontSize: 13,
                                fontWeight: active ? 600 : 400,
                                color:           active ? '#ffffff' : '#94a3b8',
                                backgroundColor: active ? `${color}25` : 'transparent',
                                borderLeft:      active ? `3px solid ${color}` : '3px solid transparent',
                                gap: 1.5,
                                '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)', color: '#ffffff' },
                            }}>
                            <FiberManualRecordIcon sx={{ fontSize: active ? 7 : 5, color: active ? color : '#64748b' }} />
                            {child.title}
                        </MenuItem>
                    );
                })}
            </Menu>
        </div>
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

    // Collapse / Pin — persisted in localStorage
    const [collapsed, setCollapsed] = useState(
        () => JSON.parse(localStorage.getItem('sidebar_collapsed') || 'false')
    );
    const [pinned, setPinned] = useState(
        () => JSON.parse(localStorage.getItem('sidebar_pinned') || 'false')
    );
    // Popover for icon-only mode (collapsed sub-menus)
    const [popoverEl,   setPopoverEl]   = useState(null);
    const [popoverMenu, setPopoverMenu] = useState(null);

    const toggleCollapse = () => {
        if (pinned) return; // pinned = always visible
        const next = !collapsed;
        setCollapsed(next);
        localStorage.setItem('sidebar_collapsed', JSON.stringify(next));
        if (next) setOpen({}); // close all groups when collapsing
    };
    const togglePin = () => {
        const next = !pinned;
        setPinned(next);
        localStorage.setItem('sidebar_pinned', JSON.stringify(next));
        if (next && collapsed) { // unpin while collapsed → expand
            setCollapsed(false);
            localStorage.setItem('sidebar_collapsed', 'false');
        }
    };

    const canSee = (path) =>
        isAdmin || permissions === 'all' ||
        (Array.isArray(permissions) && permissions.includes(path));

    // Only show menu groups that have at least one visible page
    const visibleMenu = MENU_ITEMS.map(item => {
        // Top-level leaf items (no children, e.g. Activity Log)
        if (!item.children) return canSee(item.path) ? item : null;
        if (item.children.length === 0) return item;
        const visibleChildren = item.children.filter(c => !c.path || canSee(c.path));
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
                accent={settings.accentColor}
                isBottom={settings.sidebarSide === 'bottom'}
            />
        );
    }

    const W = collapsed ? 64 : 252;

    return (
        <Box sx={{
            width: W, minWidth: W, height: '100vh',
            position: 'sticky', top: 0, alignSelf: 'flex-start',
            backgroundColor: BG, display: 'flex', flexDirection: 'column',
            overflowX: 'hidden',
            borderRight: `1px solid ${DIVIDER}`,
            transition: 'width 0.22s ease, min-width 0.22s ease',
        }}>

            {/* Logo + collapse/pin controls */}
            <Box sx={{
                px: collapsed ? 1 : 2,
                py: 1.5,
                backgroundColor: shades.sidebarHeader,
                borderBottom: `1px solid ${DIVIDER}`,
                display: 'flex', alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'space-between',
                minHeight: 64,
            }}>
                {/* Logo icon always visible */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, overflow: 'hidden' }}>
                    <Box sx={{
                        width: 34, height: 34, borderRadius: 1.5, flexShrink: 0,
                        background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT}aa)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: `0 4px 12px ${ACCENT}55`,
                    }}>
                        <Typography fontWeight={700} color="white" fontSize={fs(15)}>S</Typography>
                    </Box>
                    {!collapsed && (
                        <Box sx={{ overflow: 'hidden' }}>
                            <Typography fontWeight={700} color={TEXT_PRI} fontSize={fs(15)} lineHeight={1.2} noWrap>
                                MEI TEXZ
                            </Typography>
                            <Typography color={TEXT_SEC} fontSize={fs(9.5)} letterSpacing={0.5} noWrap>
                                MEI TEXZ
                            </Typography>
                        </Box>
                    )}
                </Box>

                {/* Controls: collapse + pin */}
                {!collapsed && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, flexShrink: 0 }}>
                        {/* Pin button */}
                        <Tooltip title={pinned ? 'Unpin sidebar' : 'Pin sidebar (always visible)'} placement="bottom">
                            <IconButton size="small" onClick={togglePin}
                                sx={{ color: pinned ? ACCENT : TEXT_SEC, p: 0.5,
                                    '&:hover': { backgroundColor: BG_HOVER } }}>
                                {pinned ? <PushPinIcon sx={{ fontSize: 16 }} /> : <PushPinOutlinedIcon sx={{ fontSize: 16 }} />}
                            </IconButton>
                        </Tooltip>
                        {/* Collapse button */}
                        {!pinned && (
                            <Tooltip title="Collapse sidebar" placement="bottom">
                                <IconButton size="small" onClick={toggleCollapse}
                                    sx={{ color: TEXT_SEC, p: 0.5,
                                        '&:hover': { backgroundColor: BG_HOVER } }}>
                                    <ChevronLeftIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>
                )}

                {/* Expand button when collapsed */}
                {collapsed && (
                    <Tooltip title="Expand sidebar" placement="right">
                        <IconButton size="small" onClick={toggleCollapse}
                            sx={{ color: TEXT_SEC, p: 0.3, mt: 0.5,
                                '&:hover': { backgroundColor: BG_HOVER } }}>
                            <ChevronRightIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                    </Tooltip>
                )}
            </Box>

            {/* Nav — scrollable */}
            <List sx={{
                px: collapsed ? 0.5 : 1, py: 1.5, flexGrow: 1,
                overflowY: 'auto', overflowX: 'hidden',
                '&::-webkit-scrollbar': { width: 4 },
                '&::-webkit-scrollbar-track': { background: 'transparent' },
                '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.15)', borderRadius: 2 },
            }}>
                {visibleMenu.map((item) => {
                    const color       = MODULE_COLORS[item.title] || ACCENT;
                    const groupOpen   = open[item.title];
                    const groupActive = isGroupActive(item);

                    // ── COLLAPSED: icon-only mode ──
                    if (collapsed) {
                        return (
                            <Box key={item.title} mb={0.3}>
                                <Tooltip title={item.title} placement="right" arrow>
                                    <ListItemButton
                                        onClick={(e) => {
                                            if (!item.children?.length) navigate(item.path);
                                            else { setPopoverEl(e.currentTarget); setPopoverMenu(item); }
                                        }}
                                        sx={{
                                            borderRadius: 1.5, py: 0.9, px: 1,
                                            justifyContent: 'center',
                                            backgroundColor: groupActive ? BG_ACTIVE : 'transparent',
                                            borderLeft: groupActive ? `3px solid ${color}` : '3px solid transparent',
                                            '&:hover': { backgroundColor: BG_HOVER },
                                        }}>
                                        <ListItemIcon sx={{
                                            minWidth: 0, color: groupActive ? color : TEXT_SEC,
                                            '& svg': { fontSize: fs(20) },
                                        }}>
                                            {item.icon}
                                        </ListItemIcon>
                                    </ListItemButton>
                                </Tooltip>
                            </Box>
                        );
                    }

                    // ── EXPANDED: full mode ──
                    return (
                        <Box key={item.title} mb={0.3}>
                            <ListItem disablePadding>
                                <ListItemButton
                                    onClick={() => {
                                        if (!item.children?.length) navigate(item.path);
                                        else toggle(item.title);
                                    }}
                                    sx={{
                                        borderRadius: 1.5, py: 0.9, px: 1.5,
                                        backgroundColor: (groupActive && !item.children?.length) ? BG_ACTIVE : 'transparent',
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
                                    {!!item.children?.length && (
                                        groupOpen
                                            ? <ExpandLess sx={{ color: TEXT_SEC, fontSize: fs(18) }} />
                                            : <ExpandMore sx={{ color: TEXT_SEC, fontSize: fs(18) }} />
                                    )}
                                </ListItemButton>
                            </ListItem>

                            {!!item.children?.length && (
                                <Collapse in={groupOpen} timeout="auto">
                                    <List disablePadding sx={{ pl: 1, mt: 0.3 }}>
                                        {item.children.map((child) => {
                                            // Section separator (empty path)
                                            if (!child.path) {
                                                return (
                                                    <ListItem key={child.title} disablePadding sx={{ mb: 0.2 }}>
                                                        <Box sx={{ px: 2.5, py: 0.4 }}>
                                                            <Typography fontSize={fs(10)} color={TEXT_SEC} letterSpacing={0.6}
                                                                sx={{ textTransform: 'uppercase', opacity: 0.6 }}>
                                                                {child.title.replace(/—/g, '').trim()}
                                                            </Typography>
                                                        </Box>
                                                    </ListItem>
                                                );
                                            }
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

            {/* Popover sub-menu for collapsed icon mode */}
            <Menu
                anchorEl={popoverEl}
                open={Boolean(popoverEl)}
                onClose={() => { setPopoverEl(null); setPopoverMenu(null); }}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                slotProps={{ paper: { sx: {
                    backgroundColor: shades.sidebarBg,
                    border: `1px solid ${DIVIDER}`,
                    borderRadius: 2, minWidth: 210, py: 0.5, ml: 0.5,
                }}}}
            >
                {popoverMenu && (
                    <Box sx={{ px: 2, py: 1, borderBottom: `1px solid ${DIVIDER}`, mb: 0.5 }}>
                        <Typography fontSize={fs(11)} fontWeight={700} color={MODULE_COLORS[popoverMenu.title] || ACCENT}
                            letterSpacing={0.5} sx={{ textTransform: 'uppercase' }}>
                            {popoverMenu.title}
                        </Typography>
                    </Box>
                )}
                {popoverMenu?.children.map(child => {
                    const active = isActive(child.path);
                    const color  = MODULE_COLORS[popoverMenu.title] || ACCENT;
                    return (
                        <MenuItem key={child.path}
                            onClick={() => { navigate(child.path); setPopoverEl(null); setPopoverMenu(null); }}
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
