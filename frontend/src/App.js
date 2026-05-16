// ============================================================
// FILE: src/App.js
// PURPOSE: Root routing for Buying House ERP
// ============================================================

import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorProvider } from './context/ErrorContext';
import GlobalErrorAlert  from './components/common/GlobalErrorAlert';
import MainLayout        from './components/layout/MainLayout';

// ── Core ──────────────────────────────────────────────────────
import LoginPage            from './pages/authentication/LoginPage';
import DashboardPage        from './pages/dashboard/DashboardPage';
import SettingsPage         from './pages/settings/SettingsPage';
import CompanyMasterPage    from './pages/settings/CompanyMasterPage';
import FormatPanelPage      from './pages/settings/FormatPanelPage';
import EmailTemplatesPage   from './pages/settings/EmailTemplatesPage';
import ProfilePage          from './pages/profile/ProfilePage';
import AdminPage            from './pages/admin/AdminPage';
import ActivityLogPage      from './pages/audit/ActivityLogPage';

// ── Masters ────────────────────────────────────────────────────
import YarnPage             from './pages/masters/YarnPage';
import ItemMasterPage       from './pages/masters/ItemMasterPage';
import MachinePage          from './pages/masters/MachinePage';
import ProcessPage          from './pages/masters/ProcessPage';
import ProductPage          from './pages/masters/ProductPage';
import BOMPage              from './pages/masters/BOMPage';
import VendorPage           from './pages/masters/VendorPage';
import CustomerPage         from './pages/masters/CustomerPage';
import LocationPage         from './pages/masters/LocationPage';
import UOMPage              from './pages/masters/UOMPage';
import BrandPage            from './pages/masters/BrandPage';
import CategoryPage         from './pages/masters/CategoryPage';
import FabricTypePage       from './pages/masters/FabricTypePage';
import TestingParamsPage    from './pages/masters/TestingParamsPage';

// ── Product Development ────────────────────────────────────────
import ProductDevelopmentPage  from './pages/product_development/ProductDevelopmentPage';
import PDRequestDetailPage     from './pages/product_development/PDRequestDetailPage';

// ── Order Management ───────────────────────────────────────────
import CustomerOrdersPage      from './pages/order_management/CustomerOrdersPage';
import CustomerOrderDetailPage from './pages/order_management/CustomerOrderDetailPage';
import InquiryListPage         from './pages/order_management/InquiryListPage';
import InquiryDetailPage       from './pages/order_management/InquiryDetailPage';

// ── Purchase ───────────────────────────────────────────────────
import PurchaseOrdersPage   from './pages/purchase/PurchaseOrdersPage';
import GRNPage              from './pages/purchase/GRNPage';
import LotStockPage         from './pages/purchase/LotStockPage';
import PurchaseInvoicesPage from './pages/purchase/PurchaseInvoicesPage';

// ── Lot Inventory ──────────────────────────────────────────────
import LotDashboardPage     from './pages/lot_inventory/LotDashboardPage';
import LotMovementsPage     from './pages/lot_inventory/LotMovementsPage';
import StockAdjustmentsPage from './pages/lot_inventory/StockAdjustmentsPage';

// ── Planning ───────────────────────────────────────────────────
import SalesOrdersPage        from './pages/planning/SalesOrdersPage';
import ProductionOrdersPage   from './pages/planning/ProductionOrdersPage';
import DailyPlanPage          from './pages/planning/DailyPlanPage';
import ForecastPage           from './pages/planning/ForecastPage';
import ProcurementPlanPage    from './pages/planning/ProcurementPlanPage';

// ── Production ─────────────────────────────────────────────────
import ProcessEntriesPage   from './pages/production/ProcessEntriesPage';
import BatchesPage          from './pages/production/BatchesPage';
import BeamsPage            from './pages/production/BeamsPage';
import YarnIssuePage        from './pages/production/YarnIssuePage';
import WarpingScreen        from './pages/production/WarpingScreen';
import WeavingScreen        from './pages/production/WeavingScreen';
import StenterScreen        from './pages/production/StenterScreen';
import TumblerScreen        from './pages/production/TumblerScreen';
import LaminationScreen     from './pages/production/LaminationScreen';
import EmbossingScreen     from './pages/production/EmbossingScreen';

// ── Quality ────────────────────────────────────────────────────
import QCDashboardPage      from './pages/quality/QCDashboardPage';
import InspectionsPage      from './pages/quality/InspectionsPage';
import DefectTypesPage      from './pages/quality/DefectTypesPage';
import SampleTestingPage    from './pages/quality/SampleTestingPage';

