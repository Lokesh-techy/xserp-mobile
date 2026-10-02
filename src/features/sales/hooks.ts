/** @author Lokesh */
import { useQuery } from '@tanstack/react-query';

import { toApiDate, type DateRange } from '@/core/utils';

import { fetchInvoiceFinanceYears, fetchOaFinanceYears, fetchReceivableAging, fetchSalesDashboard, fetchSalesDetail, searchInvoices, searchOAs, type SalesFilters } from './api';
import { salesKeys } from './keys';

export const useSalesDashboard = () => useQuery({ queryKey: salesKeys.dashboard(), queryFn: fetchSalesDashboard });
export const useSalesDetail = (r: DateRange) => useQuery({ queryKey: salesKeys.detail(toApiDate(r.since), toApiDate(r.till)), queryFn: () => fetchSalesDetail(r) });
export const useReceivableAging = () => useQuery({ queryKey: salesKeys.aging(), queryFn: fetchReceivableAging });
export const useInvoiceSearch = (f: SalesFilters) => useQuery({ queryKey: salesKeys.search(f), queryFn: () => searchInvoices(f), enabled: f.kind === 'invoice', placeholderData: (p) => p });
export const useOaSearch = (f: SalesFilters) => useQuery({ queryKey: salesKeys.search(f), queryFn: () => searchOAs(f), enabled: f.kind === 'oa', placeholderData: (p) => p });
export const useSalesFinanceYears = (kind: 'invoice' | 'oa') =>
  useQuery({ queryKey: salesKeys.financeYears(kind), queryFn: kind === 'invoice' ? fetchInvoiceFinanceYears : fetchOaFinanceYears, staleTime: 60 * 60_000 });
