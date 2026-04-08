// FILE: pages/profile/ProfilePage.js
import React, { useState, useEffect, useRef } from 'react';
import {
    Box, Typography, Button, TextField, Paper, Avatar,
    Divider, Alert, CircularProgress, IconButton, Tooltip
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import LockResetIcon from '@mui/icons-material/LockReset';

function ProfilePage() {
    const fileRef = useRef();
    const [loading, setLoading]   = useState(true);
    const [saving, setSaving]     = useState(false);
    const [success, setSuccess]   = useState('');
    const [error, setError]       = useState('');
    const [showPwdFields, setShowPwdFields] = useState(false);

    const [form, setForm] = useState({
        first_name: '', last_name: '', email: '',
        designation: '', department: '', phone: '',
        employee_id: '', date_of_joining: '', bio: '',
        avatar: '',
        password: '', confirm_password: '',
    });

    const [displayInfo, setDisplayInfo] = useState({ username: '', role: '' });

    useEffect(() => {
        fetch('/api/authentication/my-profile/', { credentials: 'include' })
            .then(r => r.json())
            .then(data => {
                setDisplayInfo({ username: data.username, role: data.role });
                setForm(f => ({
                    ...f,
                    first_name:      data.first_name      || '',
                    last_name:       data.last_name       || '',
                    email:           data.email           || '',
                    designation:     data.designation     || '',
                    department:      data.department      || '',
                    phone:           data.phone           || '',
                    employee_id:     data.employee_id     || '',
                    date_of_joining: data.date_of_joining || '',
                    bio:             data.bio             || '',
                    avatar:          data.avatar          || '',
                }));
                setLoading(false);
            })
            .catch(() => { setError('Failed to load profile.'); setLoading(false); });
    }, []);

    const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => set('avatar', ev.target.result);
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        if (showPwdFields) {
            if (!form.password) { setError('Enter a new password.'); return; }
            if (form.password !== form.confirm_password) {
                setError('Passwords do not match.'); return;
            }
        }
        setSaving(true); setError(''); setSuccess('');
        const payload = {
            first_name:      form.first_name,
            last_name:       form.last_name,
            email:           form.email,
            designation:     form.designation,
            department:      form.department,
            phone:           form.phone,
            employee_id:     form.employee_id,
            date_of_joining: form.date_of_joining || null,
            bio:             form.bio,
            avatar:          form.avatar,
        };
        if (showPwdFields && form.password) {
            payload.password = form.password;
        }
        const res = await fetch('/api/authentication/my-profile/', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        setSaving(false);
        if (res.ok) {
            setSuccess('Profile saved successfully!');
            setShowPwdFields(false);
            set('password', ''); set('confirm_password', '');
        } else {
            setError(data.message || 'Error saving profile.');
        }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

    const initials = `${form.first_name?.[0] || ''}${form.last_name?.[0] || ''}`.toUpperCase() || displayInfo.username?.[0]?.toUpperCase() || '?';

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
                <Typography variant="h5" fontWeight="bold" color="primary" flex={1}>My Profile</Typography>
                <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving}
                    sx={{ backgroundColor: 'primary.main' }}>
                    {saving ? 'Saving…' : 'Save Profile'}
                </Button>
            </Box>

            {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}
            {error   && <Alert severity="error"   sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

            <Box sx={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 3, alignItems: 'start' }}>

                {/* Left — Avatar card */}
                <Paper sx={{ p: 3, borderRadius: 2, textAlign: 'center' }}>
                    <Box sx={{ position: 'relative', display: 'inline-block', mb: 2 }}>
                        <Avatar
                            src={form.avatar || undefined}
                            sx={{ width: 120, height: 120, fontSize: 40, mx: 'auto',
                                  backgroundColor: 'primary.main' }}>
                            {!form.avatar && initials}
                        </Avatar>
                        <Tooltip title="Change photo">
                            <IconButton size="small"
                                sx={{ position: 'absolute', bottom: 0, right: 0,
                                      backgroundColor: 'background.paper', border: '1px solid',
                                      borderColor: 'divider', '&:hover': { backgroundColor: 'action.hover' } }}
                                onClick={() => fileRef.current.click()}>
                                <PhotoCameraIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
                    </Box>

                    <Typography variant="subtitle1" fontWeight={700}>
                        {form.first_name || form.last_name
                            ? `${form.first_name} ${form.last_name}`.trim()
                            : displayInfo.username}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">{form.designation || '—'}</Typography>
                    <Typography variant="caption" color="text.secondary">{displayInfo.role || 'No Role'}</Typography>

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                        Username: <strong>{displayInfo.username}</strong>
                    </Typography>
                    {form.employee_id && (
                        <Typography variant="caption" color="text.secondary" display="block">
                            Emp ID: <strong>{form.employee_id}</strong>
                        </Typography>
                    )}

                    <Divider sx={{ my: 2 }} />

                    <Button size="small" startIcon={<LockResetIcon />}
                        variant={showPwdFields ? 'contained' : 'outlined'}
                        onClick={() => setShowPwdFields(v => !v)}>
                        {showPwdFields ? 'Cancel Password Change' : 'Change Password'}
                    </Button>

                    {showPwdFields && (
                        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            <TextField size="small" label="New Password" type="password"
                                value={form.password} onChange={e => set('password', e.target.value)} />
                            <TextField size="small" label="Confirm Password" type="password"
                                value={form.confirm_password} onChange={e => set('confirm_password', e.target.value)} />
                        </Box>
                    )}
                </Paper>

                {/* Right — Details */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

                    {/* Personal Info */}
                    <Paper sx={{ p: 3, borderRadius: 2 }}>
                        <Typography variant="subtitle1" fontWeight={700} color="primary" mb={2}>Personal Information</Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            <TextField label="First Name" value={form.first_name}
                                onChange={e => set('first_name', e.target.value)} />
                            <TextField label="Last Name" value={form.last_name}
                                onChange={e => set('last_name', e.target.value)} />
                            <TextField label="Email" type="email" value={form.email}
                                onChange={e => set('email', e.target.value)} sx={{ gridColumn: 'span 2' }} />
                            <TextField label="Phone" value={form.phone}
                                onChange={e => set('phone', e.target.value)} />
                        </Box>
                    </Paper>

                    {/* Official Info */}
                    <Paper sx={{ p: 3, borderRadius: 2 }}>
                        <Typography variant="subtitle1" fontWeight={700} color="primary" mb={2}>Official Information</Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            <TextField label="Employee ID" value={form.employee_id}
                                onChange={e => set('employee_id', e.target.value)} />
                            <TextField label="Designation" value={form.designation}
                                onChange={e => set('designation', e.target.value)} />
                            <TextField label="Department" value={form.department}
                                onChange={e => set('department', e.target.value)} />
                            <TextField label="Date of Joining" type="date" value={form.date_of_joining}
                                onChange={e => set('date_of_joining', e.target.value)}
                                InputLabelProps={{ shrink: true }} />
                            <TextField label="Bio / About" value={form.bio}
                                onChange={e => set('bio', e.target.value)}
                                multiline rows={3} sx={{ gridColumn: 'span 2' }} />
                        </Box>
                    </Paper>

                </Box>
            </Box>
        </Box>
    );
}

export default ProfilePage;
