// ============================================================
// FILE: pages/authentication/LoginPage.js
// PURPOSE: Login page - first page every user sees.
//          Has username and password fields.
//          Redirects to Dashboard after successful login.
// ============================================================

import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    TextField,
    Button,
    Typography,
    Alert,
    CircularProgress,
} from '@mui/material';

function LoginPage({ onLoginSuccess }) {
    // State variables - store what user types
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Runs when user clicks Login button
    const handleLogin = async (event) => {
        event.preventDefault();
        setErrorMessage('');
        setIsLoading(true);

        try {
            const response = await fetch('http://127.0.0.1:8000/api/authentication/login/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                // Login successful - save user info and go to dashboard
                localStorage.setItem('sasi_erp_user', JSON.stringify(data.user));
                onLoginSuccess(data.user);
            } else {
                setErrorMessage(data.message || 'Invalid username or password.');
            }
        } catch (error) {
            setErrorMessage('Cannot connect to server. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                backgroundColor: '#1a237e',  // Dark blue background
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Card sx={{ width: 400, borderRadius: 3, boxShadow: 10 }}>
                <CardContent sx={{ padding: 4 }}>

                    {/* ERP Logo and Title */}
                    <Box sx={{ textAlign: 'center', marginBottom: 3 }}>
                        <Typography variant="h4" fontWeight="bold" color="#1a237e">
                            SASI ERP
                        </Typography>
                        <Typography variant="subtitle1" color="text.secondary">
                            Medical & Technical Textile
                        </Typography>
                        <Typography variant="body2" color="text.secondary" mt={1}>
                            Please login to continue
                        </Typography>
                    </Box>

                    {/* Error message - shows if login fails */}
                    {errorMessage && (
                        <Alert severity="error" sx={{ marginBottom: 2 }}>
                            {errorMessage}
                        </Alert>
                    )}

                    {/* Login Form */}
                    <form onSubmit={handleLogin}>
                        <TextField
                            label="Username"
                            variant="outlined"
                            fullWidth
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            sx={{ marginBottom: 2 }}
                            required
                        />
                        <TextField
                            label="Password"
                            type="password"
                            variant="outlined"
                            fullWidth
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            sx={{ marginBottom: 3 }}
                            required
                        />
                        <Button
                            type="submit"
                            variant="contained"
                            fullWidth
                            size="large"
                            disabled={isLoading}
                            sx={{ backgroundColor: '#1a237e', padding: 1.5 }}
                        >
                            {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Login'}
                        </Button>
                    </form>

                </CardContent>
            </Card>
        </Box>
    );
}

export default LoginPage;
