/** @author Lokesh */
import type { PoFilters } from './api';

const all = ['purchase'] as const;
export const purchaseKeys = {
  all,
  dashboard: () => [...all, 'dashboard'] as const,
  drafts: () => [...all, 'drafts'] as const,
  search: (f: PoFilters) => [...all, 'search', { ...f, range: [f.range.since.toDateString(), f.range.till.toDateString()] }] as const,
  materials: (poId: string) => [...all, 'materials', poId] as const,
  financeYears: () => [...all, 'financeYears'] as const,
  profile: (poId: string, itemId: string) => [...all, 'profile', poId, itemId] as const,
  overdue: (poId: string, itemId: string) => [...all, 'overdue', poId, itemId] as const,
  stock: (itemId: string) => ['stores', 'material-stock', itemId] as const,
};
