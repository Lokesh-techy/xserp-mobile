/** @author Lokesh */
import { router } from 'expo-router';
import { create } from 'zustand';

import type { ApprovalConfig, ApprovalType } from './types';

type PagerState = { type: ApprovalType | null; items: unknown[]; startId: string | null };

export const usePagerStore = create<PagerState>(() => ({ type: null, items: [], startId: null }));

/** Opens the swipe pager over `items` (a queue or lookup results), starting at `startId`. */
export function openPager<T, D>(config: ApprovalConfig<T, D>, items: T[], startId: string) {
  usePagerStore.setState({ type: config.type, items, startId });
  router.push({ pathname: '/approvals/[type]', params: { type: config.type, id: startId } });
}

export const removeFromPager = (id: string, idOf: (item: unknown) => string) =>
  usePagerStore.setState((s) => ({ items: s.items.filter((i) => idOf(i) !== id) }));
