// PAGE: Fabric Type Master — Buying House ERP
import { useState, useEffect, useCallback } from 'react';
import { usePageTheme } from '../../hooks/usePageTheme';
import { useSettings } from '../../context/SettingsContext';

const empty = { fabric_code: '', fabric_name: '', construction: '', fiber_content: '' };

export default function FabricTypePage() {
    const pt = usePageTheme();
    const thS      = { ...pt.th, textAlign: 'left' };
    const tdS      = { ...pt.cell, verticalAlign: 'middle' };
    const inpS     = { ...pt.inp };
    const searchS  = { ...pt.inp, width: 280, outline: 'none' };
    const formPage = { ...pt.formPage, maxWidth: 800 };
    const formHeader = pt.formHeader;
    const backBtnS = pt.backBtn;

    const [rows, setRows]     = useState([]);
    const [search, setSearch] = useState('');
    const [modal, setModal]   = useState(false);
    const [form, setForm]     = useState(empty);
    const [editId, setEditId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg]       = useState('');

    const load = useCallback(async () => {
        const p = new URLSearchParams();
        if (search) p.set('search', search);
        const res = await fetch(`/api/masters/fabric-types/?${p}`, { credentials: 'include' });
        const d = await res.json();
        setRows(d.fabrics || []);
    }, [search]);

    useEffect(() => { load(); }, [load]);

    const openAdd = () => { setForm(empty); setEditId(null); setMsg(''); setModal(true); };
    const openEdit = (r) => {
        setForm({
            fabric_code: r.fabric_code, fabric_name: r.fabric_name,
            construction: r.construction, fiber_content: r.fiber_content,
        });
        setEditId(r.id); setMsg(''); setModal(true);
    };

    const save = async () => {
        setSaving(true);
        const url = editId ? `/api/masters/fabric-types/${editId}/` : '/api/masters/fabric-types/';
        const res = await fetch(url, {
            method: editId ? 'PUT' : 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
        });
        setSaving(false);
        if (res.ok) { setModal(false); load(); }
        else { const d = await res.json(); setMsg(d.error || d.message || 'Error'); }
    };

    const del = async (id) => {
        if (!window.confirm('Deactivate this fabric type?')) return;
        await fetch(`/api/masters/fabric-types/${id}/`, { method: 'DELETE', credentials: 'include' });
        load();
    };

    const inp = (f) => ({ value: form[f], onChange: e => setForm(p => ({ ...p, [f]: e.target.value })) });

    return (
        <div style={{ padding: '24px 28px', fontFamily: 'Inter, sans-serif', color: pt.colors.text, minHeight: '100vh', backgroundColor: pt.colors.outer }}>
            {!modal ? (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Fabric Types</h2>
                            <p style={{ margin: '4px 0 0', color: pt.colors.dimText, fontSize: 13 }}>Fabric construction and fiber content master</p>
                        </div>
                        <button onClick={openAdd} style={btn('#06b6d4')}>+ Add Fabric Type</button>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                        <input placeholder="Search code / name…" value={search} onChange={e => setSearch(e.target.value)} style={searchS} />
                    </div>
                    <div style={{ backgroundColor: pt.colors.card, borderRadius: 12, overflow: 'hidden', overflowX: 'auto' }}>
                        <table style={tableS}><thead><tr>
                            {['Code', 'Fabric Name', 'Construction', 'Fiber Content', 'Actions'].map(h => <th key={h} style={thS}>{h}</th>)}
                        </tr></thead><tbody>
                            {rows.map(r => (
                                <tr key={r.id}>
                                    <td style={{ ...tdS, fontWeight: 600 }}>{r.fabric_code}</td>
                                    <td style={tdS}>{r.fabric_name}</td>
                                    <td style={tdS}>{r.construction || '—'}</td>
                                    <td style={tdS}>{r.fiber_content || '—'}</td>
                                    <td style={tdS}>
                                        <button onClick={() => openEdit(r)} style={smallBtn('#3b82f6')}>Edit</button>
                                        <button onClick={() => del(r.id)} style={smallBtn('#ef4444')}>Del</button>
                                    </td>
                                </tr>
                            ))}
                            {rows.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: pt.colors.muted }}>No fabric types</td></tr>}
                        </tbody></table>
                    </div>
                </>
            ) : (
                <div style={formPage}>
                    <div style={formHeader}>
                        <button onClick={() => setModal(false)} style={backBtnS}>← Back to Fabric Types</button>
                        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{editId ? 'Edit Fabric Type' : 'Add Fabric Type'}</h3>
                    </div>
                    <div style={grid2}>
                        <F label="Fabric Code *"><input style={inpS} {...inp('fabric_code')} /></F>
                        <F label="Fabric Name *"><input style={inpS} {...inp('fabric_name')} /></F>
                        <F label="Construction">
                            <input style={inpS} placeholder="e.g. Woven, Knit, Non-woven, Denim" {...inp('construction')} />
                        </F>
                        <F label="Fiber Content">
                            <input style={inpS} placeholder="e.g. 100% Cotton, 60% Cotton 40% Polyester" {...inp('fiber_content')} />
                        </F>
                    </div>
                    {msg && <div style={{ color: '#ef4444', marginTop: 8, fontSize: 13 }}>{msg}</div>}
                    <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
                        <button onClick={() => setModal(false)} style={smallBtn('#64748b')}>Cancel</button>
                        <button onClick={save} disabled={saving} style={btn('#06b6d4')}>{saving ? 'Saving…' : 'Save'}</button>
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
const grid2    = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 };
