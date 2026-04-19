// ============================================================
// PAGE: Yarn Master
// API: GET/POST /api/masters/yarn/   GET/PUT /api/masters/yarn/:id/
// ============================================================
import { useState, useEffect, useCallback } from 'react';

const YARN_TYPES = ['warp', 'weft', 'zari', 'other'];

const empty = {
    item_code: '', item_name: '', yarn_type: 'warp', count: '',
    composition: '', color_code: '', color_name: '', uom_id: '', reorder_level: '0',
};

export default function YarnPage() {
    const [rows,    setRows]    = useState([]);
    const [uoms,    setUoms]    = useState([]);
    const [search,  setSearch]  = useState('');
    const [filter,  setFilter]  = useState('');
    const [modal,   setModal]   = useState(false);
    const [form,    setForm]    = useState(empty);
    const [editId,  setEditId]  = useState(null);
    const [saving,  setSaving]  = useState(false);
    const [msg,     setMsg]     = useState('');

    const load = useCallback(async () => {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (filter) params.set('yarn_type', filter);
        const res = await fetch(`/api/masters/yarn/?${params}`, { credentials: 'include' });
        const data = await res.json();
        setRows(data.yarns || []);
    }, [search, filter]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        fetch('/api/masters/uom/', { credentials: 'include' })
            .then(r => r.json()).then(d => setUoms(d.uoms || []));
    }, []);

    const openAdd  = () => { setForm(empty); setEditId(null); setModal(true); };
    const openEdit = (row) => {
        setForm({
            item_code: row.item_code, item_name: row.item_name,
            yarn_type: row.yarn_type, count: row.count,
            composition: row.composition, color_code: row.color_code,
            color_name: row.color_name, uom_id: row.uom_id || '',
            reorder_level: row.reorder_level,
        });
        setEditId(row.id);
        setModal(true);
    };

    const save = async () => {
        setSaving(true);
        const url    = editId ? `/api/masters/yarn/${editId}/` : '/api/masters/yarn/';
        const method = editId ? 'PUT' : 'POST';
        const res    = await fetch(url, {
            method, credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
        });
        setSaving(false);
        if (res.ok) { setModal(false); setMsg('Saved!'); load(); setTimeout(() => setMsg(''), 2000); }
        else { const d = await res.json(); setMsg(d.error || 'Error saving'); }
    };

    const del = async (id) => {
        if (!window.confirm('Deactivate this yarn?')) return;
        await fetch(`/api/masters/yarn/${id}/`, { method: 'DELETE', credentials: 'include' });
        load();
    };

    const inp = (f) => ({ value: form[f], onChange: e => setForm(p => ({ ...p, [f]: e.target.value })) });

    return (
        <div style={{ padding: 24 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Yarn Master</h2>
                <button onClick={openAdd} style={btnStyle('#10b981')}>+ Add Yarn</button>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <input placeholder="Search code / name / color…" value={search}
                    onChange={e => setSearch(e.target.value)} style={searchStyle} />
                <select value={filter} onChange={e => setFilter(e.target.value)} style={selectStyle}>
                    <option value="">All Types</option>
                    {YARN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>

            {msg && <div style={{ padding: '8px 16px', background: '#dcfce7', borderRadius: 6, marginBottom: 12, color: '#166534' }}>{msg}</div>}

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
                <table style={tableStyle}>
                    <thead>
                        <tr style={{ background: '#1e293b', color: '#fff' }}>
                            {['Code', 'Name', 'Type', 'Count', 'Composition', 'Color', 'UOM', 'Reorder', 'Actions'].map(h =>
                                <th key={h} style={thStyle}>{h}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r, i) => (
                            <tr key={r.id} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
                                <td style={tdStyle}><b>{r.item_code}</b></td>
                                <td style={tdStyle}>{r.item_name}</td>
                                <td style={tdStyle}><span style={tagStyle('#6366f1')}>{r.yarn_type}</span></td>
                                <td style={tdStyle}>{r.count}</td>
                                <td style={tdStyle}>{r.composition}</td>
                                <td style={tdStyle}>
                                    {r.color_code && <span style={{ ...tagStyle('#f59e0b'), marginRight: 4 }}>{r.color_code}</span>}
                                    {r.color_name}
                                </td>
                                <td style={tdStyle}>{r.uom_name}</td>
                                <td style={tdStyle}>{r.reorder_level}</td>
                                <td style={tdStyle}>
                                    <button onClick={() => openEdit(r)} style={smallBtn('#3b82f6')}>Edit</button>
                                    <button onClick={() => del(r.id)} style={smallBtn('#ef4444')}>Delete</button>
                                </td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No yarn records found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {modal && (
                <div style={overlay}>
                    <div style={modalBox}>
                        <h3 style={{ margin: '0 0 20px', fontSize: 18 }}>{editId ? 'Edit Yarn' : 'Add Yarn'}</h3>
                        <div style={grid2}>
                            <Field label="Item Code *"><input style={inputStyle} {...inp('item_code')} /></Field>
                            <Field label="Item Name *"><input style={inputStyle} {...inp('item_name')} /></Field>
                            <Field label="Yarn Type">
                                <select style={inputStyle} {...inp('yarn_type')}>
                                    {YARN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </Field>
                            <Field label="Count (e.g. 2/80)"><input style={inputStyle} {...inp('count')} /></Field>
                            <Field label="Composition"><input style={inputStyle} {...inp('composition')} /></Field>
                            <Field label="Color Code"><input style={inputStyle} {...inp('color_code')} /></Field>
                            <Field label="Color Name"><input style={inputStyle} {...inp('color_name')} /></Field>
                            <Field label="UOM">
                                <select style={inputStyle} {...inp('uom_id')}>
                                    <option value="">-- Select --</option>
                                    {uoms.map(u => <option key={u.id} value={u.id}>{u.name} ({u.short_name})</option>)}
                                </select>
                            </Field>
                            <Field label="Reorder Level"><input style={inputStyle} type="number" {...inp('reorder_level')} /></Field>
                        </div>
                        {msg && <div style={{ color: '#ef4444', marginTop: 8 }}>{msg}</div>}
                        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                            <button onClick={() => setModal(false)} style={smallBtn('#64748b')}>Cancel</button>
                            <button onClick={save} disabled={saving} style={btnStyle('#10b981')}>{saving ? 'Saving…' : 'Save'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Field({ label, children }) {
    return (
        <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>{label}</label>
            {children}
        </div>
    );
}

// ── Shared styles ──────────────────────────────────────────────
const btnStyle = (bg) => ({
    padding: '8px 18px', background: bg, color: '#fff', border: 'none',
    borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13,
});
const smallBtn = (bg) => ({
    padding: '4px 10px', background: bg, color: '#fff', border: 'none',
    borderRadius: 5, cursor: 'pointer', fontSize: 12, marginRight: 4,
});
const searchStyle = {
    padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0',
    fontSize: 13, width: 280, outline: 'none',
};
const selectStyle = {
    padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13,
};
const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const thStyle = { padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 12 };
const tdStyle = { padding: '10px 14px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' };
const tagStyle = (bg) => ({
    display: 'inline-block', padding: '2px 8px', borderRadius: 12,
    background: `${bg}20`, color: bg, fontSize: 11, fontWeight: 600,
});
const overlay = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300,
};
const modalBox = {
    background: '#fff', borderRadius: 12, padding: 28, width: 680, maxHeight: '90vh',
    overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
};
const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 };
const inputStyle = {
    width: '100%', padding: '8px 12px', borderRadius: 8,
    border: '1px solid #e2e8f0', fontSize: 13, boxSizing: 'border-box',
};
