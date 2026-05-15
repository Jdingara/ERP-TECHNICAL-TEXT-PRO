// PAGE: Shipments — Buying House ERP
import { useState, useEffect, useCallback } from 'react';
import { usePageTheme } from '../../hooks/usePageTheme';
import { useSettings } from '../../context/SettingsContext';

const MODE_META = {
    sea:     { label: 'Sea',     color: '#06b6d4' },
    air:     { label: 'Air',     color: '#8b5cf6' },
    land:    { label: 'Land',    color: '#f59e0b' },
    courier: { label: 'Courier', color: '#10b981' },
};

const STATUS_META = {
    draft:      { label: 'Draft',             color: '#64748b' },
    booked:     { label: 'Booked',            color: '#3b82f6' },
    loaded:     { label: 'Loaded',            color: '#f59e0b' },
    in_transit: { label: 'In Transit',        color: '#06b6d4' },
    arrived:    { label: 'Arrived',           color: '#8b5cf6' },
    customs:    { label: 'Customs',           color: '#f97316' },
    delivered:  { label: 'Delivered',         color: '#10b981' },
    cancelled:  { label: 'Cancelled',         color: '#94a3b8' },
};
const STATUSES = Object.entries(STATUS_META).map(([v, m]) => ({ value: v, label: m.label }));
const MODES    = Object.entries(MODE_META).map(([v, m]) => ({ value: v, label: m.label }));
const CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD', 'INR', 'OTHER'];

const emptyForm = {
    customer_order_id: '', factory_order_id: '', psi_id: '',
    mode: 'sea', status: 'draft',
    shipper: '', consignee: '', forwarder: '',
    port_of_loading: '', port_of_discharge: '',
    etd: '', eta: '', actual_departure: '', actual_arrival: '',
    bl_number: '', container_number: '',
    total_cartons: '', total_qty: '',
    gross_weight_kg: '', cbm: '',
    invoice_value: '', currency: 'USD', notes: '',
};

