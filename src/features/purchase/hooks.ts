/** @author Lokesh */
import { useQuery } from '@tanstack/react-query';

import { fetchPoFinanceYears, fetchPurchaseDashboard, searchPurchaseOrders, type PoFilters } from './api';
import { purchaseKeys } from './keys';

export const usePurchaseDashboard = () => useQuery({ queryKey: purchaseKeys.dashboard(), queryFn: fetchPurchaseDashboard });
export const usePoSearch = (f: PoFilters) => useQuery({ queryKey: purchaseKeys.search(f), queryFn: () => searchPurchaseOrders(f), placeholderData: (prev) => prev });
export const usePoFinanceYears = () => useQuery({ queryKey: purchaseKeys.financeYears(), queryFn: fetchPoFinanceYears, staleTime: 60 * 60_000 });
