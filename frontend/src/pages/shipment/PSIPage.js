// PAGE: Pre-Shipment Inspections — Buying House ERP
import { useState, useEffect, useCallback } from 'react';
import { usePageTheme } from '../../hooks/usePageTheme';
import { useSettings } from '../../context/SettingsContext';

const RESULT_META = {
    pending:      { label: 'Pending',               color: '#64748b' },
    pass:         { label: 'Pass',                  color: '#10b981' },
    pass_remarks: { label: 'Pass with Remarks',     color: '#f59e0b' },
    fail:         { label: 'Fail',                  color: '#ef4444' },
    re_inspect:   { label: 'Re-Inspection Required',color: '#8b5cf6' },
};

const emptyForm = {
    customer_order_id: '', factory_order_id: '',
    inspection_date: new Date().toISOString().split('T')[0],
    inspector_name: '', inspection_agency: '',
    result: 'pending',
    quantity_inspected: '', quantity_passed: '',
    aql_level: '2.5',
    critical_defects: 0, major_defects: 0, minor_defects: 0,
    remarks: '', report_file_url: '',
    default_checklist: true,
};

export default function PSIPage() {
    const pt  = usePageTheme();
    const thS = { ...pt.th, textAlign: 'left' };
    const tdS = { ...pt.cell, verticalAlign: 'middle' };
    const inpS = { ...pt.inp };

    const [rows, setRows]       = useState([]);
    const [filter, setFilter]   = useState('');
    const [modal, setModal]     = useState(false);
    const [form, setForm]       = useState(emptyForm);
    const [orders, setOrders]   = useState([]);
    const [foList, setFoList]   = useState([]);
    const [saving, setSaving]   = useState(false);
    const [msg, setMsg]         = useState('');

    const load = useCallback(async () => {
        const p = new URLSearchParams();
        if (filter) p.set('result', filter);
        const res = await fetch(`/api/shipment/psi/?${p}`, { credentials: 'include' });
        const d = await res.json();
        setRows(d.psi_list || []);
    }, [filter]);

    const loadDropdowns = useCallback(async () => {
        const [co, fo] = await Promise.all([
            fetch('/api/orders/co/', { credentials: 'include' }).then(r => r.json()),
            fetch('/api/orders/fo/', { credentials: 'include' }).then(r => r.json()),
        ]);
        setOrders(co.customer_orders || []);
        setFoList(fo.factory_orders || []);
    }, []);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { loadDropdowns(); }, [loadDropdowns]);

    const inp = (f) => ({ value: form[f], onChange: e => setForm(p => ({ ...p, [f]: e.target.value })) });

    const save = async () => {
        if (!form.customer_order_id) { setMsg('Select a Customer Order.'); return; }
        if (!form.inspection_date) { setMsg('Inspection date is required.'); return; }
        setSaving(true); setMsg('');
        const payload = {
            ...form,
            factory_order_id: form.factory_order_id || null,
            quantity_inspected: Number(form.quantity_inspected) || 0,
            quantity_passed: Number(form.quantity_passed) || 0,
            critical_defects: Number(form.critical_defects) || 0,
            major_defects: Number(form.major_defects) || 0,
            minor_defects: Number(form.minor_defects) || 0,
        };
        const res = await fetch('/api/shipment/psi/', {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        });
        setSaving(false);
        if (res.ok) { setModal(false); load(); }
        else { const d = await res.json(); setMsg(d.error || 'Error saving'); }
    };

    const counts = Object.keys(RESULT_META).reduce((a, k) => { a[k] = rows.filter(r => r.result === k).length; return a; }, {});

    return (
        <div style={{ padding: '24px 28px', fontFamily: 'Inter, sans-serif', color: pt.colors.text, minHeight: '100vh', backgroundColor: pt.colors.outer }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Pre-Shipment Inspections</h2>
                    <p style={{ margin: '4px 0 0', color: pt.colors.dimText, fontSize: 13 }}>Quality check before shipment approval</p>
                </div>
                <button onClick={() => { setForm(emptyForm); setMsg(''); setModal(true); }} style={btn('#8b5cf6')}>+ New PSI</button>
            </div>

            {/* Result pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                <button onClick={() => setFilter('')} style={filterPill(filter === '', '#64748b')}>All ({rows.length})</button>
                {Object.entries(RESULT_META).filter(([k]) => counts[k] > 0).map(([k, m]) => (
                    <button key={k} onClick={() => setFilter(k)} style={filterPill(filter === k, m.color)}>
                        {m.label} ({counts[k]})
                    </button>
                ))}
            </div>

            <div style={{ backgroundColor: pt.colors.card, borderRadius: 12, overflow: 'hidden', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead><tr>
                        {['PSI No.', 'Customer Order', 'Customer', 'Factory Order', 'Date', 'Inspector', 'Agency', 'Qty Inspected', 'Defects (C/M/m)', 'Result'].map(h =>
                            <th key={h} style={thS}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                        {rows.map(r => {
                            const rm = RESULT_META[r.result] || RESULT_META.pending;
                            return (
                                <tr key={r.id}>
                                    <td style={{ ...tdS, fontWeight: 700, color: '#8b5cf6' }}>{r.psi_number}</td>
                                    <td style={{ ...tdS, color: '#10b981', fontWeight: 600 }}>{r.co_number}</td>
                                    <td style={tdS}>{r.customer_name || '—'}</td>
                                    <td style={{ ...tdS, color: pt.colors.dimText }}>{r.fo_number || '—'}</td>
                                    <td style={tdS}>{r.inspection_date}</td>
                                    <td style={tdS}>{r.inspector_name || '—'}</td>
                                    <td style={tdS}>{r.inspection_agency || '—'}</td>
                                    <td style={tdS}>{r.quantity_inspected} / {r.quantity_passed} passed</td>
                                    <td style={{ ...tdS, color: (r.critical_defects > 0 ? '#ef4444' : r.major_defects > 0 ? '#f59e0b' : pt.colors.text) }}>
                                        {r.critical_defects} / {r.major_defects} / {r.minor_defects}
                                    </td>
                                    <td style={tdS}><span style={tag(rm.color)}>{rm.label}</span></td>
                                </tr>
                            );
                        })}
                        {rows.length === 0 && (
                            <tr><td colSpan={10} style={{ textAlign: 'center', padding: 60, color: pt.colors.muted }}>
                                <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                                No inspections yet.
                            </td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {modal && (
                <div style={overlay}>
                    <div style={{ ...modalBox(pt), maxWidth: 680 }}>
                        <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>New Pre-Shipment Inspection</h3>
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
                            <F label="Inspection Date *"><input type="date" style={inpS} {...inp('inspection_date')} /></F>
                            <F label="Result">
                                <select style={inpS} {...inp('result')}>
                                    {Object.entries(RESULT_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
                                </select>
                            </F>
                            <F label="Inspector Name"><input style={inpS} placeholder="Inspector full name" {...inp('inspector_name')} /></F>
                            <F label="Inspection Agency"><input style={inpS} placeholder="e.g. SGS, Bureau Veritas, QIMA" {...inp('inspection_agency')} /></F>
                            <F label="AQL Level"><input style={inpS} placeholder="2.5" {...inp('aql_level')} /></F>
                            <F label="Qty Inspected"><input type="number" style={inpS} {...inp('quantity_inspected')} /></F>
                            <F label="Qty Passed"><input type="number" style={inpS} {...inp('quantity_passed')} /></F>
                            <F label="Report URL"><input style={inpS} placeholder="https://..." {...inp('report_file_url')} /></F>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                            <F label="Critical Defects"><input type="number" style={{ ...inpS, borderColor: '#ef4444' }} {...inp('critical_defects')} /></F>
                            <F label="Major Defects"><input type="number" style={{ ...inpS, borderColor: '#f59e0b' }} {...inp('major_defects')} /></F>
                            <F label="Minor Defects"><input type="number" style={{ ...inpS, borderColor: '#64748b' }} {...inp('minor_defects')} /></F>
                        </div>
                        <F label="Remarks"><textarea style={{ ...inpS, height: 60, resize: 'vertical', width: '100%' }} {...inp('remarks')} /></F>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 13, cursor: 'pointer' }}>
                            <input type="checkbox" checked={form.default_checklist}
                                onChange={e => setForm(p => ({ ...p, default_checklist: e.target.checked }))} />
                            Auto-create standard checklist (Workmanship, Measurements, Labels, Packing)
                        </label>
                        {msg && <div style={{ color: '#ef4444', marginTop: 8, fontSize: 13 }}>{msg}</div>}
                        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                            <button onClick={() => setModal(false)} style={smallBtn('#64748b')}>Cancel</button>
                            <button onClick={save} disabled={saving} style={btn('#8b5cf6')}>{saving ? 'Creating…' : 'Create PSI'}</button>
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
