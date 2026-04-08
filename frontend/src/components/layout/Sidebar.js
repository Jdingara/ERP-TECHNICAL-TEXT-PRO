// ============================================================
// FILE: components/layout/Sidebar.js
// ============================================================

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Box, List, ListItem, ListItemButton,
    ListItemIcon, ListItemText, Collapse, Typography,
} from '@mui/material';

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

const BG        = '#0f172a';
const BG_HOVER  = 'rgba(255,255,255,0.06)';
const BG_ACTIVE = 'rgba(99,102,241,0.18)';
const ACCENT    = '#6366f1';
const TEXT_PRI  = '#f1f5f9';
const TEXT_SEC  = '#94a3b8';
const DIVIDER   = 'rgba(255,255,255,0.07)';

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

function Sidebar({ permissions, isAdmin }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [open, setOpen] = useState({ Dashboard: true });

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
                background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
                borderBottom: `1px solid ${DIVIDER}`,
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{
                        width: 36, height: 36, borderRadius: 1.5,
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
                    }}>
                        <Typography fontWeight="bold" color="white" fontSize={16}>S</Typography>
                    </Box>
                    <Box>
                        <Typography fontWeight={700} color={TEXT_PRI} fontSize={16} lineHeight={1.2}>
                            SASI ERP
                        </Typography>
                        <Typography color={TEXT_SEC} fontSize={10} letterSpacing={0.5}>
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
                                        '& svg': { fontSize: 20 },
                                    }}>
                                        {item.icon}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={item.title}
                                        slotProps={{ primary: {
                                            fontSize: 13.5,
                                            fontWeight: groupActive ? 600 : 400,
                                            color: groupActive ? TEXT_PRI : TEXT_SEC,
                                            letterSpacing: 0.1,
                                        }}}
                                    />
                                    {item.children.length > 0 && (
                                        groupOpen
                                            ? <ExpandLess sx={{ color: TEXT_SEC, fontSize: 18 }} />
                                            : <ExpandMore sx={{ color: TEXT_SEC, fontSize: 18 }} />
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
                                                            fontSize: active ? 8 : 6,
                                                            color: active ? color : TEXT_SEC,
                                                            mr: 1.5,
                                                        }} />
                                                        <ListItemText
                                                            primary={child.title}
                                                            slotProps={{ primary: {
                                                                fontSize: 12.5,
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
                <Typography fontSize={11} color={TEXT_SEC}>v1.0 · Development</Typography>
            </Box>
        </Box>
    );
}

export default Sidebar;
