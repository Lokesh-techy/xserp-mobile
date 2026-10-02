/** @author Lokesh */
import { createContext, useContext, useEffect, type ReactNode } from 'react';

/**
 * Where a slotted control is drawn: `bar` (on the gradient, right end) or `tabs` (right end of the tab
 * row, sharing its width). Menus read this to pick their look by themselves.
 */
export type SlotPlacement = 'bar' | 'tabs' | null;
export const PlacementContext = createContext<SlotPlacement>(null);
export const usePlacement = () => useContext(PlacementContext);

/** SegmentedTabs reports its natural content width so the header can tell whether a control fits beside it. */
export const TabsWidthContext = createContext<((w: number) => void) | null>(null);

export type HeaderSlot = {
  get: () => ReactNode;
  set: (n: ReactNode) => void;
  subscribe: (fn: () => void) => () => void;
};

export function createHeaderSlot(): HeaderSlot {
  let node: ReactNode = null;
  const subs = new Set<() => void>();
  return {
    get: () => node,
    set: (n) => {
      node = n;
      subs.forEach((fn) => fn());
    },
    subscribe: (fn) => {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}

export const HeaderSlotContext = createContext<HeaderSlot | null>(null);

/**
 * Lets a tab put its single control (a date range, a sort) beside the screen's tabs — or, when they
 * leave no room, at the right end of the header bar — instead of a row of its own. Renders nothing in place.
 */
export function HeaderRight({ children }: { children: ReactNode }) {
  const slot = useContext(HeaderSlotContext);
  useEffect(() => {
    slot?.set(children);
  });
  useEffect(() => () => slot?.set(null), [slot]);
  return null;
}
