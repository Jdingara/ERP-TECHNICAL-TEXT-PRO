// PAGE: Defect Types Master
import { useState, useEffect, useCallback } from 'react';

const empty = { defect_code: '', defect_name: '', defect_category: 'weaving', severity: 'minor', description: '' };

export default function DefectTypesPage() {
    const [rows,   setRows]   = useState([]);
    const [search, setSearch] = useState('');
    const [modal,  setModal]  = useState(false);
    const [form,   setForm]   = useState(empty);
    const [editId, setEditId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [msg,    setMsg]    = useState('');

    const load = useCallback(async () => {
        const p = new URLSearchParams();
        if (search) p.set('search', search);
        const res = await fetch(`/api/quality/defect-types/?${p}`, { credentials: 'include' });
        const d = await res.json();
        setRows(d.defect_types || []);
    }, [search]);

    useEffect(() => { load(); }, [load]);

    const openAdd  = () => { setForm(empty); setEditId(null); setMsg(''); setModal(true); };
    const openEdit = (r) => {
        setForm({ defect_code: r.defect_code, defect_name: r.defect_name, defect_category: r.defect_category,
            severity: r.severity, description: r.description || '' });
        setEditId(r.id); setMsg(''); setModal(true);
    };

    const save = async () => {
        setSaving(true);
        const url = editId ? `/api/quality/defect-types/${editId}/` : '/api/quality/defect-types/';
        const res = await fetch(url, { method: editId ? 'PUT' : 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        setSaving(false);
        if (res.ok) { setModal(false); load(); }
        else { const d = await res.json(); setMsg(d.error || 'Error'); }
    };

    const del = async (id) => {
        if (!window.confirm('Delete this defect type?')) return;
        await fetch(`/api/quality/defect-types/${id}/`, { method: 'DELETE', credentials: 'include' });
        load();
    };

    const inp = (f) => ({ value: form[f], onChange: e => setForm(p => ({ ...p, [f]: e.target.value })) });

    const SEV_COLOR = { minor: '#f59e0b', major: '#f97316', critical: '#ef4444' };

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Defect Types</h2>
                <button onClick={openAdd} style={btn('#ef4444')}>+ Add Defect Type</button>
            </div>
            <div style={{ marginBottom: 16 }}>
                <input placeholder="Search defect code / name…" value={search}
                    onChange={e => setSearch(e.target.value)} style={searchS} />
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={tableS}><thead><tr style={{ background: '#1e293b', color: '#fff' }}>
                    {['Code', 'Defect Name', 'Category', 'Severity', 'Description', 'Actions'].map(h =>
                        <th key={h} style={thS}>{h}</th>)}
                </tr></thead><tbody>
                    {rows.map((r, i) => (
                        <tr key={r.id} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
                            <td style={tdS}><b>{r.defect_code}</b></td>
                            <td style={tdS}>{r.defect_name}</td>
                            <td style={tdS}>{r.defect_category}</td>
                            <td style={tdS}><span style={tag(SEV_COLOR[r.severity] || '#64748b')}>{r.severity}</span></td>
                            <td style={tdS}>{r.description || '—'}</td>
                            <td style={tdS}>
                                <button onClick={() => openEdit(r)} style={smallBtn('#3b82f6')}>Edit</button>
                                <button onClick={() => del(r.id)} style={smallBtn('#ef4444')}>Delete</button>
                            </td>
                        </tr>
                    ))}
                    {rows.length === 0 && <tr><td colSpan={6} style={emptyTd}>No defect types defined</td></tr>}
                </tbody></table>
            </div>

            {modal && (
                <div style={overlay}>
                    <div style={{ ...modalBox, width: 560 }}>
                        <h3 style={{ margin: '0 0 20px' }}>{editId ? 'Edit Defect Type' : 'Add Defect Type'}</h3>
                        <div style={grid2}>
                            <F label="Defect Code *"><input style={inpS} {...inp('defect_code')} /></F>
                            <F label="Defect Name *"><input style={inpS} {...inp('defect_name')} /></F>
                            <F label="Category">
                                <select style={inpS} {...inp('defect_category')}>
                                    <option value="weaving">Weaving</option>
                                    <option value="yarn">Yarn</option>
                                    <option value="finishing">Finishing</option>
                                    <option value="dyeing">Dyeing</option>
                                    <option value="dimensional">Dimensional</option>
                                    <option value="other">Other</option>
                                </select>
                            </F>
                            <F label="Severity">
                                <select style={inpS} {...inp('severity')}>
                                    <option value="minor">Minor</option>
                                    <option value="major">Major</option>
                                    <option value="critical">Critical</option>
                                </select>
                            </F>
                        </div>
                        <F label="Description"><textarea style={{ ...inpS, height: 70, resize: 'vertical' }} {...inp('description')} /></F>
                        {msg && <div style={{ color: '#ef4444', marginTop: 8 }}>{msg}</div>}
                        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                            <button onClick={() => setModal(false)} style={smallBtn('#64748b')}>Cancel</button>
                            <button onClick={save} disabled={saving} style={btn('#ef4444')}>{saving ? 'Saving…' : 'Save'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const F        = ({ label, children }) => (<div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>{label}</label>{children}</div>);
const btn      = (bg) => ({ padding: '8px 18px', background: bg, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 });
const smallBtn = (bg) => ({ padding: '4px 10px', background: bg, color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12, marginRight: 4 });
const tableS   = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const thS      = { padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 12 };
const tdS      = { padding: '10px 14px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' };
const overlay  = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300 };
const modalBox = { background: '#fff', borderRadius: 12, padding: 28, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' };
const grid2    = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 };
const inpS     = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, boxSizing: 'border-box' };
const searchS  = { padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, width: 280, outline: 'none' };
const tag      = (bg) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 12, background: `${bg}20`, color: bg, fontSize: 11, fontWeight: 600 });
const emptyTd  = { textAlign: 'center', padding: 40, color: '#94a3b8' };
