/** @author Lokesh */
import { toApiDate, type DateRange } from '@/core/utils';

const all = ['expenses'] as const;
export const expenseKeys = {
  all,
  groups: () => [...all, 'groups'] as const,
  list: (status: number, r: DateRange) => [...all, 'list', status, toApiDate(r.since), toApiDate(r.till)] as const,
  one: (id: string) => [...all, 'one', id] as const,
  heads: (type: string) => [...all, 'heads', type] as const,
};
