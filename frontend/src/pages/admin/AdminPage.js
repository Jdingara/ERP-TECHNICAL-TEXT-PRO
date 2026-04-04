// ============================================================
// FILE: pages/admin/AdminPage.js
// PURPOSE: Admin panel — manage users, roles, and page permissions.
//          Only accessible to staff/admin users.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Tabs, Tab, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Button, Dialog, DialogTitle,
    DialogContent, DialogActions, TextField, Chip, IconButton, Alert,
    FormControlLabel, Checkbox, Switch, MenuItem, Select, FormControl,
    InputLabel, Accordion, AccordionSummary, AccordionDetails,
    CircularProgress, Tooltip, Grid,
} from '@mui/material';
import AddIcon           from '@mui/icons-material/Add';
import EditIcon          from '@mui/icons-material/Edit';
import DeleteIcon        from '@mui/icons-material/Delete';
import ExpandMoreIcon    from '@mui/icons-material/ExpandMore';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import GroupIcon         from '@mui/icons-material/Group';
import TuneIcon          from '@mui/icons-material/Tune';

const API = '/api/authentication';

// ── All pages grouped by module ───────────────────────────────
const ALL_PAGES = [
    { group: 'Master Data', color: '#06b6d4', pages: [
        { label: 'Items / Products',  path: '/master-data/items' },
        { label: 'Suppliers',         path: '/master-data/suppliers' },
        { label: 'Customers',         path: '/master-data/customers' },
        { label: 'Warehouses',        path: '/master-data/warehouses' },
    ]},
    { group: 'Inventory', color: '#3b82f6', pages: [
        { label: 'Stock List',        path: '/inventory/stock-list' },
        { label: 'Stock Movement',    path: '/inventory/stock-movement' },
    ]},
    { group: 'Purchasing', color: '#10b981', pages: [
        { label: 'Purchase Orders',       path: '/purchasing/purchase-orders' },
        { label: 'Create Purchase Order', path: '/purchasing/create-purchase-order' },
        { label: 'Goods Receipt (GRN)',   path: '/purchasing/goods-receipt' },
    ]},
    { group: 'Sales', color: '#f59e0b', pages: [
        { label: 'Customer Inquiries', path: '/sales/inquiries' },
        { label: 'Quotations',         path: '/sales/quotations' },
        { label: 'Order Journey',      path: '/sales/order-journey' },
        { label: 'Sales Orders',       path: '/sales/sales-orders' },
        { label: 'Create Sales Order', path: '/sales/create-sales-order' },
    ]},
    { group: 'Finance', color: '#ef4444', pages: [
        { label: 'Chart of Accounts', path: '/finance/chart-of-accounts' },
        { label: 'Journal Entries',   path: '/finance/journal-entries' },
        { label: 'Trial Balance',     path: '/finance/trial-balance' },
    ]},
    { group: 'HR & Payroll', color: '#8b5cf6', pages: [
        { label: 'Employees',  path: '/hr-payroll/employees' },
        { label: 'Attendance', path: '/hr-payroll/attendance' },
        { label: 'Salary',     path: '/hr-payroll/salary' },
    ]},
    { group: 'Production', color: '#f97316', pages: [
        { label: 'Bill of Materials', path: '/production/bill-of-materials' },
        { label: 'Work Orders',       path: '/production/work-orders' },
        { label: 'Create Work Order', path: '/production/create-work-order' },
        { label: 'Machines',          path: '/production/machines' },
        { label: 'Quality Checks',    path: '/production/quality-checks' },
        { label: 'Batch List',        path: '/production/batches' },
    ]},
    { group: 'Technical Textile', color: '#14b8a6', pages: [
        { label: 'Product Categories',  path: '/technical-textile/product-categories' },
        { label: 'Performance Specs',   path: '/technical-textile/performance-specs' },
        { label: 'Sample Management',   path: '/technical-textile/samples' },
        { label: 'Technical Data Sheet',path: '/technical-textile/data-sheets' },
        { label: 'Testing Lab',         path: '/technical-textile/testing-lab' },
        { label: 'R&D Projects',        path: '/technical-textile/rd-projects' },
    ]},
    { group: 'Medical Textile', color: '#ec4899', pages: [
        { label: 'Regulatory Compliance', path: '/medical-textile/compliance' },
        { label: 'Batch Traceability',    path: '/medical-textile/batch-traceability' },
        { label: 'Sterility Records',     path: '/medical-textile/sterility' },
        { label: 'CAPA Management',       path: '/medical-textile/capa' },
        { label: 'Audit Trail',           path: '/medical-textile/audit-trail' },
        { label: 'Shelf Life Tracking',   path: '/medical-textile/shelf-life' },
    ]},
    { group: 'Reports', color: '#a78bfa', pages: [
        { label: 'Production Report', path: '/reports/production' },
        { label: 'Inventory Report',  path: '/reports/inventory' },
        { label: 'Sales Report',      path: '/reports/sales' },
        { label: 'Finance Report',    path: '/reports/finance' },
        { label: 'HR Report',         path: '/reports/hr' },
    ]},
];