// ── Dispatch ───────────────────────────────────────────────────
import DispatchEntriesPage  from './pages/dispatch/DispatchEntriesPage';
import SalesInvoicesPage    from './pages/dispatch/SalesInvoicesPage';
import DeliveryChallanPage  from './pages/dispatch/DeliveryChallanPage';

// ── Traceability ────────────────────────────────────────────────
import TraceabilityPage     from './pages/traceability/TraceabilityPage';

// ── Reports ────────────────────────────────────────────────────
import ProductionReportPage    from './pages/reports/ProductionReportPage';
import InventoryReportPage     from './pages/reports/InventoryReportPage';
import SalesReportPage         from './pages/reports/SalesReportPage';
import ReconciliationReportPage from './pages/reports/ReconciliationReportPage';

// ── BH Reports ─────────────────────────────────────────────────
import OrderSummaryReport      from './pages/reports/OrderSummaryReport';
import PDPipelineReport        from './pages/reports/PDPipelineReport';
import VendorPerformanceReport from './pages/reports/VendorPerformanceReport';
import ShipmentTrackerReport   from './pages/reports/ShipmentTrackerReport';

// ── Settings Extra ─────────────────────────────────────────────
import TallyIntegrationPage    from './pages/settings/TallyIntegrationPage';
import CompanySettingsPage     from './pages/settings/CompanySettingsPage';

// ── Finance (Accounting) ───────────────────────────────────────
import ChartOfAccountsPage     from './pages/finance/ChartOfAccountsPage';
import JournalEntriesPage      from './pages/finance/JournalEntriesPage';
import PaymentsPage            from './pages/finance/PaymentsPage';
import ReceiptsPage            from './pages/finance/ReceiptsPage';
import FinanceDashboardPage    from './pages/finance/FinanceDashboardPage';
import FiscalYearsPage         from './pages/finance/FiscalYearsPage';

// ── GST ────────────────────────────────────────────────────────
import GSTCenterPage           from './pages/gst/GSTCenterPage';

// ── Banking ────────────────────────────────────────────────────
import BankAccountsPage        from './pages/banking/BankAccountsPage';

// ── HR & Payroll ───────────────────────────────────────────────
import EmployeeHRPage          from './pages/payroll/EmployeeHRPage';
import PayrollPeriodsPage      from './pages/payroll/PayrollPeriodsPage';

// ── TDS / TCS ──────────────────────────────────────────────────
import TDSCenterPage           from './pages/tds/TDSCenterPage';

// ── Analytics, Feed, Inventory ─────────────────────────────────
import AnalyticsPage           from './pages/analytics/AnalyticsPage';
import FeedPage                from './pages/feed/FeedPage';
import FinishedGoodsPage       from './pages/inventory/FinishedGoodsPage';

// ── Maintenance ────────────────────────────────────────────────
import MaintenanceSchedulePage from './pages/maintenance/MaintenanceSchedulePage';
import MaintenanceLogPage      from './pages/maintenance/MaintenanceLogPage';
import EscalationPage          from './pages/maintenance/EscalationPage';

// ── Shipment / Quality ─────────────────────────────────────────
import PSIPage                 from './pages/shipment/PSIPage';
import ShipmentsPage           from './pages/shipment/ShipmentsPage';

// ── Finance ───────────────────────────────────────────────────
import BHSalesInvoicesPage     from './pages/finance/SalesInvoicesPage';
import BHPurchaseInvoicesPage  from './pages/finance/PurchaseInvoicesPage';
import PaymentsPage            from './pages/finance/PaymentsPage';


