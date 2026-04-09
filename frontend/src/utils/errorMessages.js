// ============================================================
// FILE: src/utils/errorMessages.js
// PURPOSE: Central error message registry — maps error codes /
//          HTTP statuses / backend messages to user-friendly
//          categorised messages shown on screen.
// ============================================================

// ── Categories ───────────────────────────────────────────────
export const ERROR_CATEGORIES = {
    A: { label: 'Input Error',        color: '#f59e0b', bg: '#fef3c7', who: 'Please correct your input and try again.' },
    B: { label: 'Setup Required',     color: '#8b5cf6', bg: '#ede9fe', who: 'Master data needs to be configured first. Go to Master Data settings.' },
    C: { label: 'Process Error',      color: '#ef4444', bg: '#fee2e2', who: 'The action cannot be done in the current state. Follow the correct workflow.' },
    D: { label: 'Period / Year',      color: '#06b6d4', bg: '#cffafe', who: 'Adjust your date range or financial year filter and try again.' },
    E: { label: 'Server / Network',   color: '#64748b', bg: '#f1f5f9', who: 'A technical issue — wait a moment and retry. If it continues, contact your ERP administrator.' },
    F: { label: 'Data Conflict',      color: '#ec4899', bg: '#fce7f3', who: 'There is a data conflict — please contact your administrator or support team.' },
    G: { label: 'Access Denied',      color: '#10b981', bg: '#d1fae5', who: 'You do not have permission for this. Contact your administrator.' },
};

