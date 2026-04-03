// ============================================================
// FILE: src/App.js
// PURPOSE: Root of the React application.
//          Controls routing - which page shows at which URL.
//          Handles login state - shows Login or ERP based on auth.
// ============================================================

import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Layout
import MainLayout from './components/layout/MainLayout';

// Pages
import LoginPage from './pages/authentication/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ItemListPage from './pages/master_data/ItemListPage';
import SupplierListPage from './pages/master_data/SupplierListPage';
import CustomerListPage from './pages/master_data/CustomerListPage';
import WarehouseListPage from './pages/master_data/WarehouseListPage';
import StockListPage from './pages/inventory/StockListPage';
import StockMovementPage from './pages/inventory/StockMovementPage';
import PurchaseOrderListPage from './pages/purchasing/PurchaseOrderListPage';
import CreatePurchaseOrderPage from './pages/purchasing/CreatePurchaseOrderPage';
import SalesOrderListPage from './pages/sales/SalesOrderListPage';
import CreateSalesOrderPage from './pages/sales/CreateSalesOrderPage';
import ChartOfAccountsPage from './pages/finance/ChartOfAccountsPage';
import JournalEntryListPage from './pages/finance/JournalEntryListPage';
import TrialBalancePage from './pages/finance/TrialBalancePage';
import EmployeeListPage from './pages/hr_payroll/EmployeeListPage';
import AttendancePage from './pages/hr_payroll/AttendancePage';
import SalaryPage from './pages/hr_payroll/SalaryPage';
import BOMListPage from './pages/production/BOMListPage';
import WorkOrderListPage from './pages/production/WorkOrderListPage';
import CreateWorkOrderPage from './pages/production/CreateWorkOrderPage';
import ProductCategoriesPage from './pages/technical_textile/ProductCategoriesPage';
import PerformanceSpecsPage from './pages/technical_textile/PerformanceSpecsPage';
import SampleManagementPage from './pages/technical_textile/SampleManagementPage';
import TechnicalDataSheetPage from './pages/technical_textile/TechnicalDataSheetPage';
import TestingLabPage from './pages/technical_textile/TestingLabPage';
import RDProjectsPage from './pages/technical_textile/RDProjectsPage';
import RegulatoryCompliancePage from './pages/medical_textile/RegulatoryCompliancePage';
import BatchTraceabilityPage from './pages/medical_textile/BatchTraceabilityPage';
import SterilityRecordsPage from './pages/medical_textile/SterilityRecordsPage';
import CAPAManagementPage from './pages/medical_textile/CAPAManagementPage';
import AuditTrailPage from './pages/medical_textile/AuditTrailPage';
import ShelfLifeTrackingPage from './pages/medical_textile/ShelfLifeTrackingPage';
import ProductionReportPage from './pages/reports/ProductionReportPage';
import InventoryReportPage from './pages/reports/InventoryReportPage';
import SalesReportPage from './pages/reports/SalesReportPage';
import FinanceReportPage from './pages/reports/FinanceReportPage';
import HRReportPage from './pages/reports/HRReportPage';

