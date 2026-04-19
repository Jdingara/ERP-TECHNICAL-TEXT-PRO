// PAGE: Vendor Master
import { useState, useEffect, useCallback } from 'react';

const empty = {
    vendor_code: '', vendor_name: '', vendor_type: 'raw_material',
    contact_person: '', phone: '', email: '', address: '',
    city: '', state: '', gstin: '', pan_number: '', credit_days: '30',
};

export default function VendorPage() {
    const [rows,   setRows]   = useState([]);
    const [search, setSearch] = useState('');
    const [modal,  setModal]  = useState(false);
    const [form,   setForm]   = useState(empty);
    const [editId, setEditId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [msg,    setMsg]    = useState('');

    const load = useCallback(async () => {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        const res = await fetch(`/api/masters/vendors/?${params}`, { credentials: 'include' });
        const data = await res.json();
        setRows(data.vendors || []);
    }, [search]);

    useEffect(() => { load(); }, [load]);

    const openAdd  = () => { setForm(empty); setEditId(null); setMsg(''); setModal(true); };
    const openEdit = (r) => {
        setForm({ vendor_code: r.vendor_code, vendor_name: r.vendor_name, vendor_type: r.vendor_type,
            contact_person: r.contact_person, phone: r.phone, email: r.email, address: r.address,
            city: r.city, state: r.state, gstin: r.gstin, pan_number: r.pan_number, credit_days: r.credit_days });
        setEditId(r.id); setMsg(''); setModal(true);
    };

    const save = async () => {
        setSaving(true);
        const url = editId ? `/api/masters/vendors/${editId}/` : '/api/masters/vendors/';
        const res = await fetch(url, { method: editId ? 'PUT' : 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        setSaving(false);
        if (res.ok) { setModal(false); load(); }
        else { const d = await res.json(); setMsg(d.error || 'Error'); }
    };

    const del = async (id) => {
        if (!window.confirm('Deactivate this vendor?')) return;
        await fetch(`/api/masters/vendors/${id}/`, { method: 'DELETE', credentials: 'include' });
        load();
    };

    const inp = (f) => ({ value: form[f], onChange: e => setForm(p => ({ ...p, [f]: e.target.value })) });

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Vendors</h2>
                <button onClick={openAdd} style={btn('#10b981')}>+ Add Vendor</button>
            </div>
            <div style={{ marginBottom: 16 }}>
                <input placeholder="Search code / name / GSTIN…" value={search}
                    onChange={e => setSearch(e.target.value)} style={searchStyle} />
            </div>
            <div style={{ overflowX: 'auto' }}>
                <table style={tableStyle}>
                    <thead><tr style={{ background: '#1e293b', color: '#fff' }}>
                        {['Code', 'Name', 'Type', 'Contact', 'Phone', 'GSTIN', 'City', 'Credit Days', 'Actions'].map(h =>
                            <th key={h} style={thStyle}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                        {rows.map((r, i) => (
                            <tr key={r.id} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
                                <td style={tdStyle}><b>{r.vendor_code}</b></td>
                                <td style={tdStyle}>{r.vendor_name}</td>
                                <td style={tdStyle}><span style={tag('#10b981')}>{r.vendor_type}</span></td>
                                <td style={tdStyle}>{r.contact_person}</td>
                                <td style={tdStyle}>{r.phone}</td>
                                <td style={tdStyle}>{r.gstin}</td>
                                <td style={tdStyle}>{r.city}</td>
                                <td style={tdStyle}>{r.credit_days} days</td>
                                <td style={tdStyle}>
                                    <button onClick={() => openEdit(r)} style={smallBtn('#3b82f6')}>Edit</button>
                                    <button onClick={() => del(r.id)} style={smallBtn('#ef4444')}>Delete</button>
                                </td>
                            </tr>
                        ))}
                        {rows.length === 0 && <tr><td colSpan={9} style={empty_td}>No vendors found</td></tr>}
                    </tbody>
                </table>
            </div>

            {modal && (
                <div style={overlay}>
                    <div style={modalBox}>
                        <h3 style={{ margin: '0 0 20px' }}>{editId ? 'Edit Vendor' : 'Add Vendor'}</h3>
                        <div style={grid2}>
                            <F label="Vendor Code *"><input style={inp_s} {...inp('vendor_code')} /></F>
                            <F label="Vendor Name *"><input style={inp_s} {...inp('vendor_name')} /></F>
                            <F label="Type">
                                <select style={inp_s} {...inp('vendor_type')}>
                                    <option value="raw_material">Raw Material Supplier</option>
                                    <option value="job_work">Job Work Vendor</option>
                                    <option value="both">Both</option>
                                </select>
                            </F>
                            <F label="Contact Person"><input style={inp_s} {...inp('contact_person')} /></F>
                            <F label="Phone"><input style={inp_s} {...inp('phone')} /></F>
                            <F label="Email"><input style={inp_s} {...inp('email')} /></F>
                            <F label="GSTIN"><input style={inp_s} {...inp('gstin')} /></F>
                            <F label="PAN Number"><input style={inp_s} {...inp('pan_number')} /></F>
                            <F label="City"><input style={inp_s} {...inp('city')} /></F>
                            <F label="State"><input style={inp_s} {...inp('state')} /></F>
                            <F label="Credit Days"><input style={inp_s} type="number" {...inp('credit_days')} /></F>
                        </div>
                        <F label="Address"><textarea style={{ ...inp_s, height: 70, resize: 'vertical' }} {...inp('address')} /></F>
                        {msg && <div style={{ color: '#ef4444', marginTop: 8 }}>{msg}</div>}
                        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                            <button onClick={() => setModal(false)} style={smallBtn('#64748b')}>Cancel</button>
                            <button onClick={save} disabled={saving} style={btn('#10b981')}>{saving ? 'Saving…' : 'Save'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const F = ({ label, children }) => (
    <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>{label}</label>{children}</div>
);
const btn        = (bg) => ({ padding: '8px 18px', background: bg, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 });
const smallBtn   = (bg) => ({ padding: '4px 10px', background: bg, color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12, marginRight: 4 });
const searchStyle = { padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, width: 300, outline: 'none' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const thStyle    = { padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 12 };
const tdStyle    = { padding: '10px 14px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' };
const tag        = (bg) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 12, background: `${bg}20`, color: bg, fontSize: 11, fontWeight: 600 });
const overlay    = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300 };
const modalBox   = { background: '#fff', borderRadius: 12, padding: 28, width: 700, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' };
const grid2      = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 };
const inp_s      = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, boxSizing: 'border-box' };
const empty_td   = { textAlign: 'center', padding: 40, color: '#94a3b8' };
