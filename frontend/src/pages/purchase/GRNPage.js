// ============================================================
// PAGE: GRN — Goods Receipt Note + Lot Creation
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { usePageTheme } from '../../hooks/usePageTheme';
import { useSettings } from '../../context/SettingsContext';

export default function GRNPage() {
    const pt = usePageTheme();
    const thS      = { ...pt.th, textAlign: 'left' };
    const tdS      = { ...pt.cell, verticalAlign: 'middle' };
    const inpS     = { ...pt.inp };
    const selectS  = { ...pt.inp, width: 'auto' };
    const formPage = { ...pt.formPage, maxWidth: 900 };
    const formHeader = pt.formHeader;
    const backBtnS = pt.backBtn;
    const [grns,      setGrns]      = useState([]);
    const [pos,       setPOs]       = useState([]);
    const [locations, setLocations] = useState([]);
    const [filterPO,  setFilterPO]  = useState('');
    const [status,    setStatus]    = useState('');

    // view: 'list' | 'new_grn' | 'lots'
    const [view,      setView]      = useState('list');
    const [grnForm,   setGrnForm]   = useState({ purchase_order_id: '', receipt_date: today(), vendor_invoice_number: '', notes: '' });
    const [poLines,   setPoLines]   = useState([]);
    const [grnLines,  setGrnLines]  = useState([]);

    const [lotData,   setLotData]   = useState(null);
    const [lotSplits, setLotSplits] = useState([]);

    const [saving,    setSaving]    = useState(false);
    const [msg,       setMsg]       = useState('');

    function today() { return new Date().toISOString().split('T')[0]; }

    const load = useCallback(async () => {
        const p = new URLSearchParams();
        if (filterPO) p.set('po_id', filterPO);
        if (status)   p.set('status', status);
        const res = await fetch(`/api/purchase/grn/?${p}`, { credentials: 'include' });
        const d = await res.json(); setGrns(d.grns || []);
    }, [filterPO, status]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        fetch('/api/purchase/po/?status=confirmed', { credentials: 'include' }).then(r => r.json()).then(d => setPOs(d.purchase_orders || []));
        fetch('/api/masters/locations/?location_type=raw_material', { credentials: 'include' }).then(r => r.json()).then(d => setLocations(d.locations || []));
    }, []);

    const onPOSelect = async (poId) => {
        setGrnForm(p => ({ ...p, purchase_order_id: poId }));
        if (!poId) { setPoLines([]); setGrnLines([]); return; }
        const res = await fetch(`/api/purchase/po/${poId}/`, { credentials: 'include' });
        const d = await res.json();
        const lines = d.purchase_order?.lines || [];
        setPoLines(lines);
        setGrnLines(lines.map(l => ({ po_line_id: l.id, received_quantity: '' })));
    };

    const saveGRN = async () => {
        if (!grnForm.purchase_order_id) { setMsg('Select a PO'); return; }
        setSaving(true);
        const body = { ...grnForm, lines: grnLines.filter(l => l.received_quantity > 0) };
        const res = await fetch('/api/purchase/grn/', {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        setSaving(false);
        if (res.ok) {
            setView('list');
            setGrnForm({ purchase_order_id: '', receipt_date: today(), vendor_invoice_number: '', notes: '' });
            setPoLines([]); setGrnLines([]);
            load();
        } else { const d = await res.json(); setMsg(d.error || 'Error'); }
    };

    const openLotScreen = async (grn) => {
        const res = await fetch(`/api/purchase/grn/${grn.id}/`, { credentials: 'include' });
        const d = await res.json();
        const grnData = d.grn;
        setLotData(grnData);
        const splits = (grnData.lines || []).map(line => ({
            grn_line_id: line.id,
            material_name: line.material_name,
            received_qty: line.received_quantity,
            lots: [{
                quantity: line.received_quantity,
                color_code: '', color_name: '',
                location_id: locations[0]?.id || '',
                vendor_lot_ref: '',
            }],
        }));
        setLotSplits(splits);
        setMsg('');
        setView('lots');
    };

    const addLotSplit = (si) => {
        setLotSplits(p => p.map((s, i) => i === si
            ? { ...s, lots: [...s.lots, { quantity: '', color_code: '', color_name: '', location_id: locations[0]?.id || '', vendor_lot_ref: '' }] }
            : s
        ));
    };

    const removeLotSplit = (si, li) => {
        setLotSplits(p => p.map((s, i) => i === si
            ? { ...s, lots: s.lots.filter((_, j) => j !== li) }
            : s
        ));
    };

    const updateLot = (si, li, field, val) => {
        setLotSplits(p => p.map((s, i) => i === si
            ? { ...s, lots: s.lots.map((l, j) => j === li ? { ...l, [field]: val } : l) }
            : s
        ));
    };

    const confirmLots = async () => {
        setSaving(true);
        const body = {
            grn_id: lotData.id,
            lot_splits: lotSplits.map(s => ({
                grn_line_id: s.grn_line_id,
                lots: s.lots.map(l => ({
                    quantity: parseFloat(l.quantity) || 0,
                    color_code: l.color_code, color_name: l.color_name,
                    location_id: l.location_id || null,
                    vendor_lot_ref: l.vendor_lot_ref,
                })).filter(l => l.quantity > 0),
            })),
        };
        const res = await fetch('/api/purchase/grn/confirm-lots/', {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        setSaving(false);
        if (res.ok) {
            const d = await res.json();
            setView('list'); setLotData(null); load();
            alert(`✓ ${d.message}\n\nLots created:\n${d.lots.map(l => l.lot_number).join('\n')}`);
        } else {
            const d = await res.json();
            setMsg(d.error || 'Error creating lots');
        }
    };

    return (
        <div style={{ padding: 24 }}>
            {view === 'list' && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Goods Receipt Notes (GRN)</h2>
                        <button onClick={() => { setMsg(''); setView('new_grn'); }} style={btn('#3b82f6')}>+ New GRN</button>
                    </div>

                    <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                        <select value={filterPO} onChange={e => setFilterPO(e.target.value)} style={selectS}>
                            <option value="">All Purchase Orders</option>
                            {pos.map(p => <option key={p.id} value={p.id}>{p.po_number} — {p.vendor_name}</option>)}
                        </select>
                        <select value={status} onChange={e => setStatus(e.target.value)} style={selectS}>
                            <option value="">All Status</option>
                            <option value="draft">Draft</option>
                            <option value="confirmed">Confirmed</option>
                        </select>
                    </div>

                    <table style={tableS}><thead><tr style={{ background: pt.colors.inner, color: '#fff' }}>
                        {['GRN Number', 'PO Number', 'Vendor', 'Receipt Date', 'Vendor Invoice', 'Status', 'Actions'].map(h =>
                            <th key={h} style={thS}>{h}</th>)}
                    </tr></thead><tbody>
                        {grns.map((r, i) => (
                            <tr key={r.id} style={{ background: i % 2 === 0 ? pt.colors.inner : pt.colors.card }}>
                                <td style={tdS}><b style={{ color: '#3b82f6' }}>{r.grn_number}</b></td>
                                <td style={tdS}>{r.po_number}</td>
                                <td style={tdS}>{r.vendor_name}</td>
                                <td style={tdS}>{r.receipt_date}</td>
                                <td style={tdS}>{r.vendor_invoice_number || '—'}</td>
                                <td style={tdS}>
                                    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                                        background: r.status === 'confirmed' ? '#dcfce7' : '#fef3c7',
                                        color: r.status === 'confirmed' ? '#166534' : '#92400e' }}>
                                        {r.status}
                                    </span>
                                </td>
                                <td style={tdS}>
                                    {r.status === 'draft' && (
                                        <button onClick={() => openLotScreen(r)} style={btn('#ec4899')}>
                                            Confirm + Create Lots
                                        </button>
                                    )}
                                    {r.status === 'confirmed' && <span style={{ color: '#10b981', fontSize: 12 }}>✓ Lots Created</span>}
                                </td>
                            </tr>
                        ))}
                        {grns.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: pt.colors.muted }}>No GRNs found</td></tr>}
                    </tbody></table>
                </>
            )}

            {view === 'new_grn' && (
                <div style={formPage}>
                    <div style={formHeader}>
                        <button onClick={() => setView('list')} style={backBtnS}>← Back to GRN List</button>
                        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>New Goods Receipt Note</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                        <F label="Purchase Order *">
                            <select style={inpS} value={grnForm.purchase_order_id} onChange={e => onPOSelect(e.target.value)}>
                                <option value="">-- Select Confirmed PO --</option>
                                {pos.map(p => <option key={p.id} value={p.id}>{p.po_number} — {p.vendor_name}</option>)}
                            </select>
                        </F>
                        <F label="Receipt Date"><input style={inpS} type="date" value={grnForm.receipt_date} onChange={e => setGrnForm(p => ({ ...p, receipt_date: e.target.value }))} /></F>
                        <F label="Vendor Invoice Number"><input style={inpS} value={grnForm.vendor_invoice_number} onChange={e => setGrnForm(p => ({ ...p, vendor_invoice_number: e.target.value }))} /></F>
                    </div>

                    {poLines.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                            <b style={{ fontSize: 13 }}>Enter Received Quantities:</b>
                            <table style={{ ...tableS, marginTop: 10 }}><thead><tr style={{ background: pt.colors.card, color: '#fff' }}>
                                {['Material', 'Ordered Qty', 'Received Qty'].map(h => <th key={h} style={{ ...thS, padding: '8px 12px', fontSize: 11 }}>{h}</th>)}
                            </tr></thead><tbody>
                                {poLines.map((pl, i) => (
                                    <tr key={i} style={{ background: i % 2 === 0 ? pt.colors.inner : pt.colors.card }}>
                                        <td style={{ ...tdS, padding: '8px 12px' }}>{pl.material_name} <span style={{ color: pt.colors.dimText, fontSize: 11 }}>({pl.uom_name})</span></td>
                                        <td style={{ ...tdS, padding: '8px 12px' }}>{pl.ordered_quantity}</td>
                                        <td style={{ ...tdS, padding: '8px 12px' }}>
                                            <input type="number" step="0.001"
                                                style={{ ...inpS, width: 120 }}
                                                placeholder="Qty received"
                                                value={grnLines[i]?.received_quantity || ''}
                                                onChange={e => setGrnLines(prev => prev.map((l, j) => j === i ? { ...l, received_quantity: e.target.value } : l))} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody></table>
                        </div>
                    )}

                    <F label="Notes">
                        <textarea style={{ ...inpS, height: 60, resize: 'vertical' }}
                            value={grnForm.notes} onChange={e => setGrnForm(p => ({ ...p, notes: e.target.value }))} />
                    </F>
                    {msg && <div style={{ color: '#ef4444', marginTop: 8 }}>{msg}</div>}
                    <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
                        <button onClick={() => setView('list')} style={smallBtn('#64748b')}>Cancel</button>
                        <button onClick={saveGRN} disabled={saving} style={btn('#3b82f6')}>{saving ? 'Saving…' : 'Save GRN (Draft)'}</button>
                    </div>
                </div>
            )}

            {view === 'lots' && lotData && (
                <div style={{ ...formPage, maxWidth: 1100 }}>
                    <div style={formHeader}>
                        <button onClick={() => { setView('list'); setLotData(null); }} style={backBtnS}>← Back to GRN List</button>
                        <div>
                            <h3 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700 }}>Create Lots — {lotData.grn_number}</h3>
                            <p style={{ margin: 0, color: pt.colors.dimText, fontSize: 13 }}>Split each received material into individual LOTs. Each LOT gets a unique number for traceability.</p>
                        </div>
                    </div>

                    {lotSplits.map((split, si) => (
                        <div key={si} style={{ border: `1px solid ${pt.colors.border}`, borderRadius: 10, padding: 16, marginBottom: 16, background: pt.colors.inner }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <div>
                                    <b style={{ fontSize: 14 }}>{split.material_name}</b>
                                    <span style={{ marginLeft: 10, color: pt.colors.dimText, fontSize: 12 }}>Received: {split.received_qty}</span>
                                    <span style={{ marginLeft: 10, color: '#10b981', fontSize: 12, fontWeight: 600 }}>
                                        Sum of lots: {split.lots.reduce((sum, l) => sum + (parseFloat(l.quantity) || 0), 0).toFixed(3)}
                                    </span>
                                </div>
                                <button onClick={() => addLotSplit(si)} style={smallBtn('#3b82f6')}>+ Add Lot</button>
                            </div>

                            {split.lots.map((lot, li) => (
                                <div key={li} style={{ display: 'grid', gridTemplateColumns: '100px 100px 130px 1fr 130px 30px', gap: 8, marginBottom: 8, alignItems: 'end' }}>
                                    <F label={li === 0 ? 'Quantity *' : ''}>
                                        <input style={inpS} type="number" step="0.001" placeholder="Qty"
                                            value={lot.quantity}
                                            onChange={e => updateLot(si, li, 'quantity', e.target.value)} />
                                    </F>
                                    <F label={li === 0 ? 'Color Code' : ''}>
                                        <input style={inpS} placeholder="e.g. R01"
                                            value={lot.color_code}
                                            onChange={e => updateLot(si, li, 'color_code', e.target.value)} />
                                    </F>
                                    <F label={li === 0 ? 'Color Name' : ''}>
                                        <input style={inpS} placeholder="e.g. Red"
                                            value={lot.color_name}
                                            onChange={e => updateLot(si, li, 'color_name', e.target.value)} />
                                    </F>
                                    <F label={li === 0 ? 'Location' : ''}>
                                        <select style={inpS} value={lot.location_id}
                                            onChange={e => updateLot(si, li, 'location_id', e.target.value)}>
                                            <option value="">-- Location --</option>
                                            {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                                        </select>
                                    </F>
                                    <F label={li === 0 ? 'Vendor Lot Ref' : ''}>
                                        <input style={inpS} placeholder="Vendor's lot no"
                                            value={lot.vendor_lot_ref}
                                            onChange={e => updateLot(si, li, 'vendor_lot_ref', e.target.value)} />
                                    </F>
                                    <div style={{ paddingBottom: 2 }}>
                                        {split.lots.length > 1 && (
                                            <button onClick={() => removeLotSplit(si, li)}
                                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>✕</button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}

                    {msg && <div style={{ color: '#ef4444', padding: '8px 0' }}>{msg}</div>}
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button onClick={() => { setView('list'); setLotData(null); }} style={smallBtn('#64748b')}>Cancel</button>
                        <button onClick={confirmLots} disabled={saving} style={btn('#ec4899')}>
                            {saving ? 'Creating Lots…' : '✓ Confirm GRN & Create Lots'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function F({ label, children }) {
    const { settings } = useSettings();
    const muted = settings.themeMode === 'dark' ? '#94a3b8' : '#475569';
    return <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: muted, marginBottom: 4 }}>{label}</label>{children}</div>;
}
const btn      = (bg) => ({ padding: '8px 18px', background: bg, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 });
const smallBtn = (bg) => ({ padding: '4px 10px', background: bg, color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12, marginRight: 4 });
const tableS   = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
