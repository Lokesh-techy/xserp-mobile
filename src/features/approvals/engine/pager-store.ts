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

/** Reads the hand-over for a pager of `type` without consuming it (safe in a state initializer). */
export function peekHandover(type: ApprovalType): { items: unknown[]; startId: string | null } | null {
  const s = usePagerStore.getState();
  return s.type === type && s.items.length > 0 ? { items: s.items, startId: s.startId } : null;
}

/** Drops the hand-over once a pager has copied it, so a later deep link can't reuse stale items. */
export const clearHandover = () => usePagerStore.setState({ type: null, items: [], startId: null });
