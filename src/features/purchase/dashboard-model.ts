/** @author Lokesh */
import type { z } from 'zod';

import type { poDashboardSchema } from './schemas';

export type PoDashboard = z.infer<typeof poDashboardSchema>;

/** Purchase orders or job orders; PO Lookup tells them apart by `poType` (1 = job order). */
export type OrderKind = 'po' | 'jo';
export const isOrderKind = (o: { poType: number }, kind: OrderKind) => (o.poType === 1) === (kind === 'jo');

/** A delivery group's key doubles as PO Lookup's delivery filter. */
export type PoGroup = {
  key: 'pending' | 'part supplied';
  label: string;
  total: number;
  value: number;
  onTrack: number;
  delayed: number;
};

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : null);

/**
 * What the Purchase header card shows, worked out once from the dashboard payload. Order figures are for `kind`
 * when the server splits them (falling back to the combined ones); indents belong to neither, so stay shared.
 */
export function purchaseSummary(d: PoDashboard, kind?: OrderKind) {
  const o = (kind && d.by_type?.[kind]) || d;
  const groups: PoGroup[] = [
    {
      key: 'pending',
      label: 'Awaiting supply',
      total: o.pending,
      value: o.pending_value ?? 0,
      onTrack: o.pending_on_track,
      delayed: o.pending_delayed,
    },
    {
      key: 'part supplied',
      label: 'Part supplied',
      total: o.part_supplied,
      value: o.part_value ?? 0,
      onTrack: o.part_on_track,
      delayed: o.part_delayed,
    },
  ];
  const open = o.pending + o.part_supplied;
  const delayed = o.pending_delayed + o.part_delayed;
  // Months with no deliveries say nothing about punctuality, so the trend skips them.
  const months = o.performance.filter((p) => p.on_time + p.delayed > 0);
  const rate = (p: (typeof months)[number]) => pct(p.on_time, p.on_time + p.delayed)!;
  const last = months.at(-1);
  const prev = months.at(-2);
  return {
    open,
    delayed,
    openValue: (o.pending_value ?? 0) + (o.part_value ?? 0),
    delayedValue: o.delayed_value ?? 0,
    onTrackPct: pct(open - delayed, open),
    groups,
    indents: {
      raised: d.indent_raised,
      closed: d.indent_closed,
      pending: d.indent_pending,
      duePo: d.indent_due_po,
      dueMaterial: d.indent_due_material,
    },
    performance: o.performance,
    onTime: last ? { month: last.po_month, pct: rate(last), delta: prev ? rate(last) - rate(prev) : null } : null,
  };
}

export type PurchaseSummary = ReturnType<typeof purchaseSummary>;
