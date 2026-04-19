// ============================================================
// FILE: pages/dispatch/DeliveryChallanPage.js
// PURPOSE: Delivery Challan list + create + printable view
// ============================================================

import { useState, useEffect, useCallback } from 'react';

const API = 'http://localhost:8000/api';
const STATUS_COLORS = { draft: '#f59e0b', issued: '#3b82f6', returned: '#ef4444', converted: '#10b981' };

function PrintableChallан({ dc, dispatches, onClose }) {
    const dispatch = dispatches.find(d => d.id === dc.dispatch_entry_id);
    return (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ backgroundColor: '#fff', color: '#000', borderRadius: 8, width: '100%', maxWidth: 760, maxHeight: '90vh', overflowY: 'auto', padding: 32 }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, borderBottom: '2px solid #000', paddingBottom: 16 }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#1e293b' }}>MEI TEXZ</h1>
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#475569' }}>Technical Textile Manufacturer</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <h2 style={{ margin: 0, fontSize: 20, color: '#1e293b', fontWeight: 700 }}>DELIVERY CHALLAN</h2>
                        <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 600 }}>DC No: {dc.dc_number}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 12 }}>Date: {dc.dc_date}</p>
                    </div>
                </div>

                {/* Parties */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 20 }}>
                    <div style={{ padding: 12, border: '1px solid #e2e8f0', borderRadius: 6 }}>
                        <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Consignee</p>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{dc.customer_name}</p>
                        {dc.delivery_address && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#475569', whiteSpace: 'pre-line' }}>{dc.delivery_address}</p>}
                    </div>
                    <div style={{ padding: 12, border: '1px solid #e2e8f0', borderRadius: 6 }}>
                        <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Transport Details</p>
                        {[['Vehicle No', dc.vehicle_number], ['Driver', dc.driver_name], ['LR Number', dc.lr_number], ['Transporter', dc.transporter], ['E-Way Bill', dc.eway_bill]].map(([k, v]) => v ? (
                            <div key={k} style={{ display: 'flex', gap: 8, marginBottom: 3 }}>
                                <span style={{ fontSize: 12, color: '#64748b', minWidth: 80 }}>{k}:</span>
                                <span style={{ fontSize: 12, fontWeight: 600 }}>{v}</span>
                            </div>
                        ) : null)}
                    </div>
                </div>

                {/* Dispatch Reference */}
                {dispatch && (
                    <div style={{ marginBottom: 16, padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: 6, fontSize: 12 }}>
                        <span style={{ color: '#64748b' }}>Dispatch Ref: </span>
                        <span style={{ fontWeight: 600 }}>{dispatch.dispatch_number}</span>
                        <span style={{ color: '#64748b', marginLeft: 16 }}>SO Ref: </span>
                        <span style={{ fontWeight: 600 }}>{dispatch.so_number || '—'}</span>
                    </div>
                )}

                {/* Items Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
                    <thead>
                        <tr style={{ backgroundColor: '#1e293b' }}>
                            {['#', 'Description', 'Batch No', 'Rolls', 'Quantity (m)', 'Remarks'].map(h => (
                                <th key={h} style={{ padding: '8px 12px', color: '#fff', fontSize: 12, textAlign: 'left', fontWeight: 600 }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {dispatch?.lines?.length > 0
                            ? dispatch.lines.map((line, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '8px 12px', fontSize: 12 }}>{i + 1}</td>
                                    <td style={{ padding: '8px 12px', fontSize: 12 }}>{line.product_name}</td>
                                    <td style={{ padding: '8px 12px', fontSize: 12 }}>{line.batch_number}</td>
                                    <td style={{ padding: '8px 12px', fontSize: 12, textAlign: 'center' }}>{line.rolls}</td>
                                    <td style={{ padding: '8px 12px', fontSize: 12, textAlign: 'right', fontWeight: 600 }}>{parseFloat(line.quantity).toFixed(2)}</td>
                                    <td style={{ padding: '8px 12px', fontSize: 12 }}>{line.notes}</td>
                                </tr>
                            ))
                            : (
                                <tr>
                                    <td colSpan={6} style={{ padding: '16px 12px', fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                                        Items will be pulled from the linked Dispatch Entry
                                    </td>
                                </tr>
                            )
                        }
                    </tbody>
                </table>

                {/* Remarks */}
                {dc.remarks && (
                    <div style={{ marginBottom: 24, padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: 6 }}>
                        <p style={{ margin: 0, fontSize: 12 }}><strong>Remarks:</strong> {dc.remarks}</p>
                    </div>
                )}

                {/* Signatures */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, marginTop: 48 }}>
                    {['Prepared By', 'Authorised By', 'Received By (Customer Stamp)'].map(label => (
                        <div key={label} style={{ textAlign: 'center' }}>
                            <div style={{ borderTop: '1px solid #000', paddingTop: 6 }}>
                                <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>{label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
                    <button onClick={onClose} style={{ padding: '8px 20px', borderRadius: 6, border: '1px solid #334155', backgroundColor: 'transparent', color: '#334155', cursor: 'pointer', fontSize: 13 }}>Close</button>
                    <button onClick={() => window.print()} style={{ padding: '8px 24px', borderRadius: 6, border: 'none', backgroundColor: '#1e293b', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Print</button>
                </div>
            </div>
        </div>
    );
}

function DeliveryChallanPage() {
    const [challans, setChallans]     = useState([]);
    const [dispatches, setDispatches] = useState([]);
    const [showForm, setShowForm]     = useState(false);
    const [printDC, setPrintDC]       = useState(null);
    const [loading, setLoading]       = useState(false);
    const [msg, setMsg]               = useState('');

    const blankForm = {
        dispatch_entry_id: '', dc_date: new Date().toISOString().slice(0, 10),
        vehicle_number: '', driver_name: '', lr_number: '', transporter: '',
        eway_bill: '', delivery_address: '', remarks: '',
    };
    const [form, setForm] = useState(blankForm);

    const load = useCallback(() => {
        fetch(`${API}/production/delivery-challans/`, { credentials: 'include' })
            .then(r => r.json()).then(d => setChallans(d.challans || []));
    }, []);

    useEffect(() => {
        load();
        fetch(`${API}/dispatch/entries/`, { credentials: 'include' })
            .then(r => r.json()).then(d => setDispatches(d.dispatch_entries || []));
    }, [load]);

    const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

    const fillAddress = (dispatchId) => {
        const d = dispatches.find(x => String(x.id) === String(dispatchId));
        if (d?.customer_name) {
            setForm(f => ({ ...f, delivery_address: d.delivery_address || d.customer_name }));
        }
    };

    const submit = async () => {
        setLoading(true);
        try {
            const r = await fetch(`${API}/production/delivery-challans/`, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, dispatch_entry_id: form.dispatch_entry_id || null }),
            });
            const d = await r.json();
            if (d.success) { flash('Delivery Challan created.'); setShowForm(false); setForm(blankForm); load(); }
            else flash(d.error || 'Error.');
        } finally { setLoading(false); }
    };

    const updateStatus = async (id, status) => {
        const r = await fetch(`${API}/production/delivery-challans/${id}/`, {
            method: 'PUT', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
        });
        const d = await r.json();
        if (d.success) { flash(`Status updated to ${status}.`); load(); }
        else flash(d.error || 'Error.');
    };

    const cell = { padding: '10px 14px', borderBottom: '1px solid #1e293b', fontSize: 13 };
    const th   = { ...cell, backgroundColor: '#0f172a', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', fontSize: 11 };
    const inp  = { padding: '8px 10px', borderRadius: 6, border: '1px solid #334155', backgroundColor: '#0f172a', color: '#f1f5f9', fontSize: 13, width: '100%', boxSizing: 'border-box' };

    return (
        <div style={{ padding: '24px 28px', fontFamily: 'Inter, sans-serif', color: '#f1f5f9', minHeight: '100vh', backgroundColor: '#0b1120' }}>
            {printDC && (
                <PrintableChallан dc={printDC} dispatches={dispatches} onClose={() => setPrintDC(null)} />
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Delivery Challans</h2>
                    <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>Create DC · Assign vehicle · Print for driver</p>
                </div>
                <button onClick={() => { setShowForm(true); setForm(blankForm); }}
                    style={{ padding: '9px 20px', borderRadius: 8, border: 'none', backgroundColor: '#6366f1', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                    + New Delivery Challan
                </button>
            </div>

            {msg && <div style={{ padding: '10px 16px', borderRadius: 8, backgroundColor: msg.includes('Error') || msg.includes('failed') ? '#7f1d1d' : '#14532d', color: '#fff', marginBottom: 16, fontSize: 13 }}>{msg}</div>}

            {showForm && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div style={{ backgroundColor: '#1e293b', borderRadius: 12, width: '100%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto', padding: 28 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                            <h3 style={{ margin: 0, fontSize: 18 }}>New Delivery Challan</h3>
                            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer' }}>✕</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                            <div style={{ gridColumn: '1/-1' }}>
                                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Dispatch Entry (link to dispatch)</label>
                                <select value={form.dispatch_entry_id} onChange={e => { setForm(f => ({ ...f, dispatch_entry_id: e.target.value })); fillAddress(e.target.value); }} style={inp}>
                                    <option value="">— select dispatch —</option>
                                    {dispatches.map(d => <option key={d.id} value={d.id}>{d.dispatch_number} — {d.customer_name} ({d.dispatch_date})</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>DC Date</label>
                                <input type="date" value={form.dc_date} onChange={e => setForm(f => ({ ...f, dc_date: e.target.value }))} style={inp} />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Vehicle Number</label>
                                <input value={form.vehicle_number} onChange={e => setForm(f => ({ ...f, vehicle_number: e.target.value }))} style={inp} placeholder="e.g. TN 01 AB 1234" />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Driver Name</label>
                                <input value={form.driver_name} onChange={e => setForm(f => ({ ...f, driver_name: e.target.value }))} style={inp} placeholder="Driver name" />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>LR Number</label>
                                <input value={form.lr_number} onChange={e => setForm(f => ({ ...f, lr_number: e.target.value }))} style={inp} placeholder="Lorry receipt number" />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Transporter</label>
                                <input value={form.transporter} onChange={e => setForm(f => ({ ...f, transporter: e.target.value }))} style={inp} placeholder="Transport company name" />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>E-Way Bill No</label>
                                <input value={form.eway_bill} onChange={e => setForm(f => ({ ...f, eway_bill: e.target.value }))} style={inp} placeholder="12-digit e-way bill" />
                            </div>
                            <div style={{ gridColumn: '1/-1' }}>
                                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Delivery Address</label>
                                <textarea value={form.delivery_address} onChange={e => setForm(f => ({ ...f, delivery_address: e.target.value }))}
                                    style={{ ...inp, height: 70, resize: 'vertical' }} placeholder="Customer delivery address" />
                            </div>
                            <div style={{ gridColumn: '1/-1' }}>
                                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Remarks</label>
                                <input value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} style={inp} placeholder="Any special instructions" />
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                            <button onClick={() => setShowForm(false)} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #334155', backgroundColor: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                            <button onClick={submit} disabled={loading} style={{ padding: '9px 24px', borderRadius: 8, border: 'none', backgroundColor: '#6366f1', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                                {loading ? 'Creating…' : 'Create DC'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ backgroundColor: '#1e293b', borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            {['DC Number', 'Date', 'Customer', 'Vehicle', 'LR No', 'E-Way Bill', 'Status', 'Actions'].map(h => (
                                <th key={h} style={th}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {challans.length === 0 && (
                            <tr><td colSpan={8} style={{ ...cell, textAlign: 'center', color: '#475569', padding: 40 }}>No delivery challans yet. Create one above.</td></tr>
                        )}
                        {challans.map(dc => (
                            <tr key={dc.id}>
                                <td style={{ ...cell, color: '#818cf8', fontWeight: 700 }}>{dc.dc_number}</td>
                                <td style={cell}>{dc.dc_date}</td>
                                <td style={cell}>{dc.customer_name || '—'}</td>
                                <td style={cell}>{dc.vehicle_number || '—'}</td>
                                <td style={cell}>{dc.lr_number || '—'}</td>
                                <td style={cell}>{dc.eway_bill || '—'}</td>
                                <td style={cell}>
                                    <span style={{ backgroundColor: (STATUS_COLORS[dc.status] || '#64748b') + '22', color: STATUS_COLORS[dc.status] || '#64748b', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                                        {dc.status}
                                    </span>
                                </td>
                                <td style={{ ...cell, display: 'flex', gap: 6 }}>
                                    <button onClick={() => setPrintDC(dc)}
                                        style={{ padding: '4px 10px', borderRadius: 6, border: 'none', backgroundColor: '#1e3a5f', color: '#93c5fd', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                                        Print
                                    </button>
                                    {dc.status === 'draft' && (
                                        <button onClick={() => updateStatus(dc.id, 'issued')}
                                            style={{ padding: '4px 10px', borderRadius: 6, border: 'none', backgroundColor: '#14532d', color: '#4ade80', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                                            Issue
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default DeliveryChallanPage;
