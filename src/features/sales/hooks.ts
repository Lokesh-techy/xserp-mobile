/** @author Lokesh */
import { useQuery } from '@tanstack/react-query';

import { fetchAgeingSideData } from '@/features/finance';

import { fetchInvoiceFinanceYears, fetchInvoiceStatus, fetchOaFinanceYears, fetchOaStatus, fetchSalesDashboard, searchInvoices, searchOAs, type SalesFilters } from './api';
import { salesKeys } from './keys';

export const useSalesDashboard = () => useQuery({ queryKey: salesKeys.dashboard(), queryFn: fetchSalesDashboard });
export const useInvoiceStatus = () => useQuery({ queryKey: salesKeys.invoiceStatus(), queryFn: fetchInvoiceStatus });
export const useOaStatus = () => useQuery({ queryKey: salesKeys.oaStatus(), queryFn: fetchOaStatus });
/** The saved receivable ageing (the Finance tab's figures), not a live recompute. */
export const useReceivableAging = () => useQuery({ queryKey: salesKeys.aging(), queryFn: () => fetchAgeingSideData(true, false) });
export const useInvoiceSearch = (f: SalesFilters) => useQuery({ queryKey: salesKeys.search(f), queryFn: () => searchInvoices(f), enabled: f.kind === 'invoice', placeholderData: (p) => p });
export const useOaSearch = (f: SalesFilters) => useQuery({ queryKey: salesKeys.search(f), queryFn: () => searchOAs(f), enabled: f.kind === 'oa', placeholderData: (p) => p });
export const useSalesFinanceYears = (kind: 'invoice' | 'oa') =>
  useQuery({ queryKey: salesKeys.financeYears(kind), queryFn: kind === 'invoice' ? fetchInvoiceFinanceYears : fetchOaFinanceYears, staleTime: 60 * 60_000 });
