// ============================================================
// FILE: components/layout/MainLayout.js
// PURPOSE: The main wrapper layout for all ERP pages.
//          Contains the Sidebar (left) and top Header.
//          All pages are displayed inside this layout.
// ============================================================

import React from 'react';
import { Box, AppBar, Toolbar, Typography, IconButton, Avatar, Menu, MenuItem } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import Sidebar from './Sidebar';

function MainLayout({ children, currentUser, onLogout }) {
    const [anchorEl, setAnchorEl] = React.useState(null);

    const handleOpenUserMenu = (event) => setAnchorEl(event.currentTarget);
    const handleCloseUserMenu = () => setAnchorEl(null);

    const handleLogout = () => {
        handleCloseUserMenu();
        onLogout();
    };

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>

            {/* Left Sidebar Navigation */}
            <Sidebar />

            {/* Right Side - Header + Page Content */}
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>

                {/* Top Header Bar */}
                <AppBar position="static" sx={{ backgroundColor: 'white', boxShadow: 1 }}>
                    <Toolbar sx={{ justifyContent: 'space-between' }}>

                        {/* Left side - current page title will go here */}
                        <Typography variant="h6" color="#1a237e" fontWeight="bold">
                            SASI ERP
                        </Typography>

                        {/* Right side - logged in user info */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                                {currentUser?.username || 'User'}
                            </Typography>
                            <IconButton onClick={handleOpenUserMenu}>
                                <Avatar sx={{ width: 32, height: 32, backgroundColor: '#1a237e' }}>
                                    {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
                                </Avatar>
                            </IconButton>
                        </Box>

                        {/* User dropdown menu */}
                        <Menu
                            anchorEl={anchorEl}
                            open={Boolean(anchorEl)}
                            onClose={handleCloseUserMenu}
                        >
                            <MenuItem onClick={handleLogout}>
                                <LogoutIcon fontSize="small" sx={{ marginRight: 1 }} />
                                Logout
                            </MenuItem>
                        </Menu>
                    </Toolbar>
                </AppBar>

                {/* Page Content Area - each page renders here */}
                <Box sx={{ padding: 3, flexGrow: 1 }}>
                    {children}
                </Box>

            </Box>
        </Box>
    );
}

export default MainLayout;
