// ============================================================
// FILE: components/layout/Sidebar.js
// PURPOSE: Left side navigation menu of the ERP.
//          Shows all modules - user clicks to navigate.
//          Collapsible menu groups per module.
// ============================================================

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Box,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Collapse,
    Typography,
    Divider,
} from '@mui/material';

// Icons for each module
import DashboardIcon from '@mui/icons-material/Dashboard';
import InventoryIcon from '@mui/icons-material/Inventory';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PeopleIcon from '@mui/icons-material/People';
import FactoryIcon from '@mui/icons-material/Factory';
import ScienceIcon from '@mui/icons-material/Science';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CategoryIcon from '@mui/icons-material/Category';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';

// ============================================================
// MENU STRUCTURE
// Each section has a title, icon, and list of pages
// ============================================================
const MENU_ITEMS = [
    {
        title: 'Dashboard',
        icon: <DashboardIcon />,
        path: '/dashboard',
        children: [],
    },
    {
        title: 'Master Data',
        icon: <CategoryIcon />,
        children: [
            { title: 'Items / Products', path: '/master-data/items' },
            { title: 'Suppliers', path: '/master-data/suppliers' },
            { title: 'Customers', path: '/master-data/customers' },
            { title: 'Units of Measure', path: '/master-data/units' },
            { title: 'Warehouses', path: '/master-data/warehouses' },
        ],
    },
    {
        title: 'Inventory',
        icon: <InventoryIcon />,
        children: [
            { title: 'Stock List', path: '/inventory/stock-list' },
            { title: 'Stock Movement', path: '/inventory/stock-movement' },
            { title: 'Stock Adjustment', path: '/inventory/stock-adjustment' },
            { title: 'Warehouse Transfer', path: '/inventory/warehouse-transfer' },
        ],
    },
    {
        title: 'Purchasing',
        icon: <ShoppingCartIcon />,
        children: [
            { title: 'Purchase Orders', path: '/purchasing/purchase-orders' },
            { title: 'Create Purchase Order', path: '/purchasing/create-purchase-order' },
            { title: 'Goods Receipt (GRN)', path: '/purchasing/goods-receipt' },
            { title: 'Supplier Payments', path: '/purchasing/supplier-payments' },
        ],
    },
    {
        title: 'Sales',
        icon: <PointOfSaleIcon />,
        children: [
            { title: 'Sales Orders', path: '/sales/sales-orders' },
            { title: 'Create Sales Order', path: '/sales/create-sales-order' },
            { title: 'Invoices', path: '/sales/invoices' },
            { title: 'Customer Payments', path: '/sales/customer-payments' },
            { title: 'Delivery Notes', path: '/sales/delivery-notes' },
        ],
    },
    {
        title: 'Finance',
        icon: <AccountBalanceIcon />,
        children: [
            { title: 'Chart of Accounts', path: '/finance/chart-of-accounts' },
            { title: 'Journal Entries', path: '/finance/journal-entries' },
            { title: 'General Ledger', path: '/finance/general-ledger' },
            { title: 'Accounts Payable', path: '/finance/accounts-payable' },
            { title: 'Accounts Receivable', path: '/finance/accounts-receivable' },
            { title: 'Trial Balance', path: '/finance/trial-balance' },
            { title: 'Profit & Loss', path: '/finance/profit-and-loss' },
            { title: 'Balance Sheet', path: '/finance/balance-sheet' },
        ],
    },
    {
        title: 'HR & Payroll',
        icon: <PeopleIcon />,
        children: [
            { title: 'Employees', path: '/hr-payroll/employees' },
            { title: 'Departments', path: '/hr-payroll/departments' },
            { title: 'Attendance', path: '/hr-payroll/attendance' },
            { title: 'Leave Management', path: '/hr-payroll/leave' },
            { title: 'Salary Processing', path: '/hr-payroll/salary' },
            { title: 'Payslips', path: '/hr-payroll/payslips' },
        ],
    },
    {
        title: 'Production',
        icon: <FactoryIcon />,
        children: [
            { title: 'Bill of Materials', path: '/production/bill-of-materials' },
            { title: 'Work Orders', path: '/production/work-orders' },
            { title: 'Create Work Order', path: '/production/create-work-order' },
            { title: 'Batch Tracking', path: '/production/batch-tracking' },
            { title: 'Machine Management', path: '/production/machines' },
            { title: 'Quality Control', path: '/production/quality-control' },
        ],
    },
    {
        title: 'Technical Textile',
        icon: <ScienceIcon />,
        children: [
            { title: 'Product Categories', path: '/technical-textile/product-categories' },
            { title: 'Performance Specs', path: '/technical-textile/performance-specs' },
            { title: 'Sample Management', path: '/technical-textile/samples' },
            { title: 'Technical Data Sheet', path: '/technical-textile/data-sheets' },
            { title: 'Testing Lab', path: '/technical-textile/testing-lab' },
            { title: 'R&D Projects', path: '/technical-textile/rd-projects' },
        ],
    },
    {
        title: 'Medical Textile',
        icon: <LocalHospitalIcon />,
        children: [
            { title: 'Regulatory Compliance', path: '/medical-textile/compliance' },
            { title: 'Batch Traceability', path: '/medical-textile/batch-traceability' },
            { title: 'Sterility Records', path: '/medical-textile/sterility' },
            { title: 'CAPA Management', path: '/medical-textile/capa' },
            { title: 'Audit Trail', path: '/medical-textile/audit-trail' },
            { title: 'Shelf Life Tracking', path: '/medical-textile/shelf-life' },
        ],
    },
    {
        title: 'Reports',
        icon: <AssessmentIcon />,
        children: [
            { title: 'Production Reports', path: '/reports/production' },
            { title: 'Inventory Reports', path: '/reports/inventory' },
            { title: 'Sales Reports', path: '/reports/sales' },
            { title: 'Finance Reports', path: '/reports/finance' },
            { title: 'HR Reports', path: '/reports/hr' },
        ],
    },
];

