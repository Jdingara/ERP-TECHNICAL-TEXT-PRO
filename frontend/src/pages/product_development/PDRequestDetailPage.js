// PAGE: PD Request Detail — Tabs: Overview | Tech Spec | Vendors | Sampling
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePageTheme } from '../../hooks/usePageTheme';
import { useSettings } from '../../context/SettingsContext';

const STATUS_META = {
    draft:              { label: 'Draft',              color: '#64748b' },
    open:               { label: 'Open',               color: '#3b82f6' },
    vendor_assigned:    { label: 'Vendor Assigned',    color: '#f59e0b' },
    sample_in_progress: { label: 'Sample In Progress', color: '#8b5cf6' },
    sample_received:    { label: 'Sample Received',    color: '#06b6d4' },
    testing:            { label: 'Testing',            color: '#ec4899' },
    approved:           { label: 'Approved',           color: '#10b981' },
    rejected:           { label: 'Rejected',           color: '#ef4444' },
    cancelled:          { label: 'Cancelled',          color: '#94a3b8' },
};
const STATUSES = Object.entries(STATUS_META).map(([v, { label }]) => ({ value: v, label }));

export default function PDRequestDetailPage() {
    const { id } = useParams();
    const nav = useNavigate();
    const pt = usePageTheme();
    const inpS = { ...pt.inp };
    const [pd, setPd] = useState(null);
    const [tab, setTab] = useState('overview');
    const [loading, setLoading] = useState(true);

    // dropdowns
    const [vendors, setVendors]         = useState([]);
    const [fabricTypes, setFabricTypes] = useState([]);
    const [testingParams, setTestingParams] = useState([]);
    const [customers, setCustomers]     = useState([]);
    const [brands, setBrands]           = useState([]);
    const [categories, setCategories]   = useState([]);

    const loadPD = useCallback(async () => {
        setLoading(true);
        const res = await fetch(`/api/pd/requests/${id}/`, { credentials: 'include' });
        const d = await res.json();
        setPd(d.pd_request);
        setLoading(false);
    }, [id]);

    const loadDropdowns = useCallback(async () => {
        const [v, f, tp, c, b, cat] = await Promise.all([
            fetch('/api/masters/vendors/', { credentials: 'include' }).then(r => r.json()),
            fetch('/api/masters/fabric-types/', { credentials: 'include' }).then(r => r.json()),
            fetch('/api/masters/testing-params/', { credentials: 'include' }).then(r => r.json()),
            fetch('/api/masters/customers/', { credentials: 'include' }).then(r => r.json()),
            fetch('/api/masters/brands/', { credentials: 'include' }).then(r => r.json()),
            fetch('/api/masters/categories/', { credentials: 'include' }).then(r => r.json()),
        ]);
        setVendors(v.vendors || []);
        setFabricTypes(f.fabrics || []);
        setTestingParams(tp.parameters || []);
        setCustomers(c.customers || []);
        setBrands(b.brands || []);
        setCategories(cat.categories || []);
    }, []);

    useEffect(() => { loadPD(); }, [loadPD]);
    useEffect(() => { loadDropdowns(); }, [loadDropdowns]);

    if (loading) return <div style={{ padding: 40, color: pt.colors.text }}>Loading…</div>;
    if (!pd) return <div style={{ padding: 40, color: '#ef4444' }}>PD Request not found.</div>;

    const sm = STATUS_META[pd.status] || STATUS_META.draft;

    return (
        <div style={{ padding: '24px 28px', fontFamily: 'Inter, sans-serif', color: pt.colors.text, minHeight: '100vh', backgroundColor: pt.colors.outer }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
                <button onClick={() => nav('/product-development')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: pt.colors.dimText, fontSize: 13 }}>← Back</button>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{pd.pd_number}</h2>
                <span style={tag(sm.color)}>{sm.label}</span>
            </div>
            <p style={{ margin: '0 0 20px', color: pt.colors.dimText, fontSize: 14 }}>{pd.title}</p>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 0, borderBottom: `2px solid ${pt.colors.border || '#e2e8f0'}`, marginBottom: 24 }}>
                {['overview', 'tech_spec', 'vendors', 'sampling'].map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        style={{ padding: '8px 20px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: tab === t ? 700 : 400, fontSize: 13, color: tab === t ? '#8b5cf6' : pt.colors.dimText, borderBottom: tab === t ? '2px solid #8b5cf6' : '2px solid transparent', marginBottom: -2 }}>
                        { { overview: 'Overview', tech_spec: 'Tech Spec', vendors: 'Vendors', sampling: 'Sampling' }[t] }
                    </button>
                ))}
            </div>

            {tab === 'overview' && <OverviewTab pd={pd} inpS={inpS} pt={pt} reload={loadPD} customers={customers} brands={brands} categories={categories} />}
            {tab === 'tech_spec' && <TechSpecTab pd={pd} inpS={inpS} pt={pt} reload={loadPD} fabricTypes={fabricTypes} testingParams={testingParams} />}
            {tab === 'vendors' && <VendorsTab pd={pd} inpS={inpS} pt={pt} reload={loadPD} allVendors={vendors} />}
            {tab === 'sampling' && <SamplingTab pd={pd} inpS={inpS} pt={pt} reload={loadPD} />}
        </div>
    );
}


