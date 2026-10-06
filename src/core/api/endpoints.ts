/** @author Lokesh */
// Every backend path the app calls, in one place. Base URLs live in core/config/servers.ts.

/** Legacy Django ERP paths, relative to `<erpUrl>/erp/` (pass to `post` / `postOk`). */
export const ERP = {
  auth: {
    login: 'user/json/login_api/',
    logout: 'user/json/logout_api/',
    userSettings: 'auth/json/user_settings/',
    forgotPassword: 'auth/json/forget_password/',
    changePassword: 'auth/json/change_password/',
  },
  commons: {
    versionInfo: 'commons/version_info/',
    document: 'commons/json/document/',
    notifications: 'commons/json/nm_list/',
    deleteNotifications: 'commons/json/del_nm/',
  },
  sales: {
    dashboard: 'sales/json/dashboard/',
    salesDetail: 'sales/json/salesDetail/',
    invoiceSearch: 'sales/json/invoiceSearch/',
    oaSearch: 'sales/json/oa_search/',
    invoiceFinanceYears: 'sales/json/finance_year/',
    oaFinanceYears: 'sales/json/oa_finance_year/',
    draftInvoices: 'sales/json/draft_invoice_fetch/',
    draftOAs: 'sales/json/draft_oa/',
    invoiceMaterials: 'sales/json/invoice_material/',
    oaMaterials: 'sales/json/oa_material/',
    partyOverdue: 'sales/json/invoice_material_overdue/',
    checkOaInvoiceQty: 'sales/json/oa/checkoainvoice_qty/',
    invoiceDoc: 'sales/json/inv_doc/',
    oaDoc: 'sales/json/oa_doc/',
    loadPartyRate: 'sales/json/invoice/loadPartyRate/',
    saveInvoice: 'sales/json/save_invoice_page/',
  },
  purchase: {
    dashboard: 'purchase/json/dashboard/',
    poSearch: 'purchase/json/poSearch/',
    draftPOs: 'purchase/json/po_draft/',
    poDraftDetails: 'purchase/json/poDraftDetails/',
    financeYears: 'purchase/json/finance_year/',
    materialDetail: 'purchase/json/poMaterialDetail/',
    materialOverdue: 'purchase/json/poMaterial_overDue/',
    approve: 'purchase/json/po/approve/',
    review: 'purchase/json/po/review/',
    checkPoGrn: 'purchase/json/po/checkpogrn/',
    reject: 'purchase/json/po/reject/',
    poDoc: 'purchase/json/po_doc/',
  },
  stores: {
    dashboard: 'stores/json/dashboard_data/',
    stockStatement: 'stores/json/list_stock_statement/',
    indentStatus: 'stores/json/indentStatus/',
    grnStatus: 'stores/json/grnStatus/',
    draftGrns: 'stores/json/grn_draft/',
    stockCheck: 'stores/json/stockCheck/',
    grnApprove: 'stores/json/grn/approve/',
    grnReject: 'stores/json/grn/reject/',
    materialStock: 'stores/json/material_stock/',
    lastUsedSupplierDetails: 'stores/json/invoiceLastUsedSupplierDetails/',
  },
  accounts: {
    dashboard: 'accounts/json/dashboard_api/',
    taxLiability: 'accounts/json/tax_liability/',
    incomeAndExpenses: 'accounts/json/income_and_expenses/',
    aging: 'accounts/json/aging/',
    agingLedgers: 'accounts/json/aging_ledgers/',
    ledgerData: 'accounts/json/ledger_data/',
    ledgerBills: 'accounts/json/load_ledger_bills/',
    ledgerNames: 'accounts/json/ledger_names/',
  },
  masters: {
    partyNames: 'masters/json/partyNames/',
    materialNames: 'masters/json/materialNames/',
    projects: 'masters/json/projects/',
    taxList: 'masters/json/loadTaxList/',
    frequentlyUsed: 'masters/json/fetch_frequently_used_partyAndProjects/',
    partyDetail: 'masters/json/party/detail/',
    materialDetail: 'masters/json/material/detail/',
    supplierPrices: 'masters/json/material/supplierPrices/',
    approveRate: 'masters/json/material/approveRate/',
    rejectRate: 'masters/json/material/rejectRate/',
  },
  auditing: {
    pendingGrn: 'auditing/json/pendingGrn/',
    grnMaterials: 'auditing/json/grnMaterials/',
    verifyNote: 'auditing/json/verifyNote/',
    returnGrn: 'auditing/json/returnGrn/',
    downloadDoc: 'auditing/json/downloadDoc/',
  },
  expenses: {
    list: 'expenses/json/expense_list/',
    groups: 'expenses/json/expense_group_list/',
    get: 'expenses/json/get_expense/',
    headLedgers: 'expenses/json/head_ledgers/',
    save: 'expenses/json/save_expense/',
  },
} as const;

/** ERP web pages opened in the browser, relative to `<erpUrl>`. */
export const ERP_WEB = {
  home: '/erp/',
  terms: '/erp/public/terms/',
  privacy: '/erp/public/privacy/',
} as const;

/** FastAPI mobile service paths, relative to `<mobileApiUrl>` (which already ends in /api/v1). */
export const MOBILE_API = {
  auth: {
    login: 'auth/login',
    logout: 'auth/logout',
    refresh: 'auth/refresh',
    changePassword: 'auth/password/change',
    forgotPassword: 'auth/password/forgot',
  },
  me: 'me',
  devices: {
    register: 'devices',
    unregister: 'devices/unregister',
  },
  notifications: {
    list: 'notifications',
    events: 'notifications/events',
    preferences: 'notifications/preferences',
    readAll: 'notifications/read-all',
    unreadCount: 'notifications/unread-count',
    byId: (recipientId: string | number) => `notifications/${recipientId}`,
    read: (recipientId: string | number) => `notifications/${recipientId}/read`,
  },
} as const;
