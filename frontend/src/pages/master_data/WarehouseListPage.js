// ============================================================
// FILE: pages/master_data/WarehouseListPage.js
// PURPOSE: Shows list of all warehouses.
//          User can add new warehouse and edit existing ones.
// ============================================================

import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper,
    IconButton
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { useNavigate } from 'react-router-dom';
import { useColumnResize } from '../../components/common/useColumnResize';

function WarehouseListPage() {
    const theme = useTheme();
    const navigate = useNavigate();
    const { widths, Resizer } = useColumnResize("warehouse_list", [100, 180, 150, 80]);
    const [warehouses, setWarehouses] = useState([]);

    useEffect(() => { fetchWarehouses(); }, []);

    const fetchWarehouses = async () => {
        const res = await fetch('/api/master-data/warehouses/', { credentials: 'include' });
        const data = await res.json();
        setWarehouses(data.warehouses || []);
    };

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" color="primary" mb={1}>Warehouses</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Manage stock storage locations
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/master-data/warehouses/add')}
                    sx={{ backgroundColor: 'primary.main' }}>Add Warehouse</Button>
            </Box>

            <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2 }}>
                <Table sx={{ tableLayout: "fixed" }}>
                    <TableHead sx={{ backgroundColor: 'primary.main' }}>
                        <TableRow>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',px:2,py:1 }} style={{ width: widths[0], backgroundColor: theme.palette.primary.main }}>Code<Resizer index={0} /></TableCell>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',px:2,py:1 }} style={{ width: widths[1], backgroundColor: theme.palette.primary.main }}>Warehouse Name<Resizer index={1} /></TableCell>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',px:2,py:1 }} style={{ width: widths[2], backgroundColor: theme.palette.primary.main }}>Address<Resizer index={2} /></TableCell>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',px:2,py:1 }} style={{ width: widths[3], backgroundColor: theme.palette.primary.main }}>Actions<Resizer index={3} /></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {warehouses.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                    No warehouses yet. Click "Add Warehouse" to create one.
                                </TableCell>
                            </TableRow>
                        ) : (
                            warehouses.map((w) => (
                                <TableRow key={w.id} hover>
                                    <TableCell><strong>{w.code}</strong></TableCell>
                                    <TableCell>{w.name}</TableCell>
                                    <TableCell>{w.address || '—'}</TableCell>
                                    <TableCell>
                                        <IconButton size="small" onClick={() => navigate(`/master-data/warehouses/edit/${w.id}`)} sx={{ color: 'primary.main' }}>
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

export default WarehouseListPage;
