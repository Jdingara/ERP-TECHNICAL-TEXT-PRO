import { useState, useEffect } from 'react';

const FY_API = '/api/master-data/settings/financial-years';

const TT_FORMATS = [
    { doc: 'Purchase Order',    prefix: 'PO',   module: 'Purchase',        example: 'PO-20260419-001',   color: '#3b82f6' },
    { doc: 'Goods Receipt Note',prefix: 'GRN',  module: 'Purchase',        example: 'GRN-20260419-001',  color: '#3b82f6' },
    { doc: 'LOT Number',        prefix: 'LOT',  module: 'Purchase',        example: 'LOT-20260419-001',  color: '#f59e0b' },
    { doc: 'Purchase Invoice',  prefix: 'PINV', module: 'Purchase',        example: 'PINV-20260419-001', color: '#3b82f6' },
    { doc: 'Sales Order',       prefix: 'SO',   module: 'Planning',        example: 'SO-20260419-001',   color: '#8b5cf6' },
    { doc: 'Production Order',  prefix: 'PROD', module: 'Planning',        example: 'PROD-20260419-001', color: '#8b5cf6' },
    { doc: 'Yarn Issue',        prefix: 'YI',   module: 'Production',      example: 'YI-20260419-001',   color: '#10b981' },
    { doc: 'Process Entry',     prefix: 'PE',   module: 'Production',      example: 'PE-20260419-001',   color: '#10b981' },
    { doc: 'Batch',             prefix: 'BAT',  module: 'Production',      example: 'BAT-20260419-001',  color: '#10b981' },
    { doc: 'Beam Outward',      prefix: 'BM',   module: 'Production',      example: 'BM-20260419-001',   color: '#10b981' },
    { doc: 'Inspection',        prefix: 'QC',   module: 'Quality',         example: 'QC-20260419-001',   color: '#ef4444' },
    { doc: 'Sample Test',       prefix: 'ST',   module: 'Quality',         example: 'ST-20260419-001',   color: '#ef4444' },
    { doc: 'Dispatch Entry',    prefix: 'DE',   module: 'Dispatch',        example: 'DE-20260419-001',   color: '#f97316' },
    { doc: 'Sales Invoice',     prefix: 'SINV', module: 'Dispatch',        example: 'SINV-20260419-001', color: '#f97316' },
];

const MODULE_COLORS = {
    Purchase:   '#3b82f6',
    Planning:   '#8b5cf6',
    Production: '#10b981',
    Quality:    '#ef4444',
    Dispatch:   '#f97316',
};

