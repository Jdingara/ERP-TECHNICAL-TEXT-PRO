// ============================================================
// FILE: pages/authentication/LoginPage.js
// PURPOSE: Login page — first page every user sees.
// ============================================================

import { useState } from 'react';
import {
    Box, TextField, Button, Typography,
    Alert, CircularProgress, InputAdornment, IconButton,
} from '@mui/material';
import PersonOutlineIcon  from '@mui/icons-material/PersonOutline';
import LockOutlinedIcon   from '@mui/icons-material/LockOutlined';
import VisibilityIcon     from '@mui/icons-material/Visibility';
import VisibilityOffIcon  from '@mui/icons-material/VisibilityOff';

function LoginPage({ onLoginSuccess }) {
    const [username,  setUsername]  = useState('');
    const [password,  setPassword]  = useState('');
    const [showPass,  setShowPass]  = useState(false);
    const [error,     setError]     = useState('');
    const [loading,   setLoading]   = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res  = await fetch('/api/authentication/login/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username, password }),
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('sasi_erp_user', JSON.stringify(data.user));
                onLoginSuccess(data.user);
            } else {
                setError(data.message || 'Invalid username or password.');
            }
        } catch {
            setError('Cannot connect to server. Make sure the backend is running.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{
            minHeight: '100vh',
            display: 'flex',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
        }}>

            {/* ── Left panel — branding ── */}
            <Box sx={{
                flex: 1,
                display: { xs: 'none', md: 'flex' },
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'center',
                px: 8,
                position: 'relative',
                overflow: 'hidden',
            }}>
                {/* Decorative circle blurs */}
                <Box sx={{
                    position: 'absolute', width: 400, height: 400,
                    borderRadius: '50%', top: -100, left: -100,
                    background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
                }} />
                <Box sx={{
                    position: 'absolute', width: 300, height: 300,
                    borderRadius: '50%', bottom: 50, right: 50,
                    background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
                }} />

                {/* Logo mark */}
                <Box sx={{
                    width: 56, height: 56, borderRadius: 2,
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    mb: 3, boxShadow: '0 8px 32px rgba(99,102,241,0.35)',
                }}>
                    <Typography fontWeight={800} color="white" fontSize={26}>S</Typography>
                </Box>

                <Typography variant="h3" fontWeight={800} color="white" mb={1} lineHeight={1.1}>
                    SASI ERP
                </Typography>
                <Typography fontSize={16} color="#94a3b8" mb={4} maxWidth={380}>
                    Enterprise Resource Planning for Medical &amp; Technical Textile Manufacturers
                </Typography>

                {/* Feature pills */}
                {[
                    '✦  ISO 13485 & CAPA Compliance',
                    '✦  Batch Traceability & Shelf Life',
                    '✦  Production, Sales & Finance',
                    '✦  Technical Specs & Testing Lab',
                ].map(f => (
                    <Box key={f} sx={{
                        mb: 1.5, px: 2, py: 1,
                        borderRadius: 2,
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)',
                    }}>
                        <Typography fontSize={13.5} color="#cbd5e1">{f}</Typography>
                    </Box>
                ))}
            </Box>

            {/* ── Right panel — login form ── */}
            <Box sx={{
                width: { xs: '100%', md: 460 },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                px: { xs: 3, md: 6 },
                backgroundColor: 'white',
                borderRadius: { md: '24px 0 0 24px' },
            }}>
                <Box sx={{ width: '100%', maxWidth: 380 }}>

                    {/* Header */}
                    <Box mb={4}>
                        <Typography variant="h5" fontWeight={700} color="#0f172a" mb={0.5}>
                            Welcome back
                        </Typography>
                        <Typography color="text.secondary" fontSize={14}>
                            Sign in to your SASI ERP account
                        </Typography>
                    </Box>

                    {error && (
                        <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
                            {error}
                        </Alert>
                    )}

                    {/* Form */}
                    <form onSubmit={handleLogin}>
                        <Typography fontSize={13} fontWeight={600} color="#374151" mb={0.8}>
                            Username
                        </Typography>
                        <TextField
                            fullWidth
                            placeholder="Enter your username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            sx={{ mb: 2.5 }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <PersonOutlineIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <Typography fontSize={13} fontWeight={600} color="#374151" mb={0.8}>
                            Password
                        </Typography>
                        <TextField
                            fullWidth
                            type={showPass ? 'text' : 'password'}
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            sx={{ mb: 3.5 }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <LockOutlinedIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton size="small" onClick={() => setShowPass(!showPass)} edge="end">
                                            {showPass
                                                ? <VisibilityOffIcon sx={{ fontSize: 18, color: '#94a3b8' }} />
                                                : <VisibilityIcon    sx={{ fontSize: 18, color: '#94a3b8' }} />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <Button
                            type="submit"
                            variant="contained"
                            fullWidth
                            size="large"
                            disabled={loading}
                            sx={{
                                py: 1.5,
                                fontSize: 15,
                                fontWeight: 700,
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                    boxShadow: '0 6px 20px rgba(99,102,241,0.5)',
                                },
                            }}>
                            {loading ? <CircularProgress size={22} color="inherit" /> : 'Sign In'}
                        </Button>
                    </form>

                    <Typography mt={4} fontSize={12} color="#94a3b8" textAlign="center">
                        SASI ERP v1.0 · Medical &amp; Technical Textile
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
}

export default LoginPage;