function App() {
    // Stores the logged-in user. null = not logged in.
    const [currentUser, setCurrentUser] = useState(null);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    // On app load - check if user was already logged in
    useEffect(() => {
        const savedUser = localStorage.getItem('sasi_erp_user');
        if (savedUser) {
            setCurrentUser(JSON.parse(savedUser));
        }
        setIsCheckingAuth(false);
    }, []);

    // Called when login succeeds
    const handleLoginSuccess = (user) => {
        setCurrentUser(user);
    };

    // Called when user clicks logout
    const handleLogout = () => {
        localStorage.removeItem('sasi_erp_user');
        setCurrentUser(null);
    };

    // Show nothing while checking auth
    if (isCheckingAuth) return null;

    return (
        <BrowserRouter>
            <Routes>

                {/* Login Page - accessible without login */}
                <Route
                    path="/login"
                    element={
                        currentUser
                            ? <Navigate to="/dashboard" replace />
                            : <LoginPage onLoginSuccess={handleLoginSuccess} />
                    }
                />

                {/* All ERP pages - require login */}
                <Route
                    path="/*"
                    element={
                        currentUser
                            ? (
                                <MainLayout currentUser={currentUser} onLogout={handleLogout}>
                                    <Routes>
                                        <Route path="/dashboard" element={<DashboardPage />} />

                                        {/* Master Data pages */}
                                        <Route path="/master-data/items" element={<ItemListPage />} />
                                        <Route path="/master-data/suppliers" element={<SupplierListPage />} />
                                        <Route path="/master-data/customers" element={<CustomerListPage />} />
                                        <Route path="/master-data/warehouses" element={<WarehouseListPage />} />

                                        {/* Inventory pages */}
                                        <Route path="/inventory/stock-list" element={<StockListPage />} />
                                        <Route path="/inventory/stock-movement" element={<StockMovementPage />} />

                                        {/* Purchasing pages */}
                                        <Route path="/purchasing/purchase-orders" element={<PurchaseOrderListPage />} />
                                        <Route path="/purchasing/create-purchase-order" element={<CreatePurchaseOrderPage />} />

                                        {/* Sales pages */}
                                        <Route path="/sales/sales-orders" element={<SalesOrderListPage />} />
                                        <Route path="/sales/create-sales-order" element={<CreateSalesOrderPage />} />

                                        {/* Finance pages */}
                                        <Route path="/finance/chart-of-accounts" element={<ChartOfAccountsPage />} />
                                        <Route path="/finance/journal-entries" element={<JournalEntryListPage />} />
                                        <Route path="/finance/trial-balance" element={<TrialBalancePage />} />

                                        {/* HR & Payroll pages */}
                                        <Route path="/hr-payroll/employees" element={<EmployeeListPage />} />
                                        <Route path="/hr-payroll/attendance" element={<AttendancePage />} />
                                        <Route path="/hr-payroll/salary" element={<SalaryPage />} />

                                        {/* Production pages */}
                                        <Route path="/production/bill-of-materials" element={<BOMListPage />} />
                                        <Route path="/production/work-orders" element={<WorkOrderListPage />} />
                                        <Route path="/production/create-work-order" element={<CreateWorkOrderPage />} />

                                        {/* Technical Textile pages */}
                                        <Route path="/technical-textile/product-categories" element={<ProductCategoriesPage />} />
                                        <Route path="/technical-textile/performance-specs" element={<PerformanceSpecsPage />} />
                                        <Route path="/technical-textile/samples" element={<SampleManagementPage />} />
                                        <Route path="/technical-textile/data-sheets" element={<TechnicalDataSheetPage />} />
                                        <Route path="/technical-textile/testing-lab" element={<TestingLabPage />} />
                                        <Route path="/technical-textile/rd-projects" element={<RDProjectsPage />} />

                                        {/* Medical Textile pages */}
                                        <Route path="/medical-textile/compliance" element={<RegulatoryCompliancePage />} />
                                        <Route path="/medical-textile/batch-traceability" element={<BatchTraceabilityPage />} />
                                        <Route path="/medical-textile/sterility" element={<SterilityRecordsPage />} />
                                        <Route path="/medical-textile/capa" element={<CAPAManagementPage />} />
                                        <Route path="/medical-textile/audit-trail" element={<AuditTrailPage />} />
                                        <Route path="/medical-textile/shelf-life" element={<ShelfLifeTrackingPage />} />

                                        {/* Reports pages */}
                                        <Route path="/reports/production" element={<ProductionReportPage />} />
                                        <Route path="/reports/inventory" element={<InventoryReportPage />} />
                                        <Route path="/reports/sales" element={<SalesReportPage />} />
                                        <Route path="/reports/finance" element={<FinanceReportPage />} />
                                        <Route path="/reports/hr" element={<HRReportPage />} />

                                        {/* More pages will be added here as we build them */}
                                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                                    </Routes>
                                </MainLayout>
                            )
                            : <Navigate to="/login" replace />
                    }
                />

            </Routes>
        </BrowserRouter>
    );
}

export default App;