// ── Overview Tab ──────────────────────────────────────────────
function OverviewTab({ pd, inpS, pt, reload, customers, brands, categories }) {
    const { settings } = useSettings();
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ title: pd.title, status: pd.status, customer_id: pd.customer_id || '', brand_id: pd.brand_id || '', category_id: pd.category_id || '', required_by: pd.required_by || '', notes: pd.notes });
    const [saving, setSaving] = useState(false);

    const save = async () => {
        setSaving(true);
        await fetch(`/api/pd/requests/${pd.id}/`, {
            method: 'PUT', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, customer_id: form.customer_id || null, brand_id: form.brand_id || null, category_id: form.category_id || null, required_by: form.required_by || null }),
        });
        setSaving(false); setEditing(false); reload();
    };

    const inp = (f) => ({ value: form[f], onChange: e => setForm(p => ({ ...p, [f]: e.target.value })) });

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                {!editing
                    ? <button onClick={() => setEditing(true)} style={smallBtn('#3b82f6')}>Edit</button>
                    : <><button onClick={() => setEditing(false)} style={smallBtn('#64748b')}>Cancel</button>
                       <button onClick={save} disabled={saving} style={{ ...smallBtn('#10b981'), marginLeft: 8 }}>{saving ? 'Saving…' : 'Save'}</button></>
                }
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {editing ? (
                    <>
                        <FLabel label="Title" span={2}><input style={{ ...inpS, width: '100%' }} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></FLabel>
                        <FLabel label="Customer"><select style={inpS} {...inp('customer_id')}><option value="">—</option>{customers.map(c => <option key={c.id} value={c.id}>{c.customer_name}</option>)}</select></FLabel>
                        <FLabel label="Brand"><select style={inpS} {...inp('brand_id')}><option value="">—</option>{brands.map(b => <option key={b.id} value={b.id}>{b.brand_name}</option>)}</select></FLabel>
                        <FLabel label="Category"><select style={inpS} {...inp('category_id')}><option value="">—</option>{categories.map(c => <option key={c.id} value={c.id}>{c.category_name}</option>)}</select></FLabel>
                        <FLabel label="Status"><select style={inpS} {...inp('status')}>{STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></FLabel>
                        <FLabel label="Required By"><input type="date" style={inpS} {...inp('required_by')} /></FLabel>
                        <FLabel label="Notes" span={2}><textarea style={{ ...inpS, height: 80, resize: 'vertical', width: '100%' }} {...inp('notes')} /></FLabel>
                    </>
                ) : (
                    <>
                        <InfoRow label="PD Number" value={pd.pd_number} bold />
                        <InfoRow label="Status" value={<span style={tag((STATUS_META[pd.status] || {}).color || '#64748b')}>{(STATUS_META[pd.status] || {}).label}</span>} />
                        <InfoRow label="Customer" value={pd.customer_name || '—'} />
                        <InfoRow label="Brand" value={pd.brand_name || '—'} />
                        <InfoRow label="Category" value={pd.category_name || '—'} />
                        <InfoRow label="Request Date" value={pd.request_date} />
                        <InfoRow label="Required By" value={pd.required_by || '—'} />
                        <InfoRow label="Created By" value={pd.created_by || '—'} />
                        <InfoRow label="Notes" value={pd.notes || '—'} span={2} />
                    </>
                )}
            </div>
        </div>
    );
}


