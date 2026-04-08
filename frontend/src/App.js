// ============================================================
// FILE: src/App.js
// PURPOSE: Root — routing, auth state, permissions.
// ============================================================

import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import MainLayout from './components/layout/MainLayout';

// Pages
import LoginPage               from './pages/authentication/LoginPage';
import DashboardPage           from './pages/dashboard/DashboardPage';
import ItemListPage            from './pages/master_data/ItemListPage';
import ItemFormPage            from './pages/master_data/ItemFormPage';
import SupplierListPage        from './pages/master_data/SupplierListPage';
import SupplierFormPage        from './pages/master_data/SupplierFormPage';
import CustomerListPage        from './pages/master_data/CustomerListPage';
import CustomerFormPage        from './pages/master_data/CustomerFormPage';
import WarehouseListPage       from './pages/master_data/WarehouseListPage';
import WarehouseFormPage       from './pages/master_data/WarehouseFormPage';
import StockListPage           from './pages/inventory/StockListPage';
import StockMovementPage       from './pages/inventory/StockMovementPage';
import PurchaseOrderListPage   from './pages/purchasing/PurchaseOrderListPage';
import CreatePurchaseOrderPage from './pages/purchasing/CreatePurchaseOrderPage';
import GoodsReceiptPage        from './pages/purchasing/GoodsReceiptPage';
import SalesOrderListPage      from './pages/sales/SalesOrderListPage';
import CreateSalesOrderPage    from './pages/sales/CreateSalesOrderPage';
import InquiryListPage         from './pages/sales/InquiryListPage';
import InquiryFormPage         from './pages/sales/InquiryFormPage';
import QuotationPage           from './pages/sales/QuotationPage';
import QuotationFormPage       from './pages/sales/QuotationFormPage';
import OrderJourneyPage        from './pages/sales/OrderJourneyPage';
import SalesInvoicePage        from './pages/sales/SalesInvoicePage';
import SalesInvoiceFormPage    from './pages/sales/SalesInvoiceFormPage';
import FormatPanelPage         from './pages/settings/FormatPanelPage';
import ChartOfAccountsPage     from './pages/finance/ChartOfAccountsPage';
import JournalEntryListPage    from './pages/finance/JournalEntryListPage';
import JournalEntryFormPage    from './pages/finance/JournalEntryFormPage';
import TrialBalancePage        from './pages/finance/TrialBalancePage';
import EmployeeListPage        from './pages/hr_payroll/EmployeeListPage';
import EmployeeFormPage        from './pages/hr_payroll/EmployeeFormPage';
import AttendancePage          from './pages/hr_payroll/AttendancePage';
import SalaryPage              from './pages/hr_payroll/SalaryPage';
import BOMListPage             from './pages/production/BOMListPage';
import BOMFormPage             from './pages/production/BOMFormPage';
import WorkOrderListPage       from './pages/production/WorkOrderListPage';
import CreateWorkOrderPage     from './pages/production/CreateWorkOrderPage';
import MachineListPage         from './pages/production/MachineListPage';
import MachineFormPage         from './pages/production/MachineFormPage';
import QualityCheckPage        from './pages/production/QualityCheckPage';
import BatchListPage           from './pages/production/BatchListPage';
import ProductCategoriesPage   from './pages/technical_textile/ProductCategoriesPage';
import PerformanceSpecsPage    from './pages/technical_textile/PerformanceSpecsPage';
import SampleManagementPage    from './pages/technical_textile/SampleManagementPage';
import TechnicalDataSheetPage  from './pages/technical_textile/TechnicalDataSheetPage';
import TestingLabPage          from './pages/technical_textile/TestingLabPage';
import RDProjectsPage          from './pages/technical_textile/RDProjectsPage';
import RegulatoryCompliancePage from './pages/medical_textile/RegulatoryCompliancePage';
import BatchTraceabilityPage   from './pages/medical_textile/BatchTraceabilityPage';
import SterilityRecordsPage    from './pages/medical_textile/SterilityRecordsPage';
import CAPAManagementPage      from './pages/medical_textile/CAPAManagementPage';
import AuditTrailPage          from './pages/medical_textile/AuditTrailPage';
import ShelfLifeTrackingPage   from './pages/medical_textile/ShelfLifeTrackingPage';
import ProductionReportPage    from './pages/reports/ProductionReportPage';
import InventoryReportPage     from './pages/reports/InventoryReportPage';
import SalesReportPage         from './pages/reports/SalesReportPage';
import FinanceReportPage       from './pages/reports/FinanceReportPage';
import HRReportPage            from './pages/reports/HRReportPage';
import SettingsPage            from './pages/settings/SettingsPage';
import AdminPage               from './pages/admin/AdminPage';
import ProfilePage             from './pages/profile/ProfilePage';

