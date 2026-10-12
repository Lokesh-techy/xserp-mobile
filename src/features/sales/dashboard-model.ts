/** @author Lokesh */
import type { z } from 'zod';

import type { Aging } from '@/core/erp';

import type { invoiceStatusSchema, oaStatusSchema, salesDashboardSchema } from './schemas';

type Dashboard = z.infer<typeof salesDashboardSchema>;
type OaStatus = z.infer<typeof oaStatusSchema>;
type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;

/** The card's switch: open order acknowledgements, or invoices awaiting payment. */
export type SalesKind = 'oa' | 'invoice';

/** A stage within one side (Not invoiced / Part invoiced, Unpaid / Part paid), as Purchase's delivery groups. */
export type Stage = { key: string; label: string; count: number; value: number; total: number; done: number; onTrack: number; late: number; lateValue: number };

/** One side of the switch: how many are open, how many are late, the money involved, and its stages. */
export type Track = {
  open: number;
  onTrack: number;
  late: number;
  onTrackPct: number | null;
  openValue: number | null;
  lateValue: number | null;
  /** The open documents' full amount and how much of it is already invoiced (OAs) or received (invoices). */
  progress: { total: number; done: number; pct: number | null } | null;
  stages: Stage[];
};

type StageRow = { count: number; value: number; total?: number; done?: number; on_track: number; late: number; late_value: number };
const stage = (key: string, label: string, r: StageRow | undefined): Stage[] =>
  r ? [{ key, label, count: r.count, value: r.value, total: r.total ?? r.value, done: r.done ?? 0, onTrack: r.on_track, late: r.late, lateValue: r.late_value }] : [];
const sum = (stages: Stage[], pick: (s: Stage) => number) => (stages.length ? stages.reduce((n, s) => n + pick(s), 0) : null);
function progress(stages: Stage[]): Track['progress'] {
  const total = sum(stages, (s) => s.total);
  const done = sum(stages, (s) => s.done) ?? 0;
  return total === null ? null : { total, done, pct: pct(done, total) };
}

function oaTrack(oa: OaStatus): Track {
  // Older servers send the totals only: no stages, no values.
  const stages = [...stage('not invoiced', 'Not invoiced', oa.not_invoiced), ...stage('part invoiced', 'Part invoiced', oa.part_invoiced)];
  return {
    open: oa.oa_pending,
    onTrack: oa.oa_on_track,
    late: oa.oa_overdue,
    onTrackPct: pct(oa.oa_on_track, oa.oa_pending),
    openValue: sum(stages, (s) => s.value),
    lateValue: sum(stages, (s) => s.lateValue),
    progress: progress(stages),
    stages,
  };
}

function invoiceTrack(inv: InvoiceStatus): Track {
  const stages = [...stage('unpaid', 'Unpaid', inv.unpaid), ...stage('part paid', 'Part paid', inv.part_paid)];
  return {
    open: inv.invoice_open,
    onTrack: inv.invoice_on_track,
    late: inv.invoice_overdue,
    onTrackPct: pct(inv.invoice_on_track, inv.invoice_open),
    openValue: inv.open_value,
    lateValue: inv.overdue_value,
    progress: progress(stages),
    stages,
  };
}

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : null);

export type AgeSlice = { key: string; label: string; value: number };

/** One month's row and the change from the month before it, as a percentage. */
function monthOf<T extends { month: string; value: number }>(rows: T[], month: string | undefined) {
  const i = rows.findIndex((r) => r.month === month);
  const row = rows[i];
  const prev = rows[i - 1];
  if (!row) return null;
  return { ...row, change: prev && prev.value ? Math.round(((row.value - prev.value) / Math.abs(prev.value)) * 100) : null };
}

/** What the Sales header card shows, worked out once from the dashboard, OA status and receivable ageing. */
export function salesSummary(d: Dashboard, oa?: OaStatus, ageing?: Aging | null, month?: string, invoice?: InvoiceStatus) {
  // The months the server reports (the last six), oldest first; the chosen one falls back to the latest.
  const months = d.sales_performance.map((m) => m.month);
  const current = month && months.includes(month) ? month : months.at(-1);
  const sales = monthOf(d.sales_performance, current);
  const collected = monthOf(d.payment_collection, current);
  // Ageing's later buckets (90–120, 120–180, 180+) read as one "over 90 days" slice on a phone.
  const slices: AgeSlice[] = ageing
    ? [
        { key: 'age1', label: '0–30', value: ageing.age1 },
        { key: 'age2', label: '31–60', value: ageing.age2 },
        { key: 'age3', label: '61–90', value: ageing.age3 },
        { key: 'age4', label: '90+', value: ageing.age4 + ageing.age5 + ageing.age6 },
      ]
    : [];
  return {
    months,
    month: current ?? null,
    track: {
      oa: oa ? oaTrack(oa) : null,
      invoice: invoice ? invoiceTrack(invoice) : null,
    } satisfies Record<SalesKind, Track | null>,
    sales,
    collected: collected && {
      ...collected,
      onTimePct: pct(collected.on_time, collected.on_time + collected.delayed),
    },
    receivable: ageing ? { total: slices.reduce((n, s) => n + s.value, 0), overdue: ageing.overdue, slices } : null,
    performance: d.sales_performance,
    collections: d.payment_collection,
  };
}

export type SalesSummary = ReturnType<typeof salesSummary>;
