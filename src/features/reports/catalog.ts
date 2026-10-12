/** @author Lokesh */
import type { Href } from 'expo-router';

import type { PermissionCode } from '@/core/auth';
import { matches } from '@/core/utils';
import type { IconName } from '@/ui';

/** A report built into the app; `href` opens its screen. */
export type Report = { id: string; title: string; description: string; icon: IconName; permission: PermissionCode; section: Section; href: Href };
type Section = 'Finance' | 'Sales' | 'Purchase' | 'Stores';

const SECTIONS: Section[] = ['Finance', 'Sales', 'Purchase', 'Stores'];

export const REPORTS: Report[] = [
  // Finance
  { id: 'aging', section: 'Finance', permission: 'ACCOUNTS', href: '/finance?tab=ageing', icon: 'hourglass-outline', title: 'Receivable & payable ageing', description: 'Buckets by days overdue, drill into parties' },
  { id: 'position', section: 'Finance', permission: 'ACCOUNTS', href: '/finance?tab=dashboard', icon: 'pulse-outline', title: 'Cash, bank & tax position', description: 'Balances, tax liability, income vs expense' },
  { id: 'ledgers', section: 'Finance', permission: 'ACCOUNTS', href: '/finance?tab=ledgers', icon: 'book-outline', title: 'Ledger statement', description: 'Vouchers, opening/closing and open bills' },
  // Sales
  { id: 'sales-performance', section: 'Sales', permission: 'SALES', href: '/sales?tab=dashboard', icon: 'trending-up-outline', title: 'Sales, delivery & collections', description: 'Monthly performance charts' },
  { id: 'invoice-register', section: 'Sales', permission: 'SALES', href: '/sales?tab=lookup', icon: 'search-outline', title: 'Invoice & OA register', description: 'Filter by date, status, party, project' },
  // Purchase
  { id: 'po-performance', section: 'Purchase', permission: 'PURCHASE', href: '/purchase?tab=dashboard', icon: 'speedometer-outline', title: 'PO & indent status', description: 'Pending, delayed, delivery performance' },
  { id: 'po-register', section: 'Purchase', permission: 'PURCHASE', href: '/purchase?tab=lookup', icon: 'search-outline', title: 'Purchase order register', description: 'Filter by date, status, supplier, material' },
  // Stores
  { id: 'stock', section: 'Stores', permission: 'STORES', href: '/stores?tab=dashboard', icon: 'archive-outline', title: 'Stock statement', description: 'Opening, receipts, issues, closing, stock mix' },
  { id: 'indent', section: 'Stores', permission: 'STORES', href: '/stores?tab=dashboard', icon: 'clipboard-outline', title: 'Indent status', description: 'Raised, closed, due for PO/material' },
  { id: 'grn-status', section: 'Stores', permission: 'STORES', href: '/stores?tab=grn', icon: 'download-outline', title: 'GRN status', description: 'Raised, in process, accounted' },
  { id: 'stock-check', section: 'Stores', permission: 'STORES', href: '/stores?tab=check', icon: 'search-circle-outline', title: 'Material movement', description: 'Receipts and issues for one material' },
];

export function visibleReports(canView: (code: PermissionCode) => boolean, query: string) {
  return SECTIONS.map((title) => ({
    title,
    items: REPORTS.filter((r) => r.section === title && canView(r.permission) && matches(query, r.title, r.description)),
  })).filter((s) => s.items.length > 0);
}
