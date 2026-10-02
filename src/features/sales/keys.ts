/** @author Lokesh */
import type { SalesFilters } from './api';

const all = ['sales'] as const;
export const salesKeys = {
  all,
  dashboard: () => [...all, 'dashboard'] as const,
  detail: (since: string, till: string) => [...all, 'detail', since, till] as const,
  aging: () => ['accounts', 'aging'] as const,
  draftInvoices: () => [...all, 'draftInvoices'] as const,
  draftOAs: () => [...all, 'draftOAs'] as const,
  search: (f: SalesFilters) => [...all, 'search', { ...f, range: [f.range.since.toDateString(), f.range.till.toDateString()] }] as const,
  invoiceMaterials: (id: string) => [...all, 'invoiceMaterials', id] as const,
  oaMaterials: (id: string) => [...all, 'oaMaterials', id] as const,
  partyOverdue: (partyId: string) => [...all, 'partyOverdue', partyId] as const,
  financeYears: (kind: 'invoice' | 'oa') => [...all, 'financeYears', kind] as const,
};
