// ============================================================
// FILE: pages/settings/CompanyMasterPage.js
// PURPOSE: Company Master — add, edit, delete companies.
//          The active (default) company's details are used in
//          all print headers: quotation, sales order, invoice.
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Button, TextField, Dialog, DialogTitle,
    DialogContent, DialogActions, IconButton, Chip, Divider,
    Card, CardContent, CardActions, Grid, MenuItem, Alert,
    Tooltip, CircularProgress,
} from '@mui/material';
import AddIcon        from '@mui/icons-material/Add';
import EditIcon       from '@mui/icons-material/Edit';
import DeleteIcon     from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BusinessIcon   from '@mui/icons-material/Business';
import StarIcon       from '@mui/icons-material/Star';

const API = '/api/master-data/settings/companies';

const INDIAN_STATES = [
    'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
    'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
    'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
    'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
    'Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
    'Andaman and Nicobar Islands','Chandigarh','Delhi',
    'Dadra and Nagar Haveli and Daman and Diu','Jammu and Kashmir',
    'Ladakh','Lakshadweep','Puducherry',
];

const EMPTY_FORM = {
    name:'', tagline:'', address_line1:'', address_line2:'',
    city:'', state:'', pincode:'', country:'India',
    phone:'', email:'', website:'',
    gstin:'', pan_number:'', state_code:'',
    contact_person:'', contact_phone:'', contact_email:'',
};

