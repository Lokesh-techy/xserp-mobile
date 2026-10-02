/** @author Lokesh */
import type { Href } from 'expo-router';

import type { PermissionCode, Session } from '@/core/auth';
import { can } from '@/core/permissions';
import type { ModuleTint } from '@/core/theme';
import type { IconName } from '@/ui';

export type ModuleId = 'finance' | 'audit' | 'purchase' | 'sales' | 'stores' | 'masters' | 'expenses' | 'production' | 'hr' | 'reports';

export type ModuleDef = {
  id: ModuleId;
  title: string;
  subtitle: string;
  icon: IconName;
  tint: ModuleTint;
  /** Any-of: the tile opens when the user can view at least one. */
  permission?: PermissionCode[];
  badge?: (s: Session) => number;
  href: Href;
  status: 'live' | 'soon';
};

const approved = (s: Session, code: PermissionCode, n: number) => (can(s, code, 'approve') ? n : 0);

export const MODULES: readonly ModuleDef[] = [
  { id: 'finance', title: 'Finance', subtitle: 'Cash · Bank · Ageing · Ledgers', icon: 'wallet-outline', tint: 'finance', permission: ['ACCOUNTS'], href: '/finance', status: 'live' },
  { id: 'audit', title: 'Audit', subtitle: 'Internal control · GRN notes', icon: 'shield-checkmark-outline', tint: 'audit', permission: ['ICD'], badge: (s) => approved(s, 'ICD', s.counts.icd), href: '/audit', status: 'live' },
  { id: 'purchase', title: 'Purchase', subtitle: 'Purchase orders · Indents', icon: 'cart-outline', tint: 'purchase', permission: ['PURCHASE'], badge: (s) => approved(s, 'PURCHASE', s.counts.po), href: '/purchase', status: 'live' },
  { id: 'sales', title: 'Sales', subtitle: 'Invoices · Order acknowledgements', icon: 'trending-up-outline', tint: 'sales', permission: ['SALES'], badge: (s) => approved(s, 'SALES', s.counts.invoice + s.counts.oa), href: '/sales', status: 'live' },
  { id: 'stores', title: 'Stores', subtitle: 'Stock · Indents · GRN', icon: 'cube-outline', tint: 'stores', permission: ['STORES'], badge: (s) => approved(s, 'STORES', s.counts.grn), href: '/stores', status: 'live' },
  { id: 'masters', title: 'Masters', subtitle: 'Parties · Materials · Rates', icon: 'albums-outline', tint: 'masters', permission: ['MASTERS'], badge: (s) => approved(s, 'MASTERS', s.counts.rate), href: '/masters', status: 'live' },
  { id: 'expenses', title: 'Expenses', subtitle: 'Claims · Approvals', icon: 'receipt-outline', tint: 'expenses', permission: ['EXPENSES'], href: '/expenses', status: 'live' },
  { id: 'production', title: 'Production', subtitle: 'Plans · Issues · Shortages', icon: 'construct-outline', tint: 'production', href: '/soon/production', status: 'soon' },
  { id: 'hr', title: 'HR', subtitle: 'Employees · Attendance · Pay', icon: 'people-outline', tint: 'hr', href: '/soon/hr', status: 'soon' },
  { id: 'reports', title: 'Reports', subtitle: 'GST · P&L · Cash flow', icon: 'bar-chart-outline', tint: 'reports', href: '/soon/reports', status: 'soon' },
];

/** Tiles on Home: live modules only (coming-soon modules stay registered for deep links). */
export const HOME_MODULES = MODULES.filter((m) => m.status === 'live');

export function moduleAccess(def: ModuleDef, s: Session): 'open' | 'locked' | 'soon' {
  if (def.status === 'soon') return 'soon';
  if (!def.permission) return 'open';
  return def.permission.some((code) => can(s, code, 'view')) ? 'open' : 'locked';
}

export const moduleBadge = (def: ModuleDef, s: Session) => (moduleAccess(def, s) === 'open' ? (def.badge?.(s) ?? 0) : 0);
