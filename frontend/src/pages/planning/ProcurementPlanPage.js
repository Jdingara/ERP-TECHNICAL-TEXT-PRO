import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const ROUTE_COLOR = { direct: '#3b82f6', fabric_in: '#f59e0b', full_cycle: '#10b981' };
const ROUTE_LABEL = { direct: 'Direct Sale', fabric_in: 'Fabric-In', full_cycle: 'Full Cycle' };
const MAT_COLOR   = { yarn: '#8b5cf6', chemical: '#f59e0b', item: '#64748b' };

export default function ProcurementPlanPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [plan, setPlan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expandedProduct, setExpandedProduct] = useState(null);
    const [showShortfallOnly, setShowShortfallOnly] = useState(false);

    useEffect(() => {
        fetch(`/api/planning/forecasts/${id}/procurement/`, { credentials: 'include' })
            .then(r => r.json())
            .then(d => { setPlan(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, [id]);

    if (loading) return <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>Loading procurement plan…</div>;
    if (!plan || plan.error) return <div style={{ padding: 48, textAlign: 'center', color: '#ef4444' }}>{plan?.error || 'Failed to load'}</div>;

    // Aggregate all shortfall materials
    const allShortfalls = [];
    (plan.rows || []).forEach(row => {
        (row.materials || []).forEach(m => {
            if (m.shortfall_qty > 0) {
                allShortfalls.push({ ...m, product_name: row.product_name, product_code: row.product_code });
            }
        });
    });

    const filteredRows = showShortfallOnly
        ? plan.rows.filter(r => r.materials?.some(m => m.shortfall_qty > 0))
        : plan.rows;

    return (
        <div style={{ padding: 24, maxWidth: 1200 }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#7c3aed)', borderRadius: 12, padding: '20px 24px', marginBottom: 24, color: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Procurement Plan</div>
                        <div style={{ fontSize: 22, fontWeight: 700 }}>{plan.forecast_title}</div>
                        <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
                            {plan.customer_name} &nbsp;·&nbsp; {plan.period_from} → {plan.period_to}
                        </div>
                    </div>
                    <button onClick={() => navigate('/planning/forecasts')}
                        style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                        ← Back to Forecasts
                    </button>
                </div>
            </div>

            {/* Shortfall Summary Banner */}
            {allShortfalls.length > 0 && (
                <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 10, padding: '14px 20px', marginBottom: 20 }}>
                    <div style={{ fontWeight: 700, color: '#92400e', marginBottom: 8, fontSize: 14 }}>
                        ⚠️ {allShortfalls.length} Material Shortfall{allShortfalls.length > 1 ? 's' : ''} — Purchase Required
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {allShortfalls.map((m, i) => (
                            <span key={i} style={{ background: '#fff', border: '1px solid #fbbf24', borderRadius: 6, padding: '4px 12px', fontSize: 12, color: '#92400e' }}>
                                <b>{m.material_code || m.material_name}</b>: need {m.shortfall_qty} {m.uom} more
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {allShortfalls.length === 0 && plan.rows.length > 0 && (
                <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 10, padding: '12px 20px', marginBottom: 20 }}>
                    <span style={{ color: '#065f46', fontWeight: 700, fontSize: 14 }}>✓ All materials in stock — no purchases required for this forecast</span>
                </div>
            )}

            {/* Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: '#475569' }}>
                    <b style={{ color: '#1e293b' }}>{plan.rows.length}</b> product{plan.rows.length !== 1 ? 's' : ''} in forecast
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569', cursor: 'pointer' }}>
                    <input type="checkbox" checked={showShortfallOnly} onChange={e => setShowShortfallOnly(e.target.checked)} />
                    Show shortfall products only
                </label>
            </div>

            {/* Product Rows */}
            {filteredRows.length === 0 && (
                <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8', background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                    No shortfalls found. All stocks are sufficient.
                </div>
            )}

            {filteredRows.map(row => {
                const hasShortfall = row.materials?.some(m => m.shortfall_qty > 0);
                const isOpen = expandedProduct === row.product_code;

                return (
                    <div key={row.product_code} style={{ background: '#fff', border: `1px solid ${hasShortfall ? '#fbbf24' : '#e2e8f0'}`, borderRadius: 12, marginBottom: 12, overflow: 'hidden', boxShadow: '0 1px 4px #0001' }}>
                        {/* Product Header Row */}
                        <div
                            onClick={() => setExpandedProduct(isOpen ? null : row.product_code)}
                            style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', cursor: 'pointer', background: isOpen ? '#f8fafc' : '#fff' }}>
                            <span style={{ fontSize: 16 }}>{isOpen ? '▼' : '▶'}</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 14 }}>
                                    {row.product_code} — {row.product_name}
                                </div>
                                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                                    Forecast Qty: <b>{row.forecast_qty} kg</b>
                                    &nbsp;&nbsp;|&nbsp;&nbsp;
                                    <span style={{ color: ROUTE_COLOR[row.process_route] || '#475569', fontWeight: 600 }}>
                                        {ROUTE_LABEL[row.process_route] || row.process_route}
                                    </span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                {!row.bom_available && (
                                    <span style={{ background: '#fee2e2', color: '#991b1b', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>No BOM</span>
                                )}
                                {row.bom_available && hasShortfall && (
                                    <span style={{ background: '#fef3c7', color: '#92400e', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                                        ⚠️ {row.materials.filter(m => m.shortfall_qty > 0).length} shortfall
                                    </span>
                                )}
                                {row.bom_available && !hasShortfall && (
                                    <span style={{ background: '#d1fae5', color: '#065f46', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>✓ In Stock</span>
                                )}
                                <span style={{ background: '#f1f5f9', color: '#475569', padding: '3px 10px', borderRadius: 20, fontSize: 11 }}>
                                    {row.bom_available ? `${row.materials.length} materials` : 'BOM missing'}
                                </span>
                            </div>
                        </div>

                        {/* Expanded Material Table */}
                        {isOpen && row.bom_available && (
                            <div style={{ borderTop: '1px solid #f1f5f9' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead>
                                        <tr style={{ background: '#1e293b', color: '#fff' }}>
                                            {['Material', 'Type', 'Process Stage', 'UOM', 'Required', 'In Stock', 'Shortfall', 'Status'].map(h =>
                                                <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600, fontSize: 12 }}>{h}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {row.materials.map((m, i) => (
                                            <tr key={i} style={{ background: m.shortfall_qty > 0 ? '#fffbeb' : i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '9px 14px' }}>
                                                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{m.material_code}</div>
                                                    <div style={{ fontSize: 11, color: '#64748b' }}>{m.material_name}</div>
                                                </td>
                                                <td style={{ padding: '9px 14px' }}>
                                                    <span style={{ background: `${MAT_COLOR[m.material_type] || '#94a3b8'}18`, color: MAT_COLOR[m.material_type] || '#94a3b8', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                                                        {m.material_type}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '9px 14px', color: '#64748b', fontSize: 12 }}>{m.process_stage || '—'}</td>
                                                <td style={{ padding: '9px 14px', color: '#64748b' }}>{m.uom}</td>
                                                <td style={{ padding: '9px 14px', fontWeight: 600, color: '#1e293b' }}>{m.required_qty}</td>
                                                <td style={{ padding: '9px 14px', color: m.stock_qty >= m.required_qty ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                                                    {m.stock_qty}
                                                </td>
                                                <td style={{ padding: '9px 14px' }}>
                                                    {m.shortfall_qty > 0
                                                        ? <span style={{ color: '#ef4444', fontWeight: 700 }}>{m.shortfall_qty}</span>
                                                        : <span style={{ color: '#10b981' }}>—</span>}
                                                </td>
                                                <td style={{ padding: '9px 14px' }}>
                                                    {m.shortfall_qty > 0
                                                        ? <span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>Buy {m.shortfall_qty} {m.uom}</span>
                                                        : <span style={{ background: '#d1fae5', color: '#065f46', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>✓ OK</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {isOpen && !row.bom_available && (
                            <div style={{ padding: '16px 20px', background: '#fef2f2', color: '#991b1b', fontSize: 13, borderTop: '1px solid #fca5a5' }}>
                                ⚠️ No BOM defined for {row.product_code}. Please create a BOM in Masters → Product Design before running procurement planning.
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Action Footer */}
            {allShortfalls.length > 0 && (
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, marginTop: 16 }}>
                    <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>Purchase Requirements Summary</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: '#f8fafc' }}>
                                {['Material', 'Type', 'Total Shortfall', 'UOM', 'For Products'].map(h =>
                                    <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: '#475569', borderBottom: '2px solid #e2e8f0' }}>{h}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                const grouped = {};
                                allShortfalls.forEach(m => {
                                    const key = m.material_code || m.material_name;
                                    if (!grouped[key]) grouped[key] = { ...m, products: [] };
                                    grouped[key].shortfall_qty = parseFloat((grouped[key].shortfall_qty + m.shortfall_qty).toFixed(3));
                                    grouped[key].products.push(m.product_code);
                                });
                                return Object.values(grouped).map((m, i) => (
                                    <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '9px 14px' }}><b style={{ color: '#1e293b' }}>{m.material_code}</b><div style={{ fontSize: 11, color: '#64748b' }}>{m.material_name}</div></td>
                                        <td style={{ padding: '9px 14px' }}>
                                            <span style={{ background: `${MAT_COLOR[m.material_type] || '#94a3b8'}18`, color: MAT_COLOR[m.material_type] || '#94a3b8', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                                                {m.material_type}
                                            </span>
                                        </td>
                                        <td style={{ padding: '9px 14px', fontWeight: 700, color: '#ef4444' }}>{m.shortfall_qty}</td>
                                        <td style={{ padding: '9px 14px', color: '#64748b' }}>{m.uom}</td>
                                        <td style={{ padding: '9px 14px', color: '#64748b', fontSize: 12 }}>{m.products.join(', ')}</td>
                                    </tr>
                                ));
                            })()}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
