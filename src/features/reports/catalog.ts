/** @author Lokesh */
import type { Href } from 'expo-router';

import type { PermissionCode } from '@/core/auth';
import { matches } from '@/core/utils';
import type { IconName } from '@/ui';

type Base = { id: string; title: string; description: string; icon: IconName; permission: PermissionCode; section: Section };
/** `app`: built into the mobile app (opens its screen); `web`: XSERP web page (no mobile API yet). */
export type Report = (Base & { kind: 'app'; href: Href }) | (Base & { kind: 'web'; path: string });
type Section = 'Finance' | 'Sales' | 'Purchase' | 'Stores';

const SECTIONS: Section[] = ['Finance', 'Sales', 'Purchase', 'Stores'];

export const REPORTS: Report[] = [
  // Finance
  { id: 'aging', section: 'Finance', permission: 'ACCOUNTS', kind: 'app', href: '/finance?tab=ageing', icon: 'hourglass-outline', title: 'Receivable & payable ageing', description: 'Buckets by days overdue, drill into parties' },
  { id: 'position', section: 'Finance', permission: 'ACCOUNTS', kind: 'app', href: '/finance?tab=dashboard', icon: 'pulse-outline', title: 'Cash, bank & tax position', description: 'Balances, tax liability, income vs expense' },
  { id: 'ledgers', section: 'Finance', permission: 'ACCOUNTS', kind: 'app', href: '/finance?tab=ledgers', icon: 'book-outline', title: 'Ledger statement', description: 'Vouchers, opening/closing and open bills' },
  { id: 'pl', section: 'Finance', permission: 'ACCOUNTS', kind: 'web', path: '/erp/accounts/trial_balance/', icon: 'stats-chart-outline', title: 'P&L and trial balance', description: 'Statements on XSERP web' },
  { id: 'gstr1', section: 'Finance', permission: 'ACCOUNTS', kind: 'web', path: '/erp/accounts/gstr1-sales-report-statement/', icon: 'document-text-outline', title: 'GSTR-1 sales', description: 'Outward supplies return' },
  { id: 'gstr2', section: 'Finance', permission: 'ACCOUNTS', kind: 'web', path: '/erp/accounts/gstr2-purchase-report-statement/', icon: 'document-text-outline', title: 'GSTR-2 purchases', description: 'Inward supplies return' },
  { id: 'gstr3b', section: 'Finance', permission: 'ACCOUNTS', kind: 'web', path: '/erp/accounts/gstr3b-reconciliation-report-statement/', icon: 'git-compare-outline', title: 'GSTR-3B reconciliation', description: 'Summary return reconciliation' },
  { id: 'party-aging', section: 'Finance', permission: 'ACCOUNTS', kind: 'web', path: '/erp/accounts/outstanding_report/', icon: 'people-outline', title: 'Party ageing report', description: 'Detailed outstanding by party' },
  { id: 'tcs', section: 'Finance', permission: 'ACCOUNTS', kind: 'web', path: '/erp/accounts/tcs_report/', icon: 'receipt-outline', title: 'TCS report', description: 'Tax collected at source' },
  { id: 'outstanding-vs-payment', section: 'Finance', permission: 'ACCOUNTS', kind: 'web', path: '/erp/reports/outstandingVsPaymentsReport/', icon: 'swap-vertical-outline', title: 'Outstanding vs payments', description: 'Dues against receipts' },
  // Sales
  { id: 'sales-performance', section: 'Sales', permission: 'SALES', kind: 'app', href: '/sales?tab=dashboard', icon: 'trending-up-outline', title: 'Sales, delivery & collections', description: 'Monthly performance charts' },
  { id: 'invoice-register', section: 'Sales', permission: 'SALES', kind: 'app', href: '/sales?tab=lookup', icon: 'search-outline', title: 'Invoice & OA register', description: 'Filter by date, status, party, project' },
  { id: 'sales-report', section: 'Sales', permission: 'SALES', kind: 'web', path: '/erp/sales/sales-report-statement/', icon: 'bar-chart-outline', title: 'Sales report', description: 'Statement on XSERP web' },
  { id: 'tax-report', section: 'Sales', permission: 'SALES', kind: 'web', path: '/erp/sales/inv_tax_report/', icon: 'calculator-outline', title: 'Invoice tax report', description: 'Tax by invoice' },
  { id: 'oa-report', section: 'Sales', permission: 'SALES', kind: 'web', path: '/erp/sales/oa_report/', icon: 'document-attach-outline', title: 'OA report', description: 'Order acknowledgements' },
  { id: 'cashflow', section: 'Sales', permission: 'SALES', kind: 'web', path: '/erp/sales/get_project_wise_cashflow_overview/', icon: 'water-outline', title: 'Cash flow overview', description: 'Project-wise cash flow' },
  // Purchase
  { id: 'po-performance', section: 'Purchase', permission: 'PURCHASE', kind: 'app', href: '/purchase?tab=dashboard', icon: 'speedometer-outline', title: 'PO & indent status', description: 'Pending, delayed, delivery performance' },
  { id: 'po-register', section: 'Purchase', permission: 'PURCHASE', kind: 'app', href: '/purchase?tab=lookup', icon: 'search-outline', title: 'Purchase order register', description: 'Filter by date, status, supplier, material' },
  { id: 'po-wise', section: 'Purchase', permission: 'PURCHASE', kind: 'web', path: '/erp/purchase/po/reports/', icon: 'list-outline', title: 'PO-wise report', description: 'Statement on XSERP web' },
  { id: 'material-wise', section: 'Purchase', permission: 'PURCHASE', kind: 'web', path: '/erp/purchase/po/materialwisereports/', icon: 'cube-outline', title: 'Material-wise report', description: 'Purchases by material' },
  // Stores
  { id: 'stock', section: 'Stores', permission: 'STORES', kind: 'app', href: '/stores?tab=stock', icon: 'archive-outline', title: 'Stock statement', description: 'Opening, receipts, issues, closing, stock mix' },
  { id: 'indent', section: 'Stores', permission: 'STORES', kind: 'app', href: '/stores?tab=indent', icon: 'clipboard-outline', title: 'Indent status', description: 'Raised, closed, due for PO/material' },
  { id: 'grn-status', section: 'Stores', permission: 'STORES', kind: 'app', href: '/stores?tab=grn', icon: 'download-outline', title: 'GRN status', description: 'Raised, in process, accounted' },
  { id: 'stock-check', section: 'Stores', permission: 'STORES', kind: 'app', href: '/stores?tab=check', icon: 'search-circle-outline', title: 'Material movement', description: 'Receipts and issues for one material' },
  { id: 'stock-report', section: 'Stores', permission: 'STORES', kind: 'web', path: '/erp/stores/stock-statement', icon: 'grid-outline', title: 'Stock report', description: 'Location-wise on XSERP web' },
  { id: 'grn-report', section: 'Stores', permission: 'STORES', kind: 'web', path: '/erp/stores/grn-report-statement/', icon: 'document-outline', title: 'GRN report', description: 'Goods receipts statement' },
  { id: 'dc-report', section: 'Stores', permission: 'STORES', kind: 'web', path: '/erp/stores/dc-report/', icon: 'car-outline', title: 'Delivery challan report', description: 'DCs issued' },
  { id: 'quality', section: 'Stores', permission: 'STORES', kind: 'web', path: '/erp/stores/get_quality_inspection_report_view/', icon: 'ribbon-outline', title: 'Quality inspection', description: 'Inspection results' },
];

export function visibleReports(canView: (code: PermissionCode) => boolean, query: string) {
  return SECTIONS.map((title) => ({
    title,
    items: REPORTS.filter((r) => r.section === title && canView(r.permission) && matches(query, r.title, r.description)),
  })).filter((s) => s.items.length > 0);
}
