// ============================================================
// FILE: pages/master_data/CustomerListPage.js
// PURPOSE: Shows list of all customers.
//          User can search, add new customer, edit details.
// ============================================================

import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, TextField, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper,
    Chip, IconButton
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { useNavigate } from 'react-router-dom';
import { useColumnResize } from '../../components/common/useColumnResize';

function CustomerListPage() {
    const theme = useTheme();
    const navigate = useNavigate();
    const { widths, Resizer } = useColumnResize("customer_list", [100, 180, 150, 150, 150, 150, 150, 150, 80]);
    const [customers, setCustomers]   = useState([]);
    const [searchText, setSearchText] = useState('');

    useEffect(() => { fetchCustomers(); }, []);

    const fetchCustomers = async (search = '') => {
        const res = await fetch(`/api/master-data/customers/?search=${search}`, { credentials: 'include' });
        const data = await res.json();
        setCustomers(data.customers || []);
    };

    const handleSearch = (e) => { setSearchText(e.target.value); fetchCustomers(e.target.value); };

    const getTypeColor = (type) => type === 'export' ? 'warning' : type === 'both' ? 'success' : 'primary';

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" color="primary" mb={1}>Customers</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Manage all domestic and export customers
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <TextField placeholder="Search customers..." value={searchText}
                    onChange={handleSearch} size="small" sx={{ width: 350 }} />
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/master-data/customers/add')}
                    sx={{ backgroundColor: 'primary.main' }}>Add Customer</Button>
            </Box>

            <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2 }}>
                <Table sx={{ tableLayout: "fixed" }}>
                    <TableHead sx={{ backgroundColor: 'primary.main' }}>
                        <TableRow>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',px:2,py:1 }} style={{ width: widths[0], backgroundColor: theme.palette.primary.main }}>Code<Resizer index={0} /></TableCell>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',px:2,py:1 }} style={{ width: widths[1], backgroundColor: theme.palette.primary.main }}>Customer Name<Resizer index={1} /></TableCell>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',px:2,py:1 }} style={{ width: widths[2], backgroundColor: theme.palette.primary.main }}>Type<Resizer index={2} /></TableCell>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',px:2,py:1 }} style={{ width: widths[3], backgroundColor: theme.palette.primary.main }}>Contact<Resizer index={3} /></TableCell>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',px:2,py:1 }} style={{ width: widths[4], backgroundColor: theme.palette.primary.main }}>Phone<Resizer index={4} /></TableCell>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',px:2,py:1 }} style={{ width: widths[5], backgroundColor: theme.palette.primary.main }}>City<Resizer index={5} /></TableCell>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',px:2,py:1 }} style={{ width: widths[6], backgroundColor: theme.palette.primary.main }}>GSTIN<Resizer index={6} /></TableCell>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',px:2,py:1 }} style={{ width: widths[7], backgroundColor: theme.palette.primary.main }}>Credit Days<Resizer index={7} /></TableCell>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',px:2,py:1 }} style={{ width: widths[8], backgroundColor: theme.palette.primary.main }}>Actions<Resizer index={8} /></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {customers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                    No customers found. Click "Add Customer" to create one.
                                </TableCell>
                            </TableRow>
                        ) : (
                            customers.map((c) => (
                                <TableRow key={c.id} hover>
                                    <TableCell><strong>{c.customer_code}</strong></TableCell>
                                    <TableCell>{c.customer_name}</TableCell>
                                    <TableCell>
                                        <Chip label={c.customer_type} size="small"
                                            color={getTypeColor(c.customer_type)} variant="outlined" />
                                    </TableCell>
                                    <TableCell>{c.contact_person}</TableCell>
                                    <TableCell>{c.phone}</TableCell>
                                    <TableCell>{c.city}</TableCell>
                                    <TableCell>{c.gstin || '—'}</TableCell>
                                    <TableCell>{c.credit_days} days</TableCell>
                                    <TableCell>
                                        <IconButton size="small" onClick={() => navigate(`/master-data/customers/edit/${c.id}`)} sx={{ color: 'primary.main' }}>
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}

export default CustomerListPage;