// ── Full Error Dictionary (55 messages) ──────────────────────
export const ERROR_MESSAGES = {

    // ── A: INPUT / VALIDATION ────────────────────────────────
    invalid_gst: {
        cat: 'A',
        title: 'Invalid GST Number',
        message: 'The GST Number contains invalid characters. Only letters, numbers, and hyphens are allowed.',
        action: 'Check and re-enter the GST Number carefully.',
    },
    no_line_items: {
        cat: 'A',
        title: 'No Items Added',
        message: 'This order or transaction has no line items and cannot be saved.',
        action: 'Add at least one product or service line before saving.',
    },
    negative_quantity: {
        cat: 'A',
        title: 'Invalid Quantity',
        message: 'Quantity or amount cannot be negative.',
        action: 'Enter a valid number greater than zero.',
    },
    invalid_email: {
        cat: 'A',
        title: 'Invalid Email Address',
        message: 'The email address format is incorrect.',
        action: 'Enter a valid email like name@company.com.',
    },
    invalid_hsn: {
        cat: 'A',
        title: 'Invalid HSN Code',
        message: 'HSN Code must be 4, 6, or 8 digits only.',
        action: 'Check the HSN code and re-enter.',
    },
    required_field_missing: {
        cat: 'A',
        title: 'Required Field Empty',
        message: 'One or more required fields are empty.',
        action: 'Fill in all fields marked with * before saving.',
    },
    payment_exceeds_invoice: {
        cat: 'A',
        title: 'Payment Exceeds Invoice',
        message: 'The payment amount entered is more than the outstanding invoice balance.',
        action: 'Check the invoice balance and enter the correct payment amount.',
    },
    invoice_amount_mismatch: {
        cat: 'A',
        title: 'Amount Mismatch',
        message: 'The invoice total does not match the Sales Order total.',
        action: 'Verify all line items and tax values before saving.',
    },
    future_date: {
        cat: 'A',
        title: 'Future Date Not Allowed',
        message: 'A future date has been entered in a field that does not allow it.',
        action: 'Select today or a past date.',
    },
    special_characters: {
        cat: 'A',
        title: 'Special Characters Not Allowed',
        message: 'This field contains special characters that are not accepted.',
        action: 'Remove special characters like @, #, $, %, &, * and try again.',
    },

    // ── B: MASTER DATA / SETUP MISSING ───────────────────────
    no_warehouse: {
        cat: 'B',
        title: 'No Warehouse Configured',
        message: 'No warehouse is set up in the system. Stock movement cannot be created.',
        action: 'Add at least one Warehouse in Master Data → Warehouses.',
    },
    item_no_unit: {
        cat: 'B',
        title: 'Item Has No Unit of Measure',
        message: 'The selected item does not have a Unit of Measure configured.',
        action: 'Update the Item Master and set the correct unit before using this item.',
    },
    customer_no_gst: {
        cat: 'B',
        title: 'Customer GST Number Missing',
        message: 'This customer does not have a GST Number saved. A tax invoice cannot be generated.',
        action: 'Update the Customer Master with the correct GST Number.',
    },
    supplier_no_terms: {
        cat: 'B',
        title: 'Supplier Payment Terms Missing',
        message: 'No Payment Terms are configured for this supplier.',
        action: 'Update the Supplier Master before raising a Purchase Order.',
    },
    no_accounts: {
        cat: 'B',
        title: 'Chart of Accounts Not Set Up',
        message: 'No accounts are configured. Journal entries cannot be posted.',
        action: 'Set up your Chart of Accounts in Finance first.',
    },
    employee_no_salary: {
        cat: 'B',
        title: 'No Salary Structure for Employee',
        message: 'This employee does not have a salary structure assigned.',
        action: 'Assign a Salary Structure to the employee in HR & Payroll settings.',
    },
    item_no_price: {
        cat: 'B',
        title: 'Item Price Is Zero',
        message: 'The standard price for this item is ₹0.',
        action: 'Update the Item Master with the correct price before using it in orders.',
    },
    no_bom: {
        cat: 'B',
        title: 'No Bill of Materials',
        message: 'No Bill of Materials (BOM) is linked to this product. A Work Order cannot be created.',
        action: 'Create a BOM for this product in Production → Bill of Materials.',
    },

    // ── C: PROCESS / WORKFLOW ERRORS ─────────────────────────
    order_not_confirmed: {
        cat: 'C',
        title: 'Order Not Confirmed',
        message: 'This action cannot be completed because the Sales Order is still in Draft status.',
        action: 'Confirm the Sales Order first, then proceed.',
    },
    invoice_before_delivery: {
        cat: 'C',
        title: 'Invoice Before Delivery',
        message: 'An invoice cannot be raised before the order has been delivered.',
        action: 'Complete the delivery first, then create the invoice.',
    },
    grn_no_po: {
        cat: 'C',
        title: 'Goods Receipt Without Purchase Order',
        message: 'A Goods Receipt Note (GRN) cannot be created without a linked Purchase Order.',
        action: 'Raise a Purchase Order first, then create the GRN against it.',
    },
    insufficient_stock: {
        cat: 'C',
        title: 'Insufficient Stock',
        message: 'Available stock is less than the required quantity for this transaction.',
        action: 'Check stock levels in Inventory → Stock List before proceeding.',
    },
    salary_already_processed: {
        cat: 'C',
        title: 'Salary Already Processed',
        message: 'Salary for this employee for the selected month has already been processed.',
        action: 'Use Revise Salary if a correction is needed.',
    },
    work_order_closed: {
        cat: 'C',
        title: 'Work Order Is Closed',
        message: 'This Work Order is closed and cannot be edited.',
        action: 'Create a new Work Order if additional production is required.',
    },
    quotation_already_converted: {
        cat: 'C',
        title: 'Quotation Already Converted',
        message: 'This Quotation has already been converted to a Sales Order. Duplicate conversion is not allowed.',
        action: 'Open the linked Sales Order instead.',
    },
    journal_already_posted: {
        cat: 'C',
        title: 'Journal Entry Already Posted',
        message: 'A posted Journal Entry cannot be modified.',
        action: 'Create a reversal entry if a correction is needed.',
    },
    attendance_already_marked: {
        cat: 'C',
        title: 'Attendance Already Marked',
        message: 'Attendance for this employee on this date is already recorded.',
        action: 'Edit the existing attendance record to make changes.',
    },
    batch_already_closed: {
        cat: 'C',
        title: 'Batch Already Closed',
        message: 'This Production Batch is closed. No further quantity can be added.',
        action: 'Create a new batch if more production is needed.',
    },

    // ── D: FINANCIAL YEAR / PERIOD ────────────────────────────
    prev_year_orders_missing: {
        cat: 'D',
        title: 'Previous Year Orders Not Visible',
        message: 'Orders from the previous financial year are not shown by default.',
        action: 'Use the Date Filter and set the range to Apr [Previous Year] – Mar [Current Year] to view them.',
    },
    report_empty_period: {
        cat: 'D',
        title: 'No Data for Selected Period',
        message: 'The report shows no data for the selected date range.',
        action: 'Check the date filter. If you changed the financial year, make sure the range covers the correct period.',
    },
    invoice_wrong_year: {
        cat: 'D',
        title: 'Invoice Date Outside Financial Year',
        message: 'The invoice date falls outside the current financial year.',
        action: 'Verify the date, or switch the filter to view the correct year.',
    },
    pending_orders_not_visible: {
        cat: 'D',
        title: 'Pending Orders Not Showing',
        message: 'Pending orders from a previous period may be hidden by the active date or status filter.',
        action: 'Set the date filter to "All" and check that the status filter includes Draft and Partial.',
    },
    opening_balance_wrong: {
        cat: 'D',
        title: 'Opening Balance May Be Incorrect',
        message: 'The opening balance may be wrong if the previous financial year was not formally closed.',
        action: 'Verify closing balances in Finance before the new financial year begins.',
    },

    // ── E: SERVER / NETWORK ───────────────────────────────────
    server_not_responding: {
        cat: 'E',
        title: 'Server Not Responding',
        message: 'The server is not responding right now. This is a temporary issue — not caused by your action.',
        action: 'Wait 1–2 minutes and try again. If it continues, contact your ERP administrator.',
    },
    slow_loading: {
        cat: 'E',
        title: 'Page Taking Too Long to Load',
        message: 'The page is loading slowly, possibly due to high server activity or a slow connection.',
        action: 'Please wait, or refresh the page after a moment.',
    },
    session_expired: {
        cat: 'E',
        title: 'Session Expired',
        message: 'Your session has expired due to inactivity. You have been logged out.',
        action: 'Log in again. Note: any unsaved data may have been lost.',
    },
    request_timeout: {
        cat: 'E',
        title: 'Request Timed Out',
        message: 'The request took too long and was cancelled. This usually happens with large data exports.',
        action: 'Apply a smaller date range or fewer filters, then try again.',
    },
    server_error: {
        cat: 'E',
        title: 'Unexpected Server Error',
        message: 'An unexpected error occurred on the server. Your data has not been saved.',
        action: 'Please try again. If it repeats, note the exact time and contact support.',
    },
    network_error: {
        cat: 'E',
        title: 'No Internet Connection',
        message: 'Cannot reach the server. Your internet connection may be down.',
        action: 'Check your internet connection and try again.',
    },
    file_upload_failed: {
        cat: 'E',
        title: 'File Upload Failed',
        message: 'The file could not be uploaded. This may be due to file format or size.',
        action: 'Allowed formats: JPG, PNG, PDF. Maximum size: 5MB. Check the file and try again.',
    },

    // ── F: DATA CONFLICT ──────────────────────────────────────
    record_in_use: {
        cat: 'F',
        title: 'Cannot Delete — Record In Use',
        message: 'This record is linked to existing orders or transactions and cannot be deleted.',
        action: 'Remove the links first, or archive the record instead of deleting it.',
    },
    duplicate_record: {
        cat: 'F',
        title: 'Duplicate Record',
        message: 'A record with this number or code already exists in the system.',
        action: 'Use a different code, or edit the existing record.',
    },
    data_mismatch: {
        cat: 'F',
        title: 'Data Mismatch Between Modules',
        message: 'The totals in one section do not match another (e.g. Sales Order vs Invoice). This can happen if a record was edited after being linked.',
        action: 'Contact your administrator to reconcile the data.',
    },
    orphan_record: {
        cat: 'F',
        title: 'Linked Record Was Deleted',
        message: 'This record refers to an item, customer, or supplier that has been deleted.',
        action: 'Update the record or contact your administrator.',
    },
    concurrent_edit: {
        cat: 'F',
        title: 'Edited by Another User',
        message: 'Another user may have edited this record at the same time.',
        action: 'Refresh the page and re-enter your changes.',
    },
    large_data: {
        cat: 'F',
        title: 'Too Much Data to Load',
        message: 'This report or list contains too many records to display all at once.',
        action: 'Apply a date filter or use Export CSV instead of loading all data on screen.',
    },

    // ── G: PERMISSIONS ────────────────────────────────────────
    no_view_permission: {
        cat: 'G',
        title: 'Access Denied',
        message: 'You do not have permission to view this section.',
        action: 'Contact your administrator to request access.',
    },
    no_delete_permission: {
        cat: 'G',
        title: 'Cannot Delete — No Permission',
        message: 'Deleting records requires Admin access.',
        action: 'Contact your administrator.',
    },
    no_edit_posted: {
        cat: 'G',
        title: 'Cannot Edit Approved Record',
        message: 'Only administrators can modify a posted or approved record.',
        action: 'Contact your manager or administrator.',
    },
    login_failed: {
        cat: 'G',
        title: 'Login Failed',
        message: 'Incorrect username or password.',
        action: 'Check your credentials and try again. Contact admin if you have forgotten your password.',
    },
    not_authenticated: {
        cat: 'G',
        title: 'Not Logged In',
        message: 'You must be logged in to perform this action.',
        action: 'Please log in and try again.',
    },
};