export default function ShipmentsPage() {
    const pt   = usePageTheme();
    const thS  = { ...pt.th, textAlign: 'left' };
    const tdS  = { ...pt.cell, verticalAlign: 'middle' };
    const inpS = { ...pt.inp };

    const [rows, setRows]       = useState([]);
    const [filter, setFilter]   = useState('');
    const [modal, setModal]     = useState(false);
    const [form, setForm]       = useState(emptyForm);
    const [orders, setOrders]   = useState([]);
    const [foList, setFoList]   = useState([]);
    const [psiList, setPsiList] = useState([]);
    const [saving, setSaving]   = useState(false);
    const [msg, setMsg]         = useState('');

    const load = useCallback(async () => {
        const p = new URLSearchParams();
        if (filter) p.set('status', filter);
        const res = await fetch(`/api/shipment/shipments/?${p}`, { credentials: 'include' });
        const d = await res.json();
        setRows(d.shipments || []);
    }, [filter]);

    const loadDropdowns = useCallback(async () => {
        const [co, fo, psi] = await Promise.all([
            fetch('/api/orders/co/', { credentials: 'include' }).then(r => r.json()),
            fetch('/api/orders/fo/', { credentials: 'include' }).then(r => r.json()),
            fetch('/api/shipment/psi/', { credentials: 'include' }).then(r => r.json()),
        ]);
        setOrders(co.customer_orders || []);
        setFoList(fo.factory_orders || []);
        setPsiList(psi.psi_list || []);
    }, []);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { loadDropdowns(); }, [loadDropdowns]);

    const inp = (f) => ({ value: form[f], onChange: e => setForm(p => ({ ...p, [f]: e.target.value })) });

    const save = async () => {
        if (!form.customer_order_id) { setMsg('Select a Customer Order.'); return; }
        setSaving(true); setMsg('');
        const payload = {
            ...form,
            factory_order_id: form.factory_order_id || null,
            psi_id: form.psi_id || null,
            total_cartons: Number(form.total_cartons) || 0,
            total_qty: Number(form.total_qty) || 0,
            gross_weight_kg: Number(form.gross_weight_kg) || 0,
            cbm: Number(form.cbm) || 0,
            invoice_value: Number(form.invoice_value) || 0,
        };
        const res = await fetch('/api/shipment/shipments/', {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        });
        setSaving(false);
        if (res.ok) { setModal(false); load(); }
        else { const d = await res.json(); setMsg(d.error || 'Error'); }
    };

    const updateStatus = async (id, status) => {
        await fetch(`/api/shipment/shipments/${id}/`, {
            method: 'PUT', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
        });
        load();
    };

    const counts = Object.keys(STATUS_META).reduce((a, k) => { a[k] = rows.filter(r => r.status === k).length; return a; }, {});

    return (
        <div style={{ padding: '24px 28px', fontFamily: 'Inter, sans-serif', color: pt.colors.text, minHeight: '100vh', backgroundColor: pt.colors.outer }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Shipments</h2>
                    <p style={{ margin: '4px 0 0', color: pt.colors.dimText, fontSize: 13 }}>Track all outbound shipments to buyers</p>
                </div>
                <button onClick={() => { setForm(emptyForm); setMsg(''); setModal(true); }} style={btn('#06b6d4')}>+ New Shipment</button>
            </div>

            {/* Status pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                <button onClick={() => setFilter('')} style={filterPill(filter === '', '#64748b')}>All ({rows.length})</button>
                {Object.entries(STATUS_META).filter(([k]) => counts[k] > 0).map(([k, m]) => (
                    <button key={k} onClick={() => setFilter(k)} style={filterPill(filter === k, m.color)}>
                        {m.label} ({counts[k]})
                    </button>
                ))}
            </div>

            <div style={{ backgroundColor: pt.colors.card, borderRadius: 12, overflow: 'hidden', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead><tr>
                        {['Shipment No.', 'CO', 'Customer', 'Mode', 'ETD', 'ETA', 'B/L No.', 'Qty', 'Value', 'Status', ''].map(h =>
                            <th key={h} style={thS}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                        {rows.map(r => {
                            const sm = STATUS_META[r.status] || STATUS_META.draft;
                            const mm = MODE_META[r.mode] || MODE_META.sea;
                            return (
                                <tr key={r.id}>
                                    <td style={{ ...tdS, fontWeight: 700, color: '#06b6d4' }}>{r.shipment_number}</td>
                                    <td style={{ ...tdS, color: '#10b981', fontWeight: 600 }}>{r.co_number}</td>
                                    <td style={tdS}>{r.customer_name || '—'}</td>
                                    <td style={tdS}><span style={tag(mm.color)}>{mm.label}</span></td>
                                    <td style={{ ...tdS, color: r.etd ? pt.colors.text : pt.colors.muted }}>{r.etd || '—'}</td>
                                    <td style={{ ...tdS, color: r.eta ? pt.colors.text : pt.colors.muted }}>{r.eta || '—'}</td>
                                    <td style={{ ...tdS, fontFamily: 'monospace', fontSize: 12 }}>{r.bl_number || '—'}</td>
                                    <td style={tdS}>{r.total_qty.toLocaleString()}</td>
                                    <td style={tdS}>{r.currency} {Number(r.invoice_value).toLocaleString()}</td>
                                    <td style={tdS}><span style={tag(sm.color)}>{sm.label}</span></td>
                                    <td style={tdS} onClick={e => e.stopPropagation()}>
                                        <select value={r.status}
                                            onChange={e => updateStatus(r.id, e.target.value)}
                                            style={{ fontSize: 11, padding: '2px 4px', borderRadius: 4, border: `1px solid ${sm.color}`, background: 'transparent', color: sm.color, cursor: 'pointer' }}>
                                            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                        </select>
                                    </td>
                                </tr>
                            );
                        })}
                        {rows.length === 0 && (
                            <tr><td colSpan={11} style={{ textAlign: 'center', padding: 60, color: pt.colors.muted }}>
                                <div style={{ fontSize: 32, marginBottom: 8 }}>🚢</div>
                                No shipments yet. Click "+ New Shipment" to start.
                            </td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {modal && (
                <div style={overlay}>
                    <div style={{ ...modalBox(pt), maxWidth: 780 }}>
                        <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>New Shipment</h3>

                        <div style={grid2}>
                            <F label="Customer Order *">
                                <select style={inpS} {...inp('customer_order_id')}>
                                    <option value="">— Select CO —</option>
                                    {orders.map(o => <option key={o.id} value={o.id}>{o.co_number} — {o.customer_name}</option>)}
                                </select>
                            </F>
                            <F label="Factory Order">
                                <select style={inpS} {...inp('factory_order_id')}>
                                    <option value="">— None —</option>
                                    {foList.map(f => <option key={f.id} value={f.id}>{f.fo_number}</option>)}
                                </select>
                            </F>
                            <F label="Linked PSI">
                                <select style={inpS} {...inp('psi_id')}>
                                    <option value="">— None —</option>
                                    {psiList.map(p => <option key={p.id} value={p.id}>{p.psi_number} ({p.result})</option>)}
                                </select>
                            </F>
                            <F label="Mode">
                                <select style={inpS} {...inp('mode')}>
                                    {MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                </select>
                            </F>
                            <F label="Status">
                                <select style={inpS} {...inp('status')}>
                                    {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                </select>
                            </F>
                            <F label="Currency">
                                <select style={inpS} {...inp('currency')}>
                                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </F>
                        </div>

                        <p style={{ fontSize: 12, fontWeight: 700, color: pt.colors.dimText, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: 1 }}>Routing</p>
                        <div style={grid2}>
                            <F label="Shipper"><input style={inpS} placeholder="Exporter / manufacturer" {...inp('shipper')} /></F>
                            <F label="Consignee"><input style={inpS} placeholder="Buyer / importer" {...inp('consignee')} /></F>
                            <F label="Freight Forwarder"><input style={inpS} {...inp('forwarder')} /></F>
                            <F label="Port of Loading"><input style={inpS} placeholder="e.g. INMAA" {...inp('port_of_loading')} /></F>
                            <F label="Port of Discharge"><input style={inpS} placeholder="e.g. USLAX" {...inp('port_of_discharge')} /></F>
                            <F label="B/L or AWB Number"><input style={inpS} {...inp('bl_number')} /></F>
                            <F label="Container Number"><input style={inpS} {...inp('container_number')} /></F>
                            <F label="Invoice Value"><input type="number" style={inpS} {...inp('invoice_value')} /></F>
                        </div>

                        <p style={{ fontSize: 12, fontWeight: 700, color: pt.colors.dimText, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: 1 }}>Dates</p>
                        <div style={{ ...grid2, gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
                            <F label="ETD"><input type="date" style={inpS} {...inp('etd')} /></F>
                            <F label="ETA"><input type="date" style={inpS} {...inp('eta')} /></F>
                            <F label="Actual Departure"><input type="date" style={inpS} {...inp('actual_departure')} /></F>
                            <F label="Actual Arrival"><input type="date" style={inpS} {...inp('actual_arrival')} /></F>
                        </div>

                        <p style={{ fontSize: 12, fontWeight: 700, color: pt.colors.dimText, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: 1 }}>Cargo Details</p>
                        <div style={{ ...grid2, gridTemplateColumns: '1fr 1fr 1fr 1fr', marginBottom: 12 }}>
                            <F label="Total Cartons"><input type="number" style={inpS} {...inp('total_cartons')} /></F>
                            <F label="Total Qty (pcs)"><input type="number" style={inpS} {...inp('total_qty')} /></F>
                            <F label="Gross Weight (kg)"><input type="number" style={inpS} {...inp('gross_weight_kg')} /></F>
                            <F label="CBM"><input type="number" style={inpS} {...inp('cbm')} /></F>
                        </div>

                        <F label="Notes"><textarea style={{ ...inpS, height: 60, resize: 'vertical', width: '100%' }} {...inp('notes')} /></F>
                        {msg && <div style={{ color: '#ef4444', marginTop: 8, fontSize: 13 }}>{msg}</div>}
                        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                            <button onClick={() => setModal(false)} style={smallBtn('#64748b')}>Cancel</button>
                            <button onClick={save} disabled={saving} style={btn('#06b6d4')}>{saving ? 'Creating…' : 'Create Shipment'}</button>
                        </div>
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
const btn        = (bg) => ({ padding: '8px 18px', background: bg, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 });
const smallBtn   = (bg) => ({ padding: '4px 10px', background: bg, color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12 });
const tag        = (bg) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 12, background: `${bg}20`, color: bg, fontSize: 11, fontWeight: 600 });
const filterPill = (active, color) => ({ padding: '4px 12px', borderRadius: 20, border: `1px solid ${color}`, background: active ? color : 'transparent', color: active ? '#fff' : color, fontSize: 12, fontWeight: 600, cursor: 'pointer' });
const overlay    = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalBox   = (pt) => ({ background: pt.colors.card, borderRadius: 16, padding: 28, width: '90%', maxHeight: '90vh', overflowY: 'auto' });
const grid2      = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 };