// ── Tech Spec Tab ─────────────────────────────────────────────
function TechSpecTab({ pd, inpS, pt, reload, fabricTypes, testingParams }) {
    const spec = pd.tech_spec;
    const [form, setForm] = useState({
        fabric_type_id: spec?.fabric_type_id || '',
        construction: spec?.construction || '',
        size_dimension_variants: spec?.size_dimension_variants || '',
        packaging_specs: spec?.packaging_specs || '',
        additional_notes: spec?.additional_notes || '',
        testing_params: spec?.testing_params || [],
    });
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');

    const addTestParam = () => {
        setForm(p => ({ ...p, testing_params: [...p.testing_params, { parameter_id: '', acceptance_override: '' }] }));
    };

    const removeTestParam = (idx) => {
        setForm(p => ({ ...p, testing_params: p.testing_params.filter((_, i) => i !== idx) }));
    };

    const updateTestParam = (idx, field, val) => {
        setForm(p => {
            const tp = [...p.testing_params];
            tp[idx] = { ...tp[idx], [field]: val };
            if (field === 'parameter_id') {
                const master = testingParams.find(t => String(t.id) === String(val));
                tp[idx].acceptance_criteria = master?.acceptance_criteria || '';
                tp[idx].test_standard = master?.test_standard || '';
                tp[idx].unit = master?.unit || '';
            }
            return { ...p, testing_params: tp };
        });
    };

    const save = async () => {
        setSaving(true); setMsg('');
        const res = await fetch(`/api/pd/requests/${pd.id}/tech-spec/`, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, fabric_type_id: form.fabric_type_id || null }),
        });
        setSaving(false);
        if (res.ok) { setMsg(''); reload(); } else { const d = await res.json(); setMsg(d.error || 'Error'); }
    };

    const inp = (f) => ({ value: form[f], onChange: e => setForm(p => ({ ...p, [f]: e.target.value })) });

    return (
        <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <FLabel label="Fabric Type">
                    <select style={inpS} value={form.fabric_type_id} onChange={e => setForm(p => ({ ...p, fabric_type_id: e.target.value }))}>
                        <option value="">— Select Fabric Type —</option>
                        {fabricTypes.map(f => <option key={f.id} value={f.id}>{f.fabric_name} ({f.fiber_content})</option>)}
                    </select>
                </FLabel>
                <FLabel label="Construction">
                    <input style={inpS} placeholder="e.g. Woven, 2/1 Twill" {...inp('construction')} />
                </FLabel>
                <FLabel label="Size / Dimension Variants" span={2}>
                    <input style={{ ...inpS, width: '100%' }} placeholder="e.g. S, M, L, XL / 38x40cm / One Size" {...inp('size_dimension_variants')} />
                </FLabel>
                <FLabel label="Packaging Specs" span={2}>
                    <textarea style={{ ...inpS, height: 80, resize: 'vertical', width: '100%' }} placeholder="Polybag, inner box, carton specs, labelling requirements…" {...inp('packaging_specs')} />
                </FLabel>
                <FLabel label="Additional Notes" span={2}>
                    <textarea style={{ ...inpS, height: 70, resize: 'vertical', width: '100%' }} {...inp('additional_notes')} />
                </FLabel>
            </div>

            {/* Testing Params */}
            <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <strong style={{ fontSize: 14 }}>Testing Parameters with Acceptance Levels</strong>
                    <button onClick={addTestParam} style={smallBtn('#8b5cf6')}>+ Add Parameter</button>
                </div>
                {form.testing_params.length === 0 && (
                    <div style={{ color: pt.colors.muted, fontSize: 13, padding: '12px 0' }}>No testing parameters added yet.</div>
                )}
                {form.testing_params.map((tp, idx) => {
                    const master = testingParams.find(t => String(t.id) === String(tp.parameter_id));
                    return (
                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 12, marginBottom: 10, alignItems: 'end' }}>
                            <FLabel label={idx === 0 ? 'Parameter' : ''}>
                                <select style={inpS} value={tp.parameter_id} onChange={e => updateTestParam(idx, 'parameter_id', e.target.value)}>
                                    <option value="">— Select Parameter —</option>
                                    {testingParams.map(t => <option key={t.id} value={t.id}>{t.parameter_name} ({t.test_standard})</option>)}
                                </select>
                            </FLabel>
                            <FLabel label={idx === 0 ? 'Standard Acceptance' : ''}>
                                <input style={{ ...inpS, background: pt.colors.outer, opacity: 0.7 }} value={master?.acceptance_criteria || ''} readOnly />
                            </FLabel>
                            <FLabel label={idx === 0 ? 'Override Acceptance' : ''}>
                                <input style={inpS} placeholder="Optional override" value={tp.acceptance_override} onChange={e => updateTestParam(idx, 'acceptance_override', e.target.value)} />
                            </FLabel>
                            <button onClick={() => removeTestParam(idx)} style={{ ...smallBtn('#ef4444'), marginBottom: 2 }}>✕</button>
                        </div>
                    );
                })}
            </div>

            {msg && <div style={{ color: '#ef4444', marginBottom: 8, fontSize: 13 }}>{msg}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={save} disabled={saving} style={btn('#8b5cf6')}>{saving ? 'Saving…' : 'Save Tech Spec'}</button>
            </div>
        </div>
    );
}