// ── helpers ──────────────────────────────────────────────────
async function apiFetch(url, options = {}) {
    const res = await fetch(url, { credentials: 'include', ...options });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
}

// ── Page permission checklist ─────────────────────────────────
function PageChecklist({ selected, onChange }) {
    const toggle = (path) => {
        const next = selected.includes(path)
            ? selected.filter(p => p !== path)
            : [...selected, path];
        onChange(next);
    };
    const toggleGroup = (pages) => {
        const paths   = pages.map(p => p.path);
        const allOn   = paths.every(p => selected.includes(p));
        const next    = allOn
            ? selected.filter(p => !paths.includes(p))
            : [...new Set([...selected, ...paths])];
        onChange(next);
    };

    return (
        <Box>
            {ALL_PAGES.map(group => {
                const paths  = group.pages.map(p => p.path);
                const allOn  = paths.every(p => selected.includes(p));
                const someOn = paths.some(p => selected.includes(p));
                return (
                    <Accordion key={group.group} defaultExpanded disableGutters
                        sx={{ mb: 1, border: `1px solid ${group.color}30`, borderRadius: '8px !important', '&:before': { display: 'none' } }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}
                            sx={{ backgroundColor: group.color + '12', borderRadius: 2 }}>
                            <FormControlLabel
                                onClick={e => e.stopPropagation()}
                                control={
                                    <Checkbox
                                        checked={allOn}
                                        indeterminate={someOn && !allOn}
                                        onChange={() => toggleGroup(group.pages)}
                                        sx={{ color: group.color, '&.Mui-checked': { color: group.color } }}
                                    />
                                }
                                label={
                                    <Typography fontWeight={600} fontSize={13.5} color={group.color}>
                                        {group.group}
                                        <Chip label={`${paths.filter(p => selected.includes(p)).length}/${paths.length}`}
                                            size="small" sx={{ ml: 1, height: 18, fontSize: 11,
                                                backgroundColor: group.color + '20', color: group.color }} />
                                    </Typography>
                                }
                            />
                        </AccordionSummary>
                        <AccordionDetails sx={{ pt: 0 }}>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0 }}>
                                {group.pages.map(page => (
                                    <FormControlLabel key={page.path}
                                        sx={{ width: '50%', m: 0, py: 0.3 }}
                                        control={
                                            <Checkbox size="small"
                                                checked={selected.includes(page.path)}
                                                onChange={() => toggle(page.path)}
                                                sx={{ '&.Mui-checked': { color: group.color } }}
                                            />
                                        }
                                        label={<Typography fontSize={13}>{page.label}</Typography>}
                                    />
                                ))}
                            </Box>
                        </AccordionDetails>
                    </Accordion>
                );
            })}
        </Box>
    );
}

