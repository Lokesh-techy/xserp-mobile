/** @author Lokesh */
import { useQuery } from '@tanstack/react-query';

import type { DateRange } from '@/core/utils';

import { fetchGrnStatus, fetchIndentStatus, fetchStockStatement, fetchStoreDashboard, stockCheck } from './api';
import { storesKeys } from './keys';

export const useStoreDashboard = (r: DateRange) => useQuery({ queryKey: storesKeys.dashboard(r), queryFn: () => fetchStoreDashboard(r), placeholderData: (p) => p });
export const useStockStatement = (r: DateRange) => useQuery({ queryKey: storesKeys.statement(r), queryFn: () => fetchStockStatement(r), placeholderData: (p) => p });
export const useIndentStatus = (r: DateRange) => useQuery({ queryKey: storesKeys.indent(r), queryFn: () => fetchIndentStatus(r), placeholderData: (p) => p });
export const useGrnStatus = (r: DateRange) => useQuery({ queryKey: storesKeys.grnStatus(r), queryFn: () => fetchGrnStatus(r), placeholderData: (p) => p });
export const useStockCheck = (itemId: string | null, makeId: string | null, r: DateRange, faulty: boolean, excludeDrafts: boolean) =>
  useQuery({
    queryKey: storesKeys.stockCheck(itemId ?? '', makeId ?? '', r, faulty, excludeDrafts),
    queryFn: () => stockCheck(itemId!, makeId!, { range: r, faulty, excludeDrafts }),
    enabled: !!itemId,
  });