// ── Vendors Tab ───────────────────────────────────────────────
function VendorsTab({ pd, inpS, pt, reload, allVendors }) {
    const [addModal, setAddModal] = useState(false);
    const [vendorId, setVendorId] = useState('');
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});

    const assign = async () => {
        if (!vendorId) return;
        setSaving(true);
        await fetch(`/api/pd/requests/${pd.id}/vendors/`, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vendor_id: vendorId }),
        });
        setSaving(false); setAddModal(false); setVendorId(''); reload();
    };

    const updateVendor = async (id) => {
        await fetch(`/api/pd/vendor-assignments/${id}/`, {
            method: 'PUT', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(editForm),
        });
        setEditingId(null); reload();
    };

    const removeVendor = async (id) => {
        if (!window.confirm('Remove this vendor assignment?')) return;
        await fetch(`/api/pd/vendor-assignments/${id}/`, { method: 'DELETE', credentials: 'include' });
        reload();
    };

    const STATUS_COLOR = { pending: '#f59e0b', accepted: '#10b981', rejected: '#ef4444' };

    const assignedIds = new Set((pd.vendors || []).map(v => v.vendor_id));
    const availableVendors = allVendors.filter(v => !assignedIds.has(v.id));

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button onClick={() => setAddModal(true)} style={btn('#10b981')}>+ Assign Vendor</button>
            </div>

            {(pd.vendors || []).length === 0 && (
                <div style={{ color: pt.colors.muted, textAlign: 'center', padding: 40 }}>No vendors assigned yet.</div>
            )}

            {(pd.vendors || []).map(v => {
                const isEditing = editingId === v.id;
                return (
                    <div key={v.id} style={{ background: pt.colors.card, border: `1px solid ${pt.colors.border || '#e2e8f0'}`, borderRadius: 12, padding: '16px 20px', marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 15 }}>{v.vendor_name}</div>
                                <div style={{ fontSize: 12, color: pt.colors.dimText, marginTop: 2 }}>Assigned: {v.assigned_date}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <span style={tag(STATUS_COLOR[v.status] || '#64748b')}>{v.status}</span>
                                <button onClick={() => { setEditingId(isEditing ? null : v.id); setEditForm({ status: v.status, rejection_reason: v.rejection_reason, sample_dev_cost: v.sample_dev_cost, currency: v.currency, ta_notes: v.ta_notes }); }} style={smallBtn('#3b82f6')}>{isEditing ? 'Cancel' : 'Edit'}</button>
                                <button onClick={() => removeVendor(v.id)} style={smallBtn('#ef4444')}>Remove</button>
                            </div>
                        </div>
                        {v.sample_dev_cost && <div style={{ marginTop: 8, fontSize: 13 }}>Sample Dev Cost: <strong>{v.currency} {v.sample_dev_cost}</strong></div>}
                        {v.ta_notes && <div style={{ marginTop: 4, fontSize: 13, color: pt.colors.dimText }}>T&A: {v.ta_notes}</div>}
                        {v.rejection_reason && <div style={{ marginTop: 4, fontSize: 13, color: '#ef4444' }}>Rejection: {v.rejection_reason}</div>}

                        {isEditing && (
                            <div style={{ marginTop: 16, borderTop: `1px solid ${pt.colors.border || '#e2e8f0'}`, paddingTop: 16 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                                    <FLabel label="Status">
                                        <select style={inpS} value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}>
                                            <option value="pending">Pending Response</option>
                                            <option value="accepted">Accepted</option>
                                            <option value="rejected">Rejected</option>
                                        </select>
                                    </FLabel>
                                    <FLabel label="Currency">
                                        <select style={inpS} value={editForm.currency} onChange={e => setEditForm(p => ({ ...p, currency: e.target.value }))}>
                                            {['INR', 'USD', 'EUR', 'GBP', 'OTHER'].map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </FLabel>
                                    <FLabel label="Sample Dev Cost">
                                        <input type="number" style={inpS} value={editForm.sample_dev_cost || ''} onChange={e => setEditForm(p => ({ ...p, sample_dev_cost: e.target.value }))} />
                                    </FLabel>
                                    {editForm.status === 'rejected' && (
                                        <FLabel label="Rejection Reason">
                                            <input style={inpS} value={editForm.rejection_reason} onChange={e => setEditForm(p => ({ ...p, rejection_reason: e.target.value }))} />
                                        </FLabel>
                                    )}
                                </div>
                                <FLabel label="T&A Notes / Timeline">
                                    <textarea style={{ ...inpS, height: 70, resize: 'vertical', width: '100%' }} value={editForm.ta_notes} onChange={e => setEditForm(p => ({ ...p, ta_notes: e.target.value }))} placeholder="Timeline, milestones, T&A plan details…" />
                                </FLabel>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                                    <button onClick={() => updateVendor(v.id)} style={btn('#10b981')}>Save</button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Assign vendor modal */}
            {addModal && (
                <div style={overlay}>
                    <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 400 }}>
                        <h3 style={{ margin: '0 0 16px' }}>Assign Vendor</h3>
                        <FLabel label="Select Vendor">
                            <select style={inpS} value={vendorId} onChange={e => setVendorId(e.target.value)}>
                                <option value="">— Select —</option>
                                {availableVendors.map(v => <option key={v.id} value={v.id}>{v.vendor_name} ({v.vendor_type})</option>)}
                            </select>
                        </FLabel>
                        {availableVendors.length === 0 && <div style={{ color: '#f59e0b', fontSize: 13, marginTop: 8 }}>All vendors already assigned.</div>}
                        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                            <button onClick={() => { setAddModal(false); setVendorId(''); }} style={smallBtn('#64748b')}>Cancel</button>
                            <button onClick={assign} disabled={saving || !vendorId} style={btn('#10b981')}>{saving ? 'Assigning…' : 'Assign'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


// ── Sampling Tab ──────────────────────────────────────────────
function SamplingTab({ pd, inpS, pt, reload }) {
    const [shipModal, setShipModal] = useState(false);
    const [invModal, setInvModal]   = useState(false);
    const [shipForm, setShipForm]   = useState({ vendor_assignment_id: '', shipment_date: new Date().toISOString().split('T')[0], lr_number: '', tracking_number: '', courier_name: '', expected_arrival: '', notes: '' });
    const [invForm, setInvForm]     = useState({ vendor_assignment_id: '', invoice_number: '', invoice_date: new Date().toISOString().split('T')[0], amount: '', currency: 'INR', notes: '' });
    const [saving, setSaving] = useState(false);

    const saveShipment = async () => {
        setSaving(true);
        await fetch(`/api/pd/requests/${pd.id}/shipments/`, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...shipForm, vendor_assignment_id: shipForm.vendor_assignment_id || null, expected_arrival: shipForm.expected_arrival || null }),
        });
        setSaving(false); setShipModal(false); reload();
    };

    const saveInvoice = async () => {
        setSaving(true);
        await fetch(`/api/pd/requests/${pd.id}/invoices/`, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...invForm, vendor_assignment_id: invForm.vendor_assignment_id || null }),
        });
        setSaving(false); setInvModal(false); reload();
    };

    const markReceived = async (sid) => {
        const date = window.prompt('Enter received date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
        if (!date) return;
        await fetch(`/api/pd/shipments/${sid}/`, {
            method: 'PUT', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ received_date: date }),
        });
        reload();
    };

    const shipInp = (f) => ({ value: shipForm[f], onChange: e => setShipForm(p => ({ ...p, [f]: e.target.value })) });
    const invInp  = (f) => ({ value: invForm[f],  onChange: e => setInvForm(p => ({ ...p, [f]: e.target.value })) });

    return (
        <div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginBottom: 24 }}>
                <button onClick={() => setShipModal(true)} style={btn('#06b6d4')}>+ Sample Shipment</button>
                <button onClick={() => setInvModal(true)} style={btn('#f59e0b')}>+ Sample Invoice</button>
            </div>

            {/* Shipments */}
            <h4 style={{ margin: '0 0 12px', fontSize: 14 }}>Sample Shipments</h4>
            {(pd.shipments || []).length === 0 && <div style={{ color: pt.colors.muted, fontSize: 13, marginBottom: 20 }}>No shipments recorded.</div>}
            {(pd.shipments || []).map(s => (
                <div key={s.id} style={{ background: pt.colors.card, border: `1px solid ${pt.colors.border || '#e2e8f0'}`, borderRadius: 10, padding: '14px 18px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ fontWeight: 600 }}>{s.courier_name || 'Courier TBD'} <span style={{ color: pt.colors.dimText, fontWeight: 400, fontSize: 12 }}>— {s.shipment_date}</span></div>
                        {s.lr_number && <div style={{ fontSize: 13, marginTop: 4 }}>LR: <strong>{s.lr_number}</strong></div>}
                        {s.tracking_number && <div style={{ fontSize: 13 }}>Tracking: <strong>{s.tracking_number}</strong></div>}
                        {s.vendor_name && <div style={{ fontSize: 12, color: pt.colors.dimText }}>Vendor: {s.vendor_name}</div>}
                        {s.expected_arrival && <div style={{ fontSize: 12, color: pt.colors.dimText }}>Expected: {s.expected_arrival}</div>}
                        {s.received_date && <span style={tag('#10b981')}>Received: {s.received_date}</span>}
                        {s.notes && <div style={{ fontSize: 12, color: pt.colors.dimText, marginTop: 4 }}>{s.notes}</div>}
                    </div>
                    {!s.received_date && (
                        <button onClick={() => markReceived(s.id)} style={smallBtn('#10b981')}>Mark Received</button>
                    )}
                </div>
            ))}

            {/* Invoices */}
            <h4 style={{ margin: '20px 0 12px', fontSize: 14 }}>Sample Invoices</h4>
            {(pd.invoices || []).length === 0 && <div style={{ color: pt.colors.muted, fontSize: 13 }}>No invoices recorded.</div>}
            {(pd.invoices || []).map(inv => (
                <div key={inv.id} style={{ background: pt.colors.card, border: `1px solid ${pt.colors.border || '#e2e8f0'}`, borderRadius: 10, padding: '14px 18px', marginBottom: 10 }}>
                    <div style={{ fontWeight: 600 }}>{inv.invoice_number} <span style={{ color: pt.colors.dimText, fontWeight: 400, fontSize: 12 }}>— {inv.invoice_date}</span></div>
                    <div style={{ marginTop: 4, fontSize: 14 }}>Amount: <strong>{inv.currency} {inv.amount}</strong></div>
                    {inv.vendor_name && <div style={{ fontSize: 12, color: pt.colors.dimText }}>Vendor: {inv.vendor_name}</div>}
                    {inv.notes && <div style={{ fontSize: 12, color: pt.colors.dimText, marginTop: 4 }}>{inv.notes}</div>}
                </div>
            ))}

            {/* Shipment Modal */}
            {shipModal && (
                <div style={overlay}>
                    <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 520 }}>
                        <h3 style={{ margin: '0 0 16px' }}>Add Sample Shipment</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                            <FLabel label="Vendor (optional)">
                                <select style={inpS} {...shipInp('vendor_assignment_id')}>
                                    <option value="">— Select Vendor —</option>
                                    {(pd.vendors || []).map(v => <option key={v.id} value={v.id}>{v.vendor_name}</option>)}
                                </select>
                            </FLabel>
                            <FLabel label="Shipment Date *"><input type="date" style={inpS} {...shipInp('shipment_date')} /></FLabel>
                            <FLabel label="LR Number"><input style={inpS} {...shipInp('lr_number')} /></FLabel>
                            <FLabel label="Tracking Number"><input style={inpS} {...shipInp('tracking_number')} /></FLabel>
                            <FLabel label="Courier Name"><input style={inpS} {...shipInp('courier_name')} /></FLabel>
                            <FLabel label="Expected Arrival"><input type="date" style={inpS} {...shipInp('expected_arrival')} /></FLabel>
                        </div>
                        <FLabel label="Notes"><textarea style={{ ...inpS, height: 60, resize: 'vertical', width: '100%' }} {...shipInp('notes')} /></FLabel>
                        <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
                            <button onClick={() => setShipModal(false)} style={smallBtn('#64748b')}>Cancel</button>
                            <button onClick={saveShipment} disabled={saving} style={btn('#06b6d4')}>{saving ? 'Saving…' : 'Save Shipment'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Invoice Modal */}
            {invModal && (
                <div style={overlay}>
                    <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 480 }}>
                        <h3 style={{ margin: '0 0 16px' }}>Add Sample Invoice</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                            <FLabel label="Vendor (optional)">
                                <select style={inpS} {...invInp('vendor_assignment_id')}>
                                    <option value="">— Select Vendor —</option>
                                    {(pd.vendors || []).map(v => <option key={v.id} value={v.id}>{v.vendor_name}</option>)}
                                </select>
                            </FLabel>
                            <FLabel label="Invoice Number *"><input style={inpS} {...invInp('invoice_number')} /></FLabel>
                            <FLabel label="Invoice Date *"><input type="date" style={inpS} {...invInp('invoice_date')} /></FLabel>
                            <FLabel label="Amount *"><input type="number" style={inpS} {...invInp('amount')} /></FLabel>
                            <FLabel label="Currency">
                                <select style={inpS} {...invInp('currency')}>
                                    {['INR', 'USD', 'EUR', 'GBP'].map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </FLabel>
                        </div>
                        <FLabel label="Notes"><textarea style={{ ...inpS, height: 60, resize: 'vertical', width: '100%' }} {...invInp('notes')} /></FLabel>
                        <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
                            <button onClick={() => setInvModal(false)} style={smallBtn('#64748b')}>Cancel</button>
                            <button onClick={saveInvoice} disabled={saving} style={btn('#f59e0b')}>{saving ? 'Saving…' : 'Save Invoice'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


// ── Shared helpers ────────────────────────────────────────────
function FLabel({ label, children, span }) {
    const { settings } = useSettings();
    const muted = settings.themeMode === 'dark' ? '#94a3b8' : '#475569';
    return (
        <div style={span ? { gridColumn: `span ${span}` } : {}}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: muted, marginBottom: 4 }}>{label}</label>
            {children}
        </div>
    );
}

function InfoRow({ label, value, bold, span }) {
    return (
        <div style={span ? { gridColumn: `span ${span}` } : {}}>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 14, fontWeight: bold ? 700 : 400 }}>{value}</div>
        </div>
    );
}

const btn      = (bg) => ({ padding: '8px 18px', background: bg, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 });
const smallBtn = (bg) => ({ padding: '4px 10px', background: bg, color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12, marginRight: 4 });
const tag      = (bg) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 12, background: `${bg}20`, color: bg, fontSize: 11, fontWeight: 600 });
const overlay  = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