// ── Auto-detect error key from HTTP status + backend message ──
export function detectErrorKey(status, serverMessage = '') {
    const msg = (serverMessage || '').toLowerCase();

    if (status === 401) return 'session_expired';
    if (status === 403) return 'no_view_permission';
    if (status === 0 || status == null) return 'network_error';
    if (status >= 500) return 'server_error';

    // 400 — parse backend message for known patterns
    if (msg.includes('gst'))                                          return 'invalid_gst';
    if (msg.includes('special character'))                            return 'special_characters';
    if (msg.includes('negative') && msg.includes('quantity'))         return 'negative_quantity';
    if (msg.includes('unique') || msg.includes('already exists') || msg.includes('duplicate')) return 'duplicate_record';
    if (msg.includes('foreign key') || msg.includes('referenced') || msg.includes('in use') || msg.includes('cannot delete')) return 'record_in_use';
    if (msg.includes('stock') || msg.includes('insufficient') || msg.includes('not enough')) return 'insufficient_stock';
    if (msg.includes('not confirmed') || msg.includes('draft'))       return 'order_not_confirmed';
    if (msg.includes('session') || msg.includes('not logged'))        return 'session_expired';
    if (msg.includes('permission') || msg.includes('not allowed'))    return 'no_view_permission';
    if (msg.includes('hsn'))                                          return 'invalid_hsn';
    if (msg.includes('required') || msg.includes('blank') || msg.includes('empty')) return 'required_field_missing';
    if (msg.includes('timeout') || msg.includes('timed out'))         return 'request_timeout';

    return null; // Unknown — show raw server message
}