function App() {
    const [currentUser,    setCurrentUser]    = useState(null);
    const [permissions,    setPermissions]    = useState('all');
    const [isAdmin,        setIsAdmin]        = useState(false);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    const fetchPermissions = async (savedUser) => {
        if (savedUser?.is_staff) {
            setIsAdmin(true);
            setPermissions('all');
            return;
        }
        try {
            const res = await fetch('/api/authentication/my-permissions/', { credentials: 'include' });
            if (!res.ok) { setPermissions('all'); return; }
            const data = await res.json();
            setIsAdmin(data.is_admin || false);
            setPermissions(data.permissions === 'all' ? 'all' : (data.permissions || 'all'));
        } catch {
            setPermissions('all');
        }
    };

    useEffect(() => {
        const savedUser = localStorage.getItem('sasi_erp_user');
        if (savedUser) {
            const user = JSON.parse(savedUser);
            setCurrentUser(user);
            fetchPermissions(user);
        }
        setIsCheckingAuth(false);
    }, []);

    const handleLoginSuccess = async (user) => {
        setCurrentUser(user);
        fetchPermissions(user);
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/authentication/logout/', { method: 'POST', credentials: 'include' });
        } catch {}
        localStorage.removeItem('sasi_erp_user');
        setCurrentUser(null);
        setPermissions('all');
        setIsAdmin(false);
    };

    if (isCheckingAuth) return null;

    return (
        <ErrorProvider>
        <GlobalErrorAlert />
        <BrowserRouter>
            <Routes>
                <Route path="/login"
                    element={currentUser ? <Navigate to="/dashboard" replace /> : <LoginPage onLoginSuccess={handleLoginSuccess} />}
                />
                <Route path="/*"
                    element={
                        currentUser ? (
                            <MainLayout currentUser={currentUser} onLogout={handleLogout}
                                permissions={permissions} isAdmin={isAdmin}>
                                <Routes>
                                    <Route path="/dashboard"  element={<DashboardPage />} />
                                    <Route path="/settings"   element={<SettingsPage />} />
                                    <Route path="/profile"    element={<ProfilePage />} />
                                    <Route path="/admin"      element={<AdminPage currentUser={currentUser} />} />
                                    <Route path="/audit/activity-log" element={<ActivityLogPage />} />
                                    <Route path="/settings/company-master"    element={<CompanyMasterPage />} />
                                    <Route path="/settings/format-panel"      element={<FormatPanelPage />} />
                                    <Route path="/settings/email-templates"   element={<EmailTemplatesPage />} />

                                    {/* Masters */}
                                    <Route path="/masters/yarn"      element={<YarnPage />} />
                                    <Route path="/masters/items"     element={<ItemMasterPage />} />
                                    <Route path="/masters/machines"  element={<MachinePage />} />
                                    <Route path="/masters/processes" element={<ProcessPage />} />
                                    <Route path="/masters/products"  element={<ProductPage />} />
                                    <Route path="/masters/bom"       element={<BOMPage />} />
                                    <Route path="/masters/vendors"          element={<VendorPage />} />
                                    <Route path="/masters/customers"        element={<CustomerPage />} />
                                    <Route path="/masters/locations"        element={<LocationPage />} />
                                    <Route path="/masters/uom"              element={<UOMPage />} />
                                    <Route path="/masters/brands"           element={<BrandPage />} />
                                    <Route path="/masters/categories"       element={<CategoryPage />} />
                                    <Route path="/masters/fabric-types"     element={<FabricTypePage />} />
                                    <Route path="/masters/testing-params"   element={<TestingParamsPage />} />

                                    {/* Product Development */}
                                    <Route path="/product-development"      element={<ProductDevelopmentPage />} />
                                    <Route path="/product-development/:id"  element={<PDRequestDetailPage />} />

                                    {/* Order Management */}
                                    <Route path="/orders/inquiries"         element={<InquiryListPage />} />
                                    <Route path="/orders/inquiries/:id"     element={<InquiryDetailPage />} />
                                    <Route path="/orders/co"                element={<CustomerOrdersPage />} />
                                    <Route path="/orders/co/:id"            element={<CustomerOrderDetailPage />} />

                                    {/* Purchase */}
                                    <Route path="/purchase/orders"   element={<PurchaseOrdersPage />} />
                                    <Route path="/purchase/grn"      element={<GRNPage />} />
                                    <Route path="/purchase/lots"     element={<LotStockPage />} />
                                    <Route path="/purchase/invoices" element={<PurchaseInvoicesPage />} />

                                    {/* Lot Inventory */}
                                    <Route path="/lot-inventory/dashboard"   element={<LotDashboardPage />} />
                                    <Route path="/lot-inventory/movements"   element={<LotMovementsPage />} />
                                    <Route path="/lot-inventory/adjustments" element={<StockAdjustmentsPage />} />

                                    {/* Planning */}
                                    <Route path="/planning/forecasts"                     element={<ForecastPage />} />
                                    <Route path="/planning/procurement-plan/:id"          element={<ProcurementPlanPage />} />
                                    <Route path="/planning/sales-orders"                  element={<SalesOrdersPage />} />
                                    <Route path="/planning/production-orders"             element={<ProductionOrdersPage />} />
                                    <Route path="/planning/daily-plan"                    element={<DailyPlanPage />} />

                                    {/* Production */}
                                    <Route path="/production/yarn-issues" element={<YarnIssuePage />} />
                                    <Route path="/production/entries" element={<ProcessEntriesPage />} />
                                    <Route path="/production/batches" element={<BatchesPage />} />
                                    <Route path="/production/beams"   element={<BeamsPage />} />
                                    <Route path="/production/stages/warping"    element={<WarpingScreen />} />
                                    <Route path="/production/stages/weaving"    element={<WeavingScreen />} />
                                    <Route path="/production/stages/stenter"    element={<StenterScreen />} />
                                    <Route path="/production/stages/tumbler"    element={<TumblerScreen />} />
                                    <Route path="/production/stages/lamination" element={<LaminationScreen />} />
                                    <Route path="/production/stages/embossing"  element={<EmbossingScreen />} />

                                    {/* Quality */}
                                    <Route path="/quality/dashboard"      element={<QCDashboardPage />} />
                                    <Route path="/quality/inspections"    element={<InspectionsPage />} />
                                    <Route path="/quality/defect-types"   element={<DefectTypesPage />} />
                                    <Route path="/quality/sample-testing" element={<SampleTestingPage />} />

                                    {/* Maintenance */}
                                    <Route path="/maintenance/schedule"   element={<MaintenanceSchedulePage />} />
                                    <Route path="/maintenance/log"        element={<MaintenanceLogPage />} />
                                    <Route path="/maintenance/escalation" element={<EscalationPage />} />

                                    {/* Shipment / Quality */}
                                    <Route path="/shipment/psi"       element={<PSIPage />} />
                                    <Route path="/shipment/shipments" element={<ShipmentsPage />} />

                                    {/* Finance */}
                                    <Route path="/finance/sales-invoices"    element={<BHSalesInvoicesPage />} />
                                    <Route path="/finance/purchase-invoices" element={<BHPurchaseInvoicesPage />} />
                                    <Route path="/finance/payments"          element={<PaymentsPage />} />

                                    {/* Dispatch */}
                                    <Route path="/dispatch/entries"          element={<DispatchEntriesPage />} />
                                    <Route path="/dispatch/invoices"         element={<SalesInvoicesPage />} />
                                    <Route path="/dispatch/delivery-challans" element={<DeliveryChallanPage />} />

                                    {/* Traceability */}
                                    <Route path="/traceability" element={<TraceabilityPage />} />

                                    {/* Reports */}
                                    <Route path="/reports/production"     element={<ProductionReportPage />} />
                                    <Route path="/reports/lot-stock"      element={<InventoryReportPage />} />
                                    <Route path="/reports/quality"        element={<SalesReportPage />} />
                                    <Route path="/reports/reconciliation" element={<ReconciliationReportPage />} />

                                    {/* BH Reports */}
                                    <Route path="/reports/orders"         element={<OrderSummaryReport />} />
                                    <Route path="/reports/pd"             element={<PDPipelineReport />} />
                                    <Route path="/reports/vendors"        element={<VendorPerformanceReport />} />
                                    <Route path="/reports/shipments"      element={<ShipmentTrackerReport />} />

                                    {/* Settings Extra */}
                                    <Route path="/settings/tally"            element={<TallyIntegrationPage />} />
                                    <Route path="/settings/company-settings" element={<CompanySettingsPage />} />

                                    {/* Finance / Accounting */}
                                    <Route path="/finance/dashboard"         element={<FinanceDashboardPage />} />
                                    <Route path="/finance/accounts"          element={<ChartOfAccountsPage />} />
                                    <Route path="/finance/journal-entries"   element={<JournalEntriesPage />} />
                                    <Route path="/finance/payments"          element={<PaymentsPage />} />
                                    <Route path="/finance/receipts"          element={<ReceiptsPage />} />
                                    <Route path="/finance/fiscal-years"      element={<FiscalYearsPage />} />

                                    {/* GST */}
                                    <Route path="/gst/center"               element={<GSTCenterPage />} />

                                    {/* Banking */}
                                    <Route path="/banking/accounts"         element={<BankAccountsPage />} />

                                    {/* HR & Payroll */}
                                    <Route path="/payroll/employees"        element={<EmployeeHRPage />} />
                                    <Route path="/payroll/periods"          element={<PayrollPeriodsPage />} />

                                    {/* TDS / TCS */}
                                    <Route path="/tds/center"               element={<TDSCenterPage />} />

                                    {/* Analytics, Feed, Inventory */}
                                    <Route path="/analytics"       element={<AnalyticsPage />} />
                                    <Route path="/feed"            element={<FeedPage />} />
                                    <Route path="/inventory/finished-goods" element={<FinishedGoodsPage />} />

                                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                                </Routes>
                            </MainLayout>
                        ) : <Navigate to="/login" replace />
                    }
                />
            </Routes>
        </BrowserRouter>
        </ErrorProvider>
    );
}

export default App;