function App() {
    const [currentUser,    setCurrentUser]    = useState(null);
    const [permissions,    setPermissions]    = useState('all'); // 'all' | []
    const [isAdmin,        setIsAdmin]        = useState(false);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    // Fetch permissions from backend for a logged-in user
    const fetchPermissions = async (savedUser) => {
        // Apply localStorage data immediately — no waiting for network
        if (savedUser?.is_staff) {
            setIsAdmin(true);
            setPermissions('all');
            return; // staff always has full access — no need for API call
        }

        // Only non-staff users need to fetch their role permissions
        try {
            const res = await fetch('/api/authentication/my-permissions/', {
                credentials: 'include',
            });
            // Only update if response is valid — ignore errors (401, 500 etc.)
            if (!res.ok) {
                setPermissions('all'); // fail open
                return;
            }
            const data = await res.json();
            setIsAdmin(data.is_admin || false);
            setPermissions(data.permissions === 'all' ? 'all' : (data.permissions || 'all'));
        } catch {
            setPermissions('all'); // network error — fail open, never empty sidebar
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
        // Call Django logout to clear the server session
        try {
            await fetch('/api/authentication/logout/', {
                method: 'POST',
                credentials: 'include',
            });
        } catch { /* ignore network errors on logout */ }
        localStorage.removeItem('sasi_erp_user');
        setCurrentUser(null);
        setPermissions('all');
        setIsAdmin(false);
    };

    const canSee = (path) => isAdmin || permissions === 'all' || (Array.isArray(permissions) && permissions.includes(path));

    if (isCheckingAuth) return null;

    return (
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
                                    <Route path="/dashboard" element={<DashboardPage />} />

                                    {/* Settings — available to all users */}
                                    <Route path="/settings" element={<SettingsPage />} />
                                    <Route path="/profile"  element={<ProfilePage />} />

                                    {/* Admin — staff only */}
                                    <Route path="/admin" element={<AdminPage currentUser={currentUser} />} />

                                    {/* Master Data */}
                                    <Route path="/master-data/items"             element={canSee('/master-data/items')      ? <ItemListPage />      : <Navigate to="/dashboard" />} />
                                    <Route path="/master-data/items/add"         element={canSee('/master-data/items')      ? <ItemFormPage />      : <Navigate to="/dashboard" />} />
                                    <Route path="/master-data/items/edit/:id"    element={canSee('/master-data/items')      ? <ItemFormPage />      : <Navigate to="/dashboard" />} />
                                    <Route path="/master-data/suppliers"         element={canSee('/master-data/suppliers')  ? <SupplierListPage />  : <Navigate to="/dashboard" />} />
                                    <Route path="/master-data/suppliers/add"     element={canSee('/master-data/suppliers')  ? <SupplierFormPage />  : <Navigate to="/dashboard" />} />
                                    <Route path="/master-data/suppliers/edit/:id" element={canSee('/master-data/suppliers') ? <SupplierFormPage />  : <Navigate to="/dashboard" />} />
                                    <Route path="/master-data/customers"         element={canSee('/master-data/customers')  ? <CustomerListPage />  : <Navigate to="/dashboard" />} />
                                    <Route path="/master-data/customers/add"     element={canSee('/master-data/customers')  ? <CustomerFormPage />  : <Navigate to="/dashboard" />} />
                                    <Route path="/master-data/customers/edit/:id" element={canSee('/master-data/customers') ? <CustomerFormPage />  : <Navigate to="/dashboard" />} />
                                    <Route path="/master-data/warehouses"        element={canSee('/master-data/warehouses') ? <WarehouseListPage /> : <Navigate to="/dashboard" />} />
                                    <Route path="/master-data/warehouses/add"    element={canSee('/master-data/warehouses') ? <WarehouseFormPage /> : <Navigate to="/dashboard" />} />
                                    <Route path="/master-data/warehouses/edit/:id" element={canSee('/master-data/warehouses') ? <WarehouseFormPage /> : <Navigate to="/dashboard" />} />

                                    {/* Inventory */}
                                    <Route path="/inventory/stock-list"     element={canSee('/inventory/stock-list')     ? <StockListPage />     : <Navigate to="/dashboard" />} />
                                    <Route path="/inventory/stock-movement" element={canSee('/inventory/stock-movement') ? <StockMovementPage /> : <Navigate to="/dashboard" />} />

                                    {/* Purchasing */}
                                    <Route path="/purchasing/purchase-orders"        element={canSee('/purchasing/purchase-orders')        ? <PurchaseOrderListPage />   : <Navigate to="/dashboard" />} />
                                    <Route path="/purchasing/create-purchase-order"  element={canSee('/purchasing/create-purchase-order')  ? <CreatePurchaseOrderPage /> : <Navigate to="/dashboard" />} />
                                    <Route path="/purchasing/goods-receipt"          element={canSee('/purchasing/goods-receipt')          ? <GoodsReceiptPage />        : <Navigate to="/dashboard" />} />

                                    {/* Sales */}
                                    <Route path="/sales/inquiries"            element={canSee('/sales/inquiries')  ? <InquiryListPage />      : <Navigate to="/dashboard" />} />
                                    <Route path="/sales/inquiries/new"        element={canSee('/sales/inquiries')  ? <InquiryFormPage />      : <Navigate to="/dashboard" />} />
                                    <Route path="/sales/inquiries/edit/:id"   element={canSee('/sales/inquiries')  ? <InquiryFormPage />      : <Navigate to="/dashboard" />} />
                                    <Route path="/sales/quotations"           element={canSee('/sales/quotations') ? <QuotationPage />        : <Navigate to="/dashboard" />} />
                                    <Route path="/sales/quotations/new"       element={canSee('/sales/quotations') ? <QuotationFormPage />    : <Navigate to="/dashboard" />} />
                                    <Route path="/sales/quotations/edit/:id"  element={canSee('/sales/quotations') ? <QuotationFormPage />    : <Navigate to="/dashboard" />} />
                                    <Route path="/sales/order-journey"        element={canSee('/sales/order-journey')      ? <OrderJourneyPage />     : <Navigate to="/dashboard" />} />
                                    <Route path="/sales/sales-orders"         element={canSee('/sales/sales-orders')       ? <SalesOrderListPage />   : <Navigate to="/dashboard" />} />
                                    <Route path="/sales/create-sales-order"   element={canSee('/sales/create-sales-order') ? <CreateSalesOrderPage /> : <Navigate to="/dashboard" />} />
                                    <Route path="/sales/invoices"             element={canSee('/sales/invoices')   ? <SalesInvoicePage />     : <Navigate to="/dashboard" />} />
                                    <Route path="/sales/invoices/new"         element={canSee('/sales/invoices')   ? <SalesInvoiceFormPage /> : <Navigate to="/dashboard" />} />

                                    {/* Finance */}
                                    <Route path="/finance/chart-of-accounts" element={canSee('/finance/chart-of-accounts') ? <ChartOfAccountsPage />   : <Navigate to="/dashboard" />} />
                                    <Route path="/finance/journal-entries"     element={canSee('/finance/journal-entries') ? <JournalEntryListPage /> : <Navigate to="/dashboard" />} />
                                    <Route path="/finance/journal-entries/new" element={canSee('/finance/journal-entries') ? <JournalEntryFormPage /> : <Navigate to="/dashboard" />} />
                                    <Route path="/finance/trial-balance"     element={canSee('/finance/trial-balance')     ? <TrialBalancePage />      : <Navigate to="/dashboard" />} />

                                    {/* HR & Payroll */}
                                    <Route path="/hr-payroll/employees"         element={canSee('/hr-payroll/employees') ? <EmployeeListPage /> : <Navigate to="/dashboard" />} />
                                    <Route path="/hr-payroll/employees/add"     element={canSee('/hr-payroll/employees') ? <EmployeeFormPage /> : <Navigate to="/dashboard" />} />
                                    <Route path="/hr-payroll/employees/edit/:id" element={canSee('/hr-payroll/employees') ? <EmployeeFormPage /> : <Navigate to="/dashboard" />} />
                                    <Route path="/hr-payroll/attendance" element={canSee('/hr-payroll/attendance') ? <AttendancePage />   : <Navigate to="/dashboard" />} />
                                    <Route path="/hr-payroll/salary"     element={canSee('/hr-payroll/salary')     ? <SalaryPage />       : <Navigate to="/dashboard" />} />

                                    {/* Production */}
                                    <Route path="/production/bill-of-materials"     element={canSee('/production/bill-of-materials') ? <BOMListPage />          : <Navigate to="/dashboard" />} />
                                    <Route path="/production/bill-of-materials/new" element={canSee('/production/bill-of-materials') ? <BOMFormPage />          : <Navigate to="/dashboard" />} />
                                    <Route path="/production/work-orders"           element={canSee('/production/work-orders')       ? <WorkOrderListPage />    : <Navigate to="/dashboard" />} />
                                    <Route path="/production/create-work-order"     element={canSee('/production/create-work-order') ? <CreateWorkOrderPage /> : <Navigate to="/dashboard" />} />
                                    <Route path="/production/machines"              element={canSee('/production/machines')          ? <MachineListPage />      : <Navigate to="/dashboard" />} />
                                    <Route path="/production/machines/add"          element={canSee('/production/machines')          ? <MachineFormPage />      : <Navigate to="/dashboard" />} />
                                    <Route path="/production/machines/edit/:id"     element={canSee('/production/machines')          ? <MachineFormPage />      : <Navigate to="/dashboard" />} />
                                    <Route path="/production/quality-checks"    element={canSee('/production/quality-checks')    ? <QualityCheckPage />     : <Navigate to="/dashboard" />} />
                                    <Route path="/production/batches"           element={canSee('/production/batches')           ? <BatchListPage />        : <Navigate to="/dashboard" />} />

                                    {/* Technical Textile */}
                                    <Route path="/technical-textile/product-categories" element={canSee('/technical-textile/product-categories') ? <ProductCategoriesPage />  : <Navigate to="/dashboard" />} />
                                    <Route path="/technical-textile/performance-specs"  element={canSee('/technical-textile/performance-specs')  ? <PerformanceSpecsPage />   : <Navigate to="/dashboard" />} />
                                    <Route path="/technical-textile/samples"            element={canSee('/technical-textile/samples')            ? <SampleManagementPage />   : <Navigate to="/dashboard" />} />
                                    <Route path="/technical-textile/data-sheets"        element={canSee('/technical-textile/data-sheets')        ? <TechnicalDataSheetPage /> : <Navigate to="/dashboard" />} />
                                    <Route path="/technical-textile/testing-lab"        element={canSee('/technical-textile/testing-lab')        ? <TestingLabPage />         : <Navigate to="/dashboard" />} />
                                    <Route path="/technical-textile/rd-projects"        element={canSee('/technical-textile/rd-projects')        ? <RDProjectsPage />         : <Navigate to="/dashboard" />} />

                                    {/* Medical Textile */}
                                    <Route path="/medical-textile/compliance"         element={canSee('/medical-textile/compliance')         ? <RegulatoryCompliancePage /> : <Navigate to="/dashboard" />} />
                                    <Route path="/medical-textile/batch-traceability" element={canSee('/medical-textile/batch-traceability') ? <BatchTraceabilityPage />   : <Navigate to="/dashboard" />} />
                                    <Route path="/medical-textile/sterility"          element={canSee('/medical-textile/sterility')          ? <SterilityRecordsPage />    : <Navigate to="/dashboard" />} />
                                    <Route path="/medical-textile/capa"              element={canSee('/medical-textile/capa')              ? <CAPAManagementPage />      : <Navigate to="/dashboard" />} />
                                    <Route path="/medical-textile/audit-trail"        element={canSee('/medical-textile/audit-trail')        ? <AuditTrailPage />          : <Navigate to="/dashboard" />} />
                                    <Route path="/medical-textile/shelf-life"         element={canSee('/medical-textile/shelf-life')         ? <ShelfLifeTrackingPage />   : <Navigate to="/dashboard" />} />

                                    {/* Reports */}
                                    <Route path="/reports/production" element={canSee('/reports/production') ? <ProductionReportPage /> : <Navigate to="/dashboard" />} />
                                    <Route path="/reports/inventory"  element={canSee('/reports/inventory')  ? <InventoryReportPage />  : <Navigate to="/dashboard" />} />
                                    <Route path="/reports/sales"      element={canSee('/reports/sales')      ? <SalesReportPage />      : <Navigate to="/dashboard" />} />
                                    <Route path="/reports/finance"    element={canSee('/reports/finance')    ? <FinanceReportPage />    : <Navigate to="/dashboard" />} />
                                    <Route path="/reports/hr"         element={canSee('/reports/hr')         ? <HRReportPage />         : <Navigate to="/dashboard" />} />

                                    <Route path="/settings/format-panel" element={canSee('/settings/format-panel') ? <FormatPanelPage /> : <Navigate to="/dashboard" />} />

                                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                                </Routes>
                            </MainLayout>
                        ) : <Navigate to="/login" replace />
                    }
                />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