export default function CompanyMasterPage() {
    const [companies, setCompanies] = useState([]);
    const [loading,   setLoading]   = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editId,    setEditId]    = useState(null);
    const [form,      setForm]      = useState(EMPTY_FORM);
    const [saving,    setSaving]    = useState(false);
    const [alert,     setAlert]     = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const r = await fetch(`${API}/`);
            const data = await r.json();
            setCompanies(Array.isArray(data) ? data : []);
        } catch { setAlert({ type:'error', msg:'Failed to load companies.' }); }
        finally  { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const openAdd = () => {
        setEditId(null);
        setForm(EMPTY_FORM);
        setDialogOpen(true);
    };

    const openEdit = (c) => {
        setEditId(c.id);
        setForm({
            name:           c.name           || '',
            tagline:        c.tagline         || '',
            address_line1:  c.address_line1   || '',
            address_line2:  c.address_line2   || '',
            city:           c.city            || '',
            state:          c.state           || '',
            pincode:        c.pincode         || '',
            country:        c.country         || 'India',
            phone:          c.phone           || '',
            email:          c.email           || '',
            website:        c.website         || '',
            gstin:          c.gstin           || '',
            pan_number:     c.pan_number      || '',
            state_code:     c.state_code      || '',
            contact_person: c.contact_person  || '',
            contact_phone:  c.contact_phone   || '',
            contact_email:  c.contact_email   || '',
        });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) {
            setAlert({ type:'error', msg:'Company name is required.' });
            return;
        }
        setSaving(true);
        try {
            const url    = editId ? `${API}/${editId}/` : `${API}/create/`;
            const method = editId ? 'PUT' : 'POST';
            const r = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await r.json();
            if (!r.ok) throw new Error(data.message || 'Save failed');
            setAlert({ type:'success', msg: editId ? 'Company updated.' : 'Company added.' });
            setDialogOpen(false);
            load();
        } catch (e) {
            setAlert({ type:'error', msg: e.message });
        } finally { setSaving(false); }
    };

    const handleSetDefault = async (id) => {
        try {
            await fetch(`${API}/${id}/set-default/`, { method:'POST' });
            // Store in localStorage so printUtils can use it immediately
            const updated = companies.find(c => c.id === id);
            if (updated) localStorage.setItem('meitexz_active_company', JSON.stringify({ ...updated, is_default: true }));
            setAlert({ type:'success', msg:'Active company updated.' });
            load();
        } catch { setAlert({ type:'error', msg:'Failed to set active company.' }); }
    };

    const handleDelete = async (id) => {
        try {
            const r = await fetch(`${API}/${id}/delete/`, { method:'DELETE' });
            const data = await r.json();
            if (!r.ok) throw new Error(data.message);
            setAlert({ type:'success', msg:'Company deleted.' });
            setDeleteConfirm(null);
            load();
        } catch (e) {
            setAlert({ type:'error', msg: e.message });
            setDeleteConfirm(null);
        }
    };

    const fld = (key, label, props = {}) => (
        <TextField
            key={key} size="small" fullWidth label={label}
            value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
            {...props}
        />
    );

    return (
        <Box p={3} maxWidth={1100} mx="auto">
            {/* Header */}
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                <Box display="flex" alignItems="center" gap={1.5}>
                    <BusinessIcon sx={{ color:'primary.main', fontSize:28 }} />
                    <Box>
                        <Typography variant="h5" fontWeight={700}>Company Master</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Add your companies here. The active company's details appear on all prints — quotation, invoice, sales order.
                        </Typography>
                    </Box>
                </Box>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
                    Add Company
                </Button>
            </Box>

            {alert && (
                <Alert severity={alert.type} onClose={() => setAlert(null)} sx={{ mb:2 }}>
                    {alert.msg}
                </Alert>
            )}

            {/* Active company banner */}
            {companies.filter(c => c.is_default).map(c => (
                <Box key={c.id} sx={{ background:'linear-gradient(135deg,#0d1b2a,#0891b2)', borderRadius:2, p:2.5, mb:3, color:'white' }}>
                    <Typography fontSize={11} fontWeight={700} letterSpacing={1} sx={{ opacity:0.7, textTransform:'uppercase', mb:0.5 }}>
                        Active Company (used on all prints)
                    </Typography>
                    <Typography variant="h6" fontWeight={800}>{c.name}</Typography>
                    <Typography fontSize={13} sx={{ opacity:0.85 }}>
                        {[c.address_line1, c.city, c.state, c.pincode].filter(Boolean).join(', ')}
                        {c.gstin ? `  ·  GSTIN: ${c.gstin}` : ''}
                        {c.phone ? `  ·  ${c.phone}` : ''}
                    </Typography>
                </Box>
            ))}

            {loading ? (
                <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
            ) : companies.length === 0 ? (
                <Box textAlign="center" py={8} color="text.secondary">
                    <BusinessIcon sx={{ fontSize:56, opacity:0.2, mb:1 }} />
                    <Typography>No companies added yet. Click "Add Company" to start.</Typography>
                </Box>
            ) : (
                <Grid container spacing={2}>
                    {companies.map(c => (
                        <Grid item xs={12} md={6} key={c.id}>
                            <Card variant="outlined" sx={{
                                borderColor: c.is_default ? 'primary.main' : 'divider',
                                borderWidth: c.is_default ? 2 : 1,
                                position:'relative',
                            }}>
                                {c.is_default && (
                                    <Chip
                                        icon={<StarIcon fontSize="small" />}
                                        label="Active"
                                        size="small"
                                        color="primary"
                                        sx={{ position:'absolute', top:12, right:12 }}
                                    />
                                )}
                                <CardContent>
                                    <Typography variant="h6" fontWeight={700} pr={8}>{c.name}</Typography>
                                    {c.tagline && <Typography fontSize={12} color="text.secondary" mb={1}>{c.tagline}</Typography>}
                                    <Divider sx={{ my:1 }} />
                                    <Box display="grid" gridTemplateColumns="1fr 1fr" gap={0.5}>
                                        {c.address_line1 && <Typography fontSize={12} color="text.secondary" gridColumn="1/-1">{c.address_line1}{c.address_line2 ? ', ' + c.address_line2 : ''}</Typography>}
                                        {(c.city || c.state) && <Typography fontSize={12} color="text.secondary">{[c.city, c.state, c.pincode].filter(Boolean).join(', ')}</Typography>}
                                        {c.gstin && <Typography fontSize={12} color="text.secondary">GSTIN: {c.gstin}</Typography>}
                                        {c.phone && <Typography fontSize={12} color="text.secondary">📞 {c.phone}</Typography>}
                                        {c.email && <Typography fontSize={12} color="text.secondary">✉ {c.email}</Typography>}
                                        {c.contact_person && <Typography fontSize={12} color="text.secondary">Contact: {c.contact_person}{c.contact_phone ? ' · ' + c.contact_phone : ''}</Typography>}
                                    </Box>
                                </CardContent>
                                <CardActions sx={{ px:2, pb:2, pt:0, gap:1 }}>
                                    {!c.is_default && (
                                        <Button
                                            size="small" variant="outlined" color="primary"
                                            startIcon={<CheckCircleIcon />}
                                            onClick={() => handleSetDefault(c.id)}
                                        >
                                            Set as Active
                                        </Button>
                                    )}
                                    <Box sx={{ ml:'auto', display:'flex', gap:0.5 }}>
                                        <Tooltip title="Edit">
                                            <IconButton size="small" onClick={() => openEdit(c)}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        {!c.is_default && (
                                            <Tooltip title="Delete">
                                                <IconButton size="small" color="error" onClick={() => setDeleteConfirm(c)}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </Box>
                                </CardActions>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Add / Edit Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle fontWeight={700}>{editId ? 'Edit Company' : 'Add New Company'}</DialogTitle>
                <DialogContent>
                    <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2} mt={1}>
                        <TextField size="small" fullWidth label="Company Name *" value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            sx={{ gridColumn:'1/-1' }} />
                        {fld('tagline', 'Tagline / Business Type', { gridColumn:'1/-1',
                            placeholder:'e.g. Medical & Technical Textiles' })}

                        <Typography variant="subtitle2" fontWeight={700} color="text.secondary"
                            sx={{ gridColumn:'1/-1', mt:1 }}>Address</Typography>
                        {fld('address_line1', 'Address Line 1', { gridColumn:'1/-1' })}
                        {fld('address_line2', 'Address Line 2', { gridColumn:'1/-1' })}
                        {fld('city', 'City')}
                        <TextField size="small" select fullWidth label="State" value={form.state}
                            onChange={e => setForm(f => ({ ...f, state: e.target.value }))}>
                            <MenuItem value=""><em>Select State</em></MenuItem>
                            {INDIAN_STATES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                        </TextField>
                        {fld('pincode', 'Pincode')}
                        {fld('state_code', 'State Code (GST)', { placeholder:'e.g. 33' })}

                        <Typography variant="subtitle2" fontWeight={700} color="text.secondary"
                            sx={{ gridColumn:'1/-1', mt:1 }}>Contact</Typography>
                        {fld('phone', 'Phone / Mobile')}
                        {fld('email', 'Email', { type:'email' })}
                        {fld('website', 'Website', { placeholder:'www.yourcompany.com' })}

                        <Typography variant="subtitle2" fontWeight={700} color="text.secondary"
                            sx={{ gridColumn:'1/-1', mt:1 }}>Tax Details</Typography>
                        {fld('gstin', 'GSTIN', { placeholder:'33AABCS1234A1Z5' })}
                        {fld('pan_number', 'PAN Number')}

                        <Typography variant="subtitle2" fontWeight={700} color="text.secondary"
                            sx={{ gridColumn:'1/-1', mt:1 }}>Contact Person</Typography>
                        {fld('contact_person', 'Contact Person Name')}
                        {fld('contact_phone', 'Contact Person Phone')}
                        {fld('contact_email', 'Contact Person Email', { type:'email' })}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px:3, pb:2 }}>
                    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving…' : editId ? 'Save Changes' : 'Add Company'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirm */}
            <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
                <DialogTitle>Delete Company?</DialogTitle>
                <DialogContent>
                    <Typography>Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>? This cannot be undone.</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                    <Button variant="contained" color="error" onClick={() => handleDelete(deleteConfirm.id)}>Delete</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