// ── Roles Tab ────────────────────────────────────────────────
function RolesTab() {
    const [roles,   setRoles]   = useState([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');
    const [dialog,  setDialog]  = useState(null); // null | 'create' | role object
    const [form,    setForm]    = useState({ name: '', description: '', allowed_pages: [] });
    const [saving,  setSaving]  = useState(false);
    const [msg,     setMsg]     = useState('');

    const fetchRoles = useCallback(async () => {
        try {
            const data = await apiFetch(`${API}/roles/`);
            setRoles(data);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchRoles(); }, [fetchRoles]);

    const openCreate = () => {
        setForm({ name: '', description: '', allowed_pages: [] });
        setDialog('create');
    };
    const openEdit = (role) => {
        setForm({ name: role.name, description: role.description, allowed_pages: role.allowed_pages });
        setDialog(role);
    };
    const closeDialog = () => { setDialog(null); setMsg(''); };

    const save = async () => {
        setSaving(true);
        setMsg('');
        try {
            if (dialog === 'create') {
                await apiFetch(`${API}/roles/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(form),
                });
            } else {
                await apiFetch(`${API}/roles/${dialog.id}/`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(form),
                });
            }
            closeDialog();
            fetchRoles();
        } catch (e) {
            setMsg(e.message);
        } finally {
            setSaving(false);
        }
    };

    const deleteRole = async (role) => {
        if (!window.confirm(`Delete role "${role.name}"? This cannot be undone.`)) return;
        try {
            await apiFetch(`${API}/roles/${role.id}/`, { method: 'DELETE' });
            fetchRoles();
        } catch (e) {
            alert(e.message);
        }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    if (error)   return <Alert severity="error">{error}</Alert>;

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                    Create custom roles and define exactly which pages each role can access.
                </Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
                    New Role
                </Button>
            </Box>

            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell><strong>Role Name</strong></TableCell>
                            <TableCell><strong>Description</strong></TableCell>
                            <TableCell align="center"><strong>Pages Allowed</strong></TableCell>
                            <TableCell align="center"><strong>Users</strong></TableCell>
                            <TableCell align="center"><strong>Actions</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {roles.length === 0 ? (
                            <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                No roles created yet. Create your first role.
                            </TableCell></TableRow>
                        ) : roles.map(role => (
                            <TableRow key={role.id} hover>
                                <TableCell><strong>{role.name}</strong></TableCell>
                                <TableCell>{role.description || '—'}</TableCell>
                                <TableCell align="center">
                                    <Chip label={`${role.allowed_pages.length} pages`}
                                        size="small" color="primary" variant="outlined" />
                                </TableCell>
                                <TableCell align="center">{role.user_count}</TableCell>
                                <TableCell align="center">
                                    <Tooltip title="Edit role & permissions">
                                        <IconButton size="small" onClick={() => openEdit(role)}>
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Delete role">
                                        <IconButton size="small" color="error" onClick={() => deleteRole(role)}>
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Create / Edit Dialog */}
            <Dialog open={Boolean(dialog)} onClose={closeDialog} maxWidth="md" fullWidth>
                <DialogTitle>
                    {dialog === 'create' ? 'Create New Role' : `Edit Role: ${dialog?.name}`}
                </DialogTitle>
                <DialogContent dividers>
                    {msg && <Alert severity="error" sx={{ mb: 2 }}>{msg}</Alert>}
                    <TextField fullWidth label="Role Name" value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        sx={{ mb: 2 }} required />
                    <TextField fullWidth label="Description (optional)" value={form.description}
                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                        sx={{ mb: 3 }} />
                    <Typography fontWeight={600} mb={1.5}>
                        Page Access — select which pages this role can see
                    </Typography>
                    <PageChecklist
                        selected={form.allowed_pages}
                        onChange={pages => setForm(f => ({ ...f, allowed_pages: pages }))}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                        {form.allowed_pages.length} pages selected
                    </Typography>
                    <Button onClick={closeDialog}>Cancel</Button>
                    <Button variant="contained" onClick={save} disabled={saving || !form.name}>
                        {saving ? <CircularProgress size={18} /> : 'Save Role'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

// ── Users Tab ─────────────────────────────────────────────────
function UsersTab() {
    const [users,   setUsers]   = useState([]);
    const [roles,   setRoles]   = useState([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');
    const [dialog,  setDialog]  = useState(null); // null | 'create' | user obj
    const [form,    setForm]    = useState({
        username: '', password: '', email: '', first_name: '', last_name: '',
        is_staff: false, is_active: true, role_id: '',
    });
    const [saving, setSaving] = useState(false);
    const [msg,    setMsg]    = useState('');

    const fetchAll = useCallback(async () => {
        try {
            const [u, r] = await Promise.all([
                apiFetch(`${API}/users/`),
                apiFetch(`${API}/roles/`),
            ]);
            setUsers(u);
            setRoles(r);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const openCreate = () => {
        setForm({ username: '', password: '', email: '', first_name: '', last_name: '',
            is_staff: false, is_active: true, role_id: '' });
        setDialog('create');
    };
    const openEdit = (user) => {
        setForm({
            username: user.username, password: '', email: user.email,
            first_name: user.first_name, last_name: user.last_name,
            is_staff: user.is_staff, is_active: user.is_active,
            role_id: user.role?.id || '',
        });
        setDialog(user);
    };
    const closeDialog = () => { setDialog(null); setMsg(''); };

    const save = async () => {
        setSaving(true);
        setMsg('');
        try {
            const body = { ...form, role_id: form.role_id || null };
            if (dialog === 'create') {
                await apiFetch(`${API}/users/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
            } else {
                if (!body.password) delete body.password;
                await apiFetch(`${API}/users/${dialog.id}/`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
            }
            closeDialog();
            fetchAll();
        } catch (e) {
            setMsg(e.message);
        } finally {
            setSaving(false);
        }
    };

    const deleteUser = async (user) => {
        if (!window.confirm(`Delete user "${user.username}"?`)) return;
        try {
            await apiFetch(`${API}/users/${user.id}/`, { method: 'DELETE' });
            fetchAll();
        } catch (e) {
            alert(e.message);
        }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    if (error)   return <Alert severity="error">{error}</Alert>;

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                    Create users and assign them a role. Staff users have full access regardless of role.
                </Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
                    New User
                </Button>
            </Box>

            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell><strong>Username</strong></TableCell>
                            <TableCell><strong>Full Name</strong></TableCell>
                            <TableCell><strong>Email</strong></TableCell>
                            <TableCell><strong>Role</strong></TableCell>
                            <TableCell align="center"><strong>Admin</strong></TableCell>
                            <TableCell align="center"><strong>Active</strong></TableCell>
                            <TableCell><strong>Joined</strong></TableCell>
                            <TableCell align="center"><strong>Actions</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {users.map(u => (
                            <TableRow key={u.id} hover>
                                <TableCell><strong>{u.username}</strong></TableCell>
                                <TableCell>{[u.first_name, u.last_name].filter(Boolean).join(' ') || '—'}</TableCell>
                                <TableCell>{u.email || '—'}</TableCell>
                                <TableCell>
                                    {u.is_staff
                                        ? <Chip label="Administrator" size="small" color="error" />
                                        : u.role
                                            ? <Chip label={u.role.name} size="small" color="primary" variant="outlined" />
                                            : <Chip label="No Role" size="small" color="warning" variant="outlined" />
                                    }
                                </TableCell>
                                <TableCell align="center">
                                    {u.is_staff ? <Chip label="Yes" size="small" color="error" /> : '—'}
                                </TableCell>
                                <TableCell align="center">
                                    <Chip label={u.is_active ? 'Active' : 'Inactive'}
                                        size="small"
                                        color={u.is_active ? 'success' : 'default'} />
                                </TableCell>
                                <TableCell>{u.date_joined}</TableCell>
                                <TableCell align="center">
                                    <Tooltip title="Edit user">
                                        <IconButton size="small" onClick={() => openEdit(u)}>
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Delete user">
                                        <IconButton size="small" color="error" onClick={() => deleteUser(u)}>
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Create / Edit User Dialog */}
            <Dialog open={Boolean(dialog)} onClose={closeDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {dialog === 'create' ? 'Create New User' : `Edit User: ${dialog?.username}`}
                </DialogTitle>
                <DialogContent dividers>
                    {msg && <Alert severity="error" sx={{ mb: 2 }}>{msg}</Alert>}
                    <Grid container spacing={2}>
                        <Grid item xs={6}>
                            <TextField fullWidth label="First Name" value={form.first_name}
                                onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField fullWidth label="Last Name" value={form.last_name}
                                onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth label="Username" value={form.username} required
                                disabled={dialog !== 'create'}
                                onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth label="Email" type="email" value={form.email}
                                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth
                                label={dialog === 'create' ? 'Password' : 'New Password (leave blank to keep current)'}
                                type="password" value={form.password} required={dialog === 'create'}
                                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>Assign Role</InputLabel>
                                <Select value={form.role_id} label="Assign Role"
                                    onChange={e => setForm(f => ({ ...f, role_id: e.target.value }))}>
                                    <MenuItem value="">— No Role —</MenuItem>
                                    {roles.map(r => (
                                        <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={6}>
                            <FormControlLabel
                                control={<Switch checked={form.is_staff}
                                    onChange={e => setForm(f => ({ ...f, is_staff: e.target.checked }))} />}
                                label="Admin (full access)" />
                        </Grid>
                        <Grid item xs={6}>
                            <FormControlLabel
                                control={<Switch checked={form.is_active}
                                    onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />}
                                label="Account Active" />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={closeDialog}>Cancel</Button>
                    <Button variant="contained" onClick={save}
                        disabled={saving || !form.username || (dialog === 'create' && !form.password)}>
                        {saving ? <CircularProgress size={18} /> : (dialog === 'create' ? 'Create User' : 'Save Changes')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}


// ── Main Admin Page ───────────────────────────────────────────
function AdminPage({ currentUser }) {
    const [tab, setTab] = useState(0);

    if (!currentUser?.is_staff) {
        return (
            <Alert severity="error" sx={{ mt: 2 }}>
                Access denied. This page is only available to administrators.
            </Alert>
        );
    }

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <AdminPanelSettingsIcon sx={{ color: '#6366f1', fontSize: 28 }} />
                <Box>
                    <Typography variant="h5" fontWeight={700}>Admin Panel</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Manage users, roles, and page permissions
                    </Typography>
                </Box>
            </Box>

            <Paper sx={{ borderRadius: 2 }}>
                <Tabs value={tab} onChange={(_, v) => setTab(v)}
                    sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 2 }}>
                    <Tab icon={<GroupIcon />} iconPosition="start" label="Users" />
                    <Tab icon={<TuneIcon />}  iconPosition="start" label="Roles & Permissions" />
                </Tabs>

                <Box sx={{ p: 3 }}>
                    {tab === 0 && <UsersTab />}
                    {tab === 1 && <RolesTab />}
                </Box>
            </Paper>
        </Box>
    );
}

export default AdminPage;
