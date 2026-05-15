// PAGE: Brand Master — Buying House ERP
import { useState, useEffect, useCallback } from 'react';
import { usePageTheme } from '../../hooks/usePageTheme';
import { useSettings } from '../../context/SettingsContext';

const empty = { brand_code: '', brand_name: '', customer_id: '', description: '' };

export default function BrandPage() {
    const pt = usePageTheme();
    const thS      = { ...pt.th, textAlign: 'left' };
    const tdS      = { ...pt.cell, verticalAlign: 'middle' };
    const inpS     = { ...pt.inp };
    const searchS  = { ...pt.inp, width: 280, outline: 'none' };
    const formPage = { ...pt.formPage, maxWidth: 800 };
    const formHeader = pt.formHeader;
    const backBtnS = pt.backBtn;

    const [rows, setRows]         = useState([]);
    const [customers, setCustomers] = useState([]);
    const [search, setSearch]     = useState('');
    const [modal, setModal]       = useState(false);
    const [form, setForm]         = useState(empty);
    const [editId, setEditId]     = useState(null);
    const [saving, setSaving]     = useState(false);
    const [msg, setMsg]           = useState('');

    const load = useCallback(async () => {
        const p = new URLSearchParams();
        if (search) p.set('search', search);
        const res = await fetch(`/api/masters/brands/?${p}`, { credentials: 'include' });
        const d = await res.json();
        setRows(d.brands || []);
    }, [search]);

    const loadCustomers = useCallback(async () => {
        const res = await fetch('/api/masters/customers/', { credentials: 'include' });
        const d = await res.json();
        setCustomers(d.customers || []);
    }, []);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { loadCustomers(); }, [loadCustomers]);

    const openAdd = () => { setForm(empty); setEditId(null); setMsg(''); setModal(true); };
    const openEdit = (r) => {
        setForm({
            brand_code: r.brand_code, brand_name: r.brand_name,
            customer_id: r.customer_id || '', description: r.description,
        });
        setEditId(r.id); setMsg(''); setModal(true);
    };

    const save = async () => {
        setSaving(true);
        const url = editId ? `/api/masters/brands/${editId}/` : '/api/masters/brands/';
        const payload = { ...form, customer_id: form.customer_id || null };
        const res = await fetch(url, {
            method: editId ? 'PUT' : 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        });
        setSaving(false);
        if (res.ok) { setModal(false); load(); }
        else { const d = await res.json(); setMsg(d.error || d.message || 'Error'); }
    };

    const del = async (id) => {
        if (!window.confirm('Deactivate this brand?')) return;
        await fetch(`/api/masters/brands/${id}/`, { method: 'DELETE', credentials: 'include' });
        load();
    };

    const inp = (f) => ({ value: form[f], onChange: e => setForm(p => ({ ...p, [f]: e.target.value })) });

    return (
        <div style={{ padding: '24px 28px', fontFamily: 'Inter, sans-serif', color: pt.colors.text, minHeight: '100vh', backgroundColor: pt.colors.outer }}>
            {!modal ? (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Brands</h2>
                            <p style={{ margin: '4px 0 0', color: pt.colors.dimText, fontSize: 13 }}>Brand master linked to customers</p>
                        </div>
                        <button onClick={openAdd} style={btn('#8b5cf6')}>+ Add Brand</button>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                        <input placeholder="Search code / name…" value={search} onChange={e => setSearch(e.target.value)} style={searchS} />
                    </div>
                    <div style={{ backgroundColor: pt.colors.card, borderRadius: 12, overflow: 'hidden', overflowX: 'auto' }}>
                        <table style={tableS}><thead><tr>
                            {['Code', 'Brand Name', 'Customer', 'Description', 'Actions'].map(h => <th key={h} style={thS}>{h}</th>)}
                        </tr></thead><tbody>
                            {rows.map(r => (
                                <tr key={r.id}>
                                    <td style={{ ...tdS, fontWeight: 600 }}>{r.brand_code}</td>
                                    <td style={tdS}>{r.brand_name}</td>
                                    <td style={tdS}>{r.customer_name || '—'}</td>
                                    <td style={{ ...tdS, color: pt.colors.dimText }}>{r.description || '—'}</td>
                                    <td style={tdS}>
                                        <button onClick={() => openEdit(r)} style={smallBtn('#3b82f6')}>Edit</button>
                                        <button onClick={() => del(r.id)} style={smallBtn('#ef4444')}>Del</button>
                                    </td>
                                </tr>
                            ))}
                            {rows.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: pt.colors.muted }}>No brands</td></tr>}
                        </tbody></table>
                    </div>
                </>
            ) : (
                <div style={formPage}>
                    <div style={formHeader}>
                        <button onClick={() => setModal(false)} style={backBtnS}>← Back to Brands</button>
                        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{editId ? 'Edit Brand' : 'Add Brand'}</h3>
                    </div>
                    <div style={grid2}>
                        <F label="Brand Code *"><input style={inpS} {...inp('brand_code')} /></F>
                        <F label="Brand Name *"><input style={inpS} {...inp('brand_name')} /></F>
                        <F label="Customer (optional)">
                            <select style={inpS} {...inp('customer_id')}>
                                <option value="">— Select Customer —</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.customer_name}</option>)}
                            </select>
                        </F>
                    </div>
                    <F label="Description">
                        <textarea style={{ ...inpS, height: 80, resize: 'vertical' }} {...inp('description')} />
                    </F>
                    {msg && <div style={{ color: '#ef4444', marginTop: 8, fontSize: 13 }}>{msg}</div>}
                    <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
                        <button onClick={() => setModal(false)} style={smallBtn('#64748b')}>Cancel</button>
                        <button onClick={save} disabled={saving} style={btn('#8b5cf6')}>{saving ? 'Saving…' : 'Save'}</button>
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