export default function FormatPanelPage() {
    const [years,   setYears]   = useState([]);
    const [fyLoad,  setFyLoad]  = useState(false);
    const [msg,     setMsg]     = useState('');
    const [msgOk,   setMsgOk]   = useState(true);
    const [showNew, setShowNew] = useState(false);
    const [form,    setForm]    = useState({ label: '', start_date: '', end_date: '' });

    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    const loadFY = async () => {
        setFyLoad(true);
        try {
            const r = await fetch(`${FY_API}/`, { credentials: 'include' });
            const d = await r.json();
            setYears(Array.isArray(d) ? d : []);
        } catch { setYears([]); }
        setFyLoad(false);
    };

    useEffect(() => { loadFY(); }, []);

    const createFY = async () => {
        try {
            const r = await fetch(`${FY_API}/`, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const d = await r.json();
            setMsg(d.message || 'Created'); setMsgOk(r.ok);
            if (r.ok) { setShowNew(false); setForm({ label: '', start_date: '', end_date: '' }); loadFY(); }
        } catch (e) { setMsg(e.message); setMsgOk(false); }
    };

    const activateFY = async (id, label) => {
        if (!window.confirm(`Activate "${label}"?`)) return;
        try {
            const r = await fetch(`${FY_API}/${id}/activate/`, { method: 'POST', credentials: 'include' });
            const d = await r.json();
            setMsg(d.message); setMsgOk(r.ok); loadFY();
        } catch (e) { setMsg(e.message); setMsgOk(false); }
    };

    const deleteFY = async (id, label) => {
        if (!window.confirm(`Delete "${label}"?`)) return;
        try {
            const r = await fetch(`${FY_API}/${id}/delete/`, { method: 'DELETE', credentials: 'include' });
            const d = await r.json();
            setMsg(d.message); setMsgOk(r.ok); loadFY();
        } catch (e) { setMsg(e.message); setMsgOk(false); }
    };

    return (
        <div style={{ padding: 24, maxWidth: 1100 }}>

            {/* Page Header */}
            <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', borderRadius: 12, padding: '20px 24px', marginBottom: 28, color: '#fff' }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>Format Panel</div>
                <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>
                    Configure Financial Years · Document auto-numbering reference · Admin only
                </div>
            </div>

            {msg && (
                <div style={{ background: msgOk ? '#d1fae5' : '#fee2e2', border: `1px solid ${msgOk ? '#6ee7b7' : '#fca5a5'}`, borderRadius: 8, padding: '10px 16px', marginBottom: 20, fontSize: 13, color: msgOk ? '#065f46' : '#991b1b', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{msg}</span>
                    <span style={{ cursor: 'pointer', fontWeight: 700 }} onClick={() => setMsg('')}>✕</span>
                </div>
            )}

            {/* ── Financial Year ──────────────────────────────── */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, marginBottom: 28, boxShadow: '0 1px 4px #0001' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>📅 Financial Year</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Active FY label is used in document numbers</div>
                    </div>
                    <button onClick={() => setShowNew(true)} style={btn('#2563eb')}>+ New Financial Year</button>
                </div>

                {fyLoad ? <div style={{ color: '#94a3b8', fontSize: 13 }}>Loading…</div> : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: '#f8fafc' }}>
                                {['Year Label', 'Start Date', 'End Date', 'Status', 'Actions'].map(h =>
                                    <th key={h} style={thS}>{h}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {years.length === 0 && (
                                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>
                                    No financial years yet. Click "New Financial Year" to add one.
                                </td></tr>
                            )}
                            {years.map((fy, i) => (
                                <tr key={fy.id} style={{ background: fy.is_active ? '#f0fdf4' : i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                    <td style={tdS}><b style={{ color: '#1e293b' }}>{fy.label}</b></td>
                                    <td style={tdS}>{fy.start_date}</td>
                                    <td style={tdS}>{fy.end_date}</td>
                                    <td style={tdS}>
                                        {fy.is_active
                                            ? <span style={tag('#10b981')}>✓ Active</span>
                                            : <span style={tag('#94a3b8')}>Inactive</span>}
                                    </td>
                                    <td style={tdS}>
                                        {!fy.is_active && (<>
                                            <button onClick={() => activateFY(fy.id, fy.label)} style={{ ...smallBtn('#10b981'), marginRight: 8 }}>Activate</button>
                                            <button onClick={() => deleteFY(fy.id, fy.label)} style={smallBtn('#ef4444')}>Delete</button>
                                        </>)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ── Document Number Formats ─────────────────────── */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px #0001' }}>
                <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>⚙️ Document Number Formats</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                        MEI TEXZ uses date-based auto-numbering. Format: <b>PREFIX-YYYYMMDD-NNN</b>
                    </div>
                </div>

                {/* Info banner */}
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 16px', marginBottom: 20, fontSize: 12, color: '#1e40af' }}>
                    ℹ️ Numbers are generated automatically by the system on each new record. Today's example uses date <b>{today}</b>.
                    Each module maintains its own daily counter (resets to 001 each new day).
                </div>

                {/* Module legend */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                    {Object.entries(MODULE_COLORS).map(([mod, col]) => (
                        <span key={mod} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: col }}>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: col, display: 'inline-block' }} />
                            {mod}
                        </span>
                    ))}
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                        <tr style={{ background: '#1e293b', color: '#fff' }}>
                            {['Document Type', 'Module', 'Prefix', 'Pattern', 'Today\'s Example'].map(h =>
                                <th key={h} style={thSDark}>{h}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {TT_FORMATS.map((f, i) => (
                            <tr key={f.doc} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                <td style={tdS}><b style={{ color: '#1e293b' }}>{f.doc}</b></td>
                                <td style={tdS}>
                                    <span style={{ color: MODULE_COLORS[f.module], fontWeight: 600, fontSize: 12 }}>
                                        {f.module}
                                    </span>
                                </td>
                                <td style={tdS}>
                                    <span style={{ background: `${f.color}18`, color: f.color, padding: '2px 10px', borderRadius: 20, fontWeight: 700, fontSize: 12, fontFamily: 'monospace' }}>
                                        {f.prefix}
                                    </span>
                                </td>
                                <td style={{ ...tdS, fontFamily: 'monospace', color: '#475569' }}>
                                    {f.prefix}-YYYYMMDD-NNN
                                </td>
                                <td style={tdS}>
                                    <span style={{ background: '#f0fdf4', color: '#065f46', padding: '3px 12px', borderRadius: 20, fontSize: 12, fontFamily: 'monospace', fontWeight: 600, border: '1px solid #bbf7d0' }}>
                                        {f.example.replace('20260419', today)}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div style={{ marginTop: 16, fontSize: 12, color: '#64748b', background: '#f8fafc', borderRadius: 8, padding: '10px 16px' }}>
                    <b>Note:</b> NNN = 3-digit counter (001, 002, …) that increments per day per document type.
                    The counter resets automatically each new calendar day.
                </div>
            </div>

            {/* ── New FY Modal ────────────────────────────────── */}
            {showNew && (
                <div style={{ position: 'fixed', inset: 0, background: '#0006', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 400, boxShadow: '0 8px 32px #0003' }}>
                        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: '#1e293b' }}>Create New Financial Year</div>
                        <div style={{ marginBottom: 14 }}>
                            <label style={labelS}>Year Label *</label>
                            <input placeholder="e.g., 25-26" value={form.label}
                                onChange={e => setForm({ ...form, label: e.target.value })}
                                style={inputS} />
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Used in document numbers when FY is included</div>
                        </div>
                        <div style={{ marginBottom: 14 }}>
                            <label style={labelS}>Start Date *</label>
                            <input type="date" value={form.start_date}
                                onChange={e => setForm({ ...form, start_date: e.target.value })}
                                style={inputS} />
                        </div>
                        <div style={{ marginBottom: 20 }}>
                            <label style={labelS}>End Date *</label>
                            <input type="date" value={form.end_date}
                                onChange={e => setForm({ ...form, end_date: e.target.value })}
                                style={inputS} />
                        </div>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowNew(false)} style={smallBtn('#94a3b8')}>Cancel</button>
                            <button onClick={createFY}
                                disabled={!form.label || !form.start_date || !form.end_date}
                                style={btn('#2563eb')}>Create</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const thS     = { padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: '#475569', borderBottom: '2px solid #e2e8f0' };
const thSDark = { padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 12 };
const tdS     = { padding: '10px 14px', borderBottom: '1px solid #f1f5f9', fontSize: 13 };
const tag     = (bg) => ({ display: 'inline-block', padding: '2px 10px', borderRadius: 20, background: `${bg}18`, color: bg, fontSize: 11, fontWeight: 600 });
const btn     = (bg) => ({ padding: '8px 18px', background: bg, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 });
const smallBtn= (bg) => ({ padding: '5px 12px', background: 'transparent', color: bg, border: `1px solid ${bg}`, borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 12 });
const labelS  = { display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 };
const inputS  = { width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none' };