// ============================================================
// SIDEBAR COMPONENT
// ============================================================
function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();

    // Tracks which menu sections are open
    const [openSections, setOpenSections] = useState({ 'Dashboard': true });

    const toggleSection = (title) => {
        setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));
    };

    return (
        <Box
            sx={{
                width: 260,
                minHeight: '100vh',
                backgroundColor: '#1a237e',   // Dark blue sidebar
                color: 'white',
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto',
            }}
        >
            {/* ERP Name at top of sidebar */}
            <Box sx={{ padding: 2.5, textAlign: 'center' }}>
                <Typography variant="h6" fontWeight="bold" color="white">
                    SASI ERP
                </Typography>
                <Typography variant="caption" color="#90caf9">
                    Medical & Technical Textile
                </Typography>
            </Box>

            <Divider sx={{ backgroundColor: '#3949ab' }} />

            {/* Navigation Menu */}
            <List sx={{ padding: 1 }}>
                {MENU_ITEMS.map((item) => (
                    <Box key={item.title}>
                        {/* Section Header Button */}
                        <ListItem disablePadding>
                            <ListItemButton
                                onClick={() => {
                                    if (item.children.length === 0) {
                                        navigate(item.path);
                                    } else {
                                        toggleSection(item.title);
                                    }
                                }}
                                selected={location.pathname === item.path}
                                sx={{
                                    borderRadius: 1,
                                    marginBottom: 0.3,
                                    color: 'white',
                                    '&.Mui-selected': { backgroundColor: '#3949ab' },
                                    '&:hover': { backgroundColor: '#283593' },
                                }}
                            >
                                <ListItemIcon sx={{ color: '#90caf9', minWidth: 36 }}>
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.title}
                                    primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }}
                                />
                                {item.children.length > 0 && (
                                    openSections[item.title] ? <ExpandLess /> : <ExpandMore />
                                )}
                            </ListItemButton>
                        </ListItem>

                        {/* Sub-menu items */}
                        {item.children.length > 0 && (
                            <Collapse in={openSections[item.title]} timeout="auto">
                                <List disablePadding>
                                    {item.children.map((child) => (
                                        <ListItem key={child.path} disablePadding>
                                            <ListItemButton
                                                onClick={() => navigate(child.path)}
                                                selected={location.pathname === child.path}
                                                sx={{
                                                    paddingLeft: 4,
                                                    borderRadius: 1,
                                                    color: '#e3f2fd',
                                                    '&.Mui-selected': { backgroundColor: '#3949ab', color: 'white' },
                                                    '&:hover': { backgroundColor: '#283593' },
                                                }}
                                            >
                                                <ListItemText
                                                    primary={child.title}
                                                    primaryTypographyProps={{ fontSize: 13 }}
                                                />
                                            </ListItemButton>
                                        </ListItem>
                                    ))}
                                </List>
                            </Collapse>
                        )}
                    </Box>
                ))}
            </List>
        </Box>
    );
}

export default Sidebar;
