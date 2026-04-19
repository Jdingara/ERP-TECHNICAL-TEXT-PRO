// ============================================================
// PAGE: Traceability Search — THE USP SCREEN
// Search by: lot number, batch number, dispatch, customer
// Shows full chain: raw material → production → dispatch
// ============================================================
import { useState } from 'react';

export default function TraceabilityPage() {
    const [query,   setQuery]   = useState('');
    const [results, setResults] = useState([]);
    const [chain,   setChain]   = useState(null);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const search = async () => {
        if (!query.trim()) return;
        setLoading(true); setChain(null); setSearched(true);
        const res = await fetch(`/api/traceability/search/?q=${encodeURIComponent(query)}`, { credentials: 'include' });
        const d = await res.json();
        setResults(d.results || []);
        setLoading(false);
    };

    const viewChain = async (batchNumber) => {
        const res = await fetch(`/api/traceability/batch/${encodeURIComponent(batchNumber)}/chain/`, { credentials: 'include' });
        const d = await res.json();
        setChain(d.chain);
    };

    const onKey = (e) => { if (e.key === 'Enter') search(); };

    return (
        <div style={{ padding: 24, maxWidth: 1100 }}>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <h2 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 700 }}>Traceability Search</h2>
                <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
                    Search by LOT number, BATCH number, Dispatch number, Customer name, or Product name.
                    Get the complete chain: raw material → production → customer.
                </p>
            </div>

            {/* Search Box */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
                <input
                    placeholder="Enter LOT number / Batch number / Dispatch number / Customer name…"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={onKey}
                    style={{
                        flex: 1, padding: '12px 18px', fontSize: 15, borderRadius: 10,
                        border: '2px solid #ec4899', outline: 'none',
                        boxShadow: '0 0 0 3px #ec489920',
                    }}
                />
                <button onClick={search} disabled={loading} style={{
                    padding: '12px 28px', background: '#ec4899', color: '#fff', border: 'none',
                    borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: 'pointer',
                }}>
                    {loading ? 'Searching…' : '🔍 Search'}
                </button>
            </div>

            {/* Quick search pills */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                {['LOT-', 'BTH-', 'DC-', 'AUNDE'].map(hint => (
                    <button key={hint} onClick={() => setQuery(hint)}
                        style={{ padding: '4px 12px', border: '1px solid #e2e8f0', borderRadius: 20,
                            background: '#f8fafc', color: '#475569', fontSize: 12, cursor: 'pointer' }}>
                        {hint}…
                    </button>
                ))}
            </div>

            {/* Results Table */}
            {searched && !loading && results.length === 0 && (
                <div style={{ textAlign: 'center', padding: 60, background: '#f8fafc', borderRadius: 12 }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🔎</div>
                    <div style={{ fontWeight: 600, color: '#475569' }}>No records found for "{query}"</div>
                    <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 6 }}>
                        Make sure the lot was received and GRN was confirmed with lot creation.
                    </div>
                </div>
            )}

            {results.length > 0 && !chain && (
                <>
                    <div style={{ marginBottom: 10, color: '#64748b', fontSize: 13 }}>{results.length} record(s) found</div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={tableS}><thead><tr style={{ background: '#1e293b', color: '#fff' }}>
                            {['LOT Number', 'Material', 'Color', 'Batch Number', 'Product', 'Production Date', 'Machine', 'Dispatch No', 'Customer', 'Actions'].map(h =>
                                <th key={h} style={thS}>{h}</th>)}
                        </tr></thead><tbody>
                            {results.map((r, i) => (
                                <tr key={i} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
                                    <td style={tdS}><b style={{ color: '#ec4899' }}>{r.lot_number}</b></td>
                                    <td style={tdS}>{r.material_name}</td>
                                    <td style={tdS}>
                                        {r.color_code && <span style={{ ...badge('#f59e0b'), marginRight: 4 }}>{r.color_code}</span>}
                                        {r.color_name}
                                    </td>
                                    <td style={tdS}><b style={{ color: '#3b82f6' }}>{r.batch_number}</b></td>
                                    <td style={tdS}>{r.product_name}</td>
                                    <td style={tdS}>{r.production_date}</td>
                                    <td style={tdS}>{r.machine_used}</td>
                                    <td style={tdS}>{r.dispatch_number || '—'}</td>
                                    <td style={tdS}>{r.customer_name || '—'}</td>
                                    <td style={tdS}>
                                        {r.batch_number && (
                                            <button onClick={() => viewChain(r.batch_number)}
                                                style={{ padding: '4px 10px', background: '#ec4899', color: '#fff',
                                                    border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>
                                                Full Chain
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody></table>
                    </div>
                </>
            )}

            {/* Full Chain Detail */}
            {chain && (
                <div style={{ background: '#fff', border: '2px solid #ec4899', borderRadius: 12, padding: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h3 style={{ margin: 0, color: '#ec4899' }}>Full Traceability Chain — {chain.batch_number}</h3>
                        <button onClick={() => setChain(null)} style={{ padding: '4px 12px', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', background: '#f8fafc' }}>✕ Close</button>
                    </div>

                    {/* Step 1: Raw Materials */}
                    <ChainStep icon="📦" title="Raw Materials" color="#10b981">
                        <table style={{ ...tableS, fontSize: 12 }}><thead><tr style={{ background: '#f0fdf4' }}>
                            {['LOT Number','Material','Color','Vendor','GRN Number','Received Date','Vendor Lot Ref'].map(h =>
                                <th key={h} style={{ ...thS, fontSize: 11, color: '#166534' }}>{h}</th>)}
                        </tr></thead><tbody>
                            {(chain.raw_materials || []).map((m, i) => (
                                <tr key={i}><td style={tdS}><b style={{ color: '#ec4899' }}>{m.lot_number}</b></td>
                                    <td style={tdS}>{m.material_name}</td>
                                    <td style={tdS}>{m.color_code} {m.color_name}</td>
                                    <td style={tdS}>{m.vendor_name}</td>
                                    <td style={tdS}>{m.grn_number}</td>
                                    <td style={tdS}>{m.received_date}</td>
                                    <td style={tdS}>{m.vendor_lot_ref || '—'}</td>
                                </tr>
                            ))}
                        </tbody></table>
                    </ChainStep>

                    {/* Step 2: Production */}
                    {chain.production && (
                        <ChainStep icon="🏭" title="Production" color="#f97316">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                                {[
                                    ['Process Entry', chain.production.process_entry_number],
                                    ['Process', chain.production.process_stage],
                                    ['Machine', `${chain.production.machine} — ${chain.production.machine_name}`],
                                    ['Operator', chain.production.operator],
                                    ['Shift', chain.production.shift],
                                    ['Date', chain.production.production_date],
                                    ['Output', chain.production.output_qty],
                                    ['Rejection', chain.production.rejection_qty],
                                    ['Product', chain.production.product],
                                    ['Prod. Order', chain.production.prod_order],
                                ].map(([label, val]) => (
                                    <InfoCard key={label} label={label} value={val} />
                                ))}
                            </div>
                        </ChainStep>
                    )}

                    {/* Step 3: Dispatch */}
                    {chain.dispatch ? (
                        <ChainStep icon="🚚" title="Dispatch" color="#8b5cf6">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                                {[
                                    ['Dispatch No', chain.dispatch.dispatch_number],
                                    ['Date', chain.dispatch.dispatch_date],
                                    ['Customer', chain.dispatch.customer],
                                    ['Vehicle', chain.dispatch.vehicle_number],
                                    ['Driver', chain.dispatch.driver_name],
                                    ['LR Number', chain.dispatch.lr_number],
                                    ['Transporter', chain.dispatch.transporter],
                                ].map(([label, val]) => (
                                    <InfoCard key={label} label={label} value={val || '—'} />
                                ))}
                            </div>
                        </ChainStep>
                    ) : (
                        <ChainStep icon="🚚" title="Dispatch" color="#94a3b8">
                            <div style={{ color: '#94a3b8', fontSize: 13 }}>Not dispatched yet</div>
                        </ChainStep>
                    )}
                </div>
            )}
        </div>
    );
}

function ChainStep({ icon, title, color, children }) {
    return (
        <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{icon}</div>
                <b style={{ fontSize: 15, color }}>{title}</b>
                <div style={{ flex: 1, height: 1, background: `${color}30` }} />
            </div>
            {children}
        </div>
    );
}

function InfoCard({ label, value }) {
    return (
        <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{label}</div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{value}</div>
        </div>
    );
}

const tableS = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const thS    = { padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 12 };
const tdS    = { padding: '10px 14px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' };
const badge  = (bg) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 12, background: `${bg}25`, color: bg, fontSize: 11, fontWeight: 600 });
