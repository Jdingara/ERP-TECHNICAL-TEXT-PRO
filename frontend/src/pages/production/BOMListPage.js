// ============================================================
// FILE: pages/production/BOMListPage.js
// PURPOSE: Bill of Materials - recipe for making each product.
//          Shows finished product + all raw materials needed.
//          Includes waste percentage (critical for spinning).
// ============================================================

import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, Chip,
    Dialog, DialogTitle, DialogContent, DialogActions,
    IconButton
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useColumnResize } from '../../components/common/useColumnResize';

function BOMListPage() {
    const theme = useTheme();
    const navigate = useNavigate();
    const { widths, Resizer } = useColumnResize("bom_list", [100, 180, 150, 150, 150, 150, 150, 150, 150, 150, 150, 150, 150, 150, 80]);
    const [boms, setBoms]               = useState([]);
    const [viewDialog, setViewDialog]   = useState(false);
    const [selectedBom, setSelectedBom] = useState(null);

    useEffect(() => { fetchBoms(); }, []);

    const fetchBoms = async () => {
        const res = await fetch('/api/production/bom/', { credentials: 'include' });
        const data = await res.json();
        setBoms(data.boms || []);
    };

    const handleViewBom = async (bomId) => {
        const res = await fetch(`/api/production/bom/${bomId}/`, { credentials: 'include' });
        const data = await res.json();
        setSelectedBom(data.bom);
        setViewDialog(true);
    };

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" color="primary" mb={1}>Bill of Materials</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Recipe for each product — what raw materials are needed and how much
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button variant="contained" startIcon={<AddIcon />}
                    onClick={() => navigate('/production/bill-of-materials/new')}
                    sx={{ backgroundColor: 'primary.main' }}>
                    Create BOM
                </Button>
            </Box>

            <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2 }}>
                <Table sx={{ tableLayout: "fixed" }}>
                    <TableHead sx={{ backgroundColor: 'primary.main' }}>
                        <TableRow>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',px:2,py:1 }} style={{ width: widths[0], backgroundColor: theme.palette.primary.main }}>BOM Name<Resizer index={0} /></TableCell>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',px:2,py:1 }} style={{ width: widths[1], backgroundColor: theme.palette.primary.main }}>Finished Product<Resizer index={1} /></TableCell>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',px:2,py:1 }} style={{ width: widths[2], backgroundColor: theme.palette.primary.main }}>Qty Produced<Resizer index={2} /></TableCell>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',px:2,py:1 }} style={{ width: widths[3], backgroundColor: theme.palette.primary.main }}>Status<Resizer index={3} /></TableCell>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',px:2,py:1 }} style={{ width: widths[4], backgroundColor: theme.palette.primary.main }}>Actions<Resizer index={4} /></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {boms.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                    No BOMs yet. Click "Create BOM" to define your production recipes.
                                </TableCell>
                            </TableRow>
                        ) : boms.map((b) => (
                            <TableRow key={b.id} hover>
                                <TableCell><strong>{b.bom_name}</strong></TableCell>
                                <TableCell>{b.finished_product_code} — {b.finished_product}</TableCell>
                                <TableCell>{b.quantity_produced}</TableCell>
                                <TableCell><Chip label={b.status} size="small" color={b.status === 'active' ? 'success' : 'default'} /></TableCell>
                                <TableCell>
                                    <IconButton size="small" sx={{ color: 'primary.main' }} onClick={() => handleViewBom(b.id)}>
                                        <VisibilityIcon fontSize="small" />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* View BOM Dialog — kept intact */}
            {selectedBom && (
                <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="md" fullWidth>
                    <DialogTitle sx={{ color: 'white' }}>
                        BOM: {selectedBom.bom_name}
                    </DialogTitle>
                    <DialogContent sx={{ pt: 3 }}>
                        <Typography variant="body1" mb={2}>
                            <strong>Finished Product:</strong> {selectedBom.finished_product_code} — {selectedBom.finished_product}<br />
                            <strong>Quantity Produced:</strong> {selectedBom.quantity_produced}
                        </Typography>
                        <Table size="small">
                            <TableHead sx={{ backgroundColor: 'action.hover' }}>
                                <TableRow>
                                    <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',px:2,py:1 }} style={{ width: widths[10], backgroundColor: theme.palette.primary.main }}>Raw Material<Resizer index={10} /></TableCell>
                                    <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',px:2,py:1 }} style={{ width: widths[11], backgroundColor: theme.palette.primary.main }}>Quantity<Resizer index={11} /></TableCell>
                                    <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',px:2,py:1 }} style={{ width: widths[12], backgroundColor: theme.palette.primary.main }}>Waste %<Resizer index={12} /></TableCell>
                                    <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',px:2,py:1 }} style={{ width: widths[13], backgroundColor: theme.palette.primary.main }}>Qty incl. Waste<Resizer index={13} /></TableCell>
                                    <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',px:2,py:1 }} style={{ width: widths[14], backgroundColor: theme.palette.primary.main }}>Unit<Resizer index={14} /></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {selectedBom.lines?.map((line, i) => (
                                    <TableRow key={i}>
                                        <TableCell>{line.raw_material_code} — {line.raw_material_name}</TableCell>
                                        <TableCell>{line.quantity}</TableCell>
                                        <TableCell>{line.waste_percent}%</TableCell>
                                        <TableCell><strong style={{ color: '#e65100' }}>{line.quantity_with_waste}</strong></TableCell>
                                        <TableCell>{line.unit}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setViewDialog(false)}>Close</Button>
                    </DialogActions>
                </Dialog>
            )}
        </Box>
    );
}

export default BOMListPage;
