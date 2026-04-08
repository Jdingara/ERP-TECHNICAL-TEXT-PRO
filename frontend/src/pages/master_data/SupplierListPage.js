// ============================================================
// FILE: pages/master_data/SupplierListPage.js
// PURPOSE: Shows list of all suppliers.
//          User can search, add new supplier, edit details.
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

function SupplierListPage() {
    const theme = useTheme();
    const navigate = useNavigate();
    const { widths, Resizer } = useColumnResize("supplier_list", [100, 180, 150, 150, 150, 150, 150, 150, 80]);
    const [suppliers, setSuppliers]   = useState([]);
    const [searchText, setSearchText] = useState('');

    useEffect(() => { fetchSuppliers(); }, []);

    const fetchSuppliers = async (search = '') => {
        const res = await fetch(`/api/master-data/suppliers/?search=${search}`, { credentials: 'include' });
        const data = await res.json();
        setSuppliers(data.suppliers || []);
    };

    const handleSearch = (e) => { setSearchText(e.target.value); fetchSuppliers(e.target.value); };

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" color="primary" mb={1}>Suppliers</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Manage all raw material and spare parts suppliers
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <TextField placeholder="Search suppliers..." value={searchText}
                    onChange={handleSearch} size="small" sx={{ width: 350 }} />
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/master-data/suppliers/add')}
                    sx={{ backgroundColor: 'primary.main' }}>Add Supplier</Button>
            </Box>

            <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2 }}>
                <Table sx={{ tableLayout: "fixed" }}>
                    <TableHead sx={{ backgroundColor: 'primary.main' }}>
                        <TableRow>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',px:2,py:1 }} style={{ width: widths[0], backgroundColor: theme.palette.primary.main }}>Code<Resizer index={0} /></TableCell>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',px:2,py:1 }} style={{ width: widths[1], backgroundColor: theme.palette.primary.main }}>Supplier Name<Resizer index={1} /></TableCell>
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
                        {suppliers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                    No suppliers found. Click "Add Supplier" to create one.
                                </TableCell>
                            </TableRow>
                        ) : (
                            suppliers.map((s) => (
                                <TableRow key={s.id} hover>
                                    <TableCell><strong>{s.supplier_code}</strong></TableCell>
                                    <TableCell>{s.supplier_name}</TableCell>
                                    <TableCell>
                                        <Chip label={s.supplier_type.replace('_', ' ')} size="small" variant="outlined" color="success" />
                                    </TableCell>
                                    <TableCell>{s.contact_person}</TableCell>
                                    <TableCell>{s.phone}</TableCell>
                                    <TableCell>{s.city}</TableCell>
                                    <TableCell>{s.gstin || '—'}</TableCell>
                                    <TableCell>{s.payment_days} days</TableCell>
                                    <TableCell>
                                        <IconButton size="small" onClick={() => navigate(`/master-data/suppliers/edit/${s.id}`)} sx={{ color: 'primary.main' }}>
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

export default SupplierListPage;
