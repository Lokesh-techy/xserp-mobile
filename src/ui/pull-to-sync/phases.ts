/** @author Lokesh */
export type SyncPhase = 0 | 1 | 2 | 3; // 0 idle/pulling · 1 armed · 2 syncing · 3 done

export const TRIGGER = 92; // pull distance that arms a sync
export const HOLD = 84; // header stays open this much while syncing
export const MIN_SYNC_MS = 1400; // a sync always shows at least one full wave around the mark

// Upper-cased strings (not textTransform), which Android would clip.
export const SYNC_LABELS = ['PULL TO REFRESH', 'RELEASE TO SYNC', 'SYNCING…', 'UP TO DATE'] as const;

export function rubberBand(distance: number): number {
  'worklet';
  const d = distance * 0.55;
  return d < TRIGGER ? d : TRIGGER + (d - TRIGGER) * 0.3;
}

/** 0 = petals assembled, 1 = fully apart. They part while pulling and snap together once armed. */
export function spreadFor(pull: number, phase: SyncPhase): number {
  'worklet';
  if (phase >= 1) return 0;
  return Math.min(1, Math.max(0, pull / TRIGGER));
}
