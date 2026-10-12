/** @author Lokesh */
import { agingSchema } from '@/core/erp';

import { salesSummary } from './dashboard-model';
import { invoiceStatusSchema, oaStatusSchema, salesDashboardSchema } from './schemas';

const month = (month: string, value: number, extra = {}) => ({ month, value, key_to_sort: month, ...extra });
const dash = salesDashboardSchema.parse({
  sales_performance: [month("Aug'26", 800), month("Sep'26", 1000)],
  payment_collection: [month("Sep'26", 600, { advance: 100, on_time: 400, delayed: 100 })],
});
const oa = oaStatusSchema.parse({ oa_pending: 8, oa_on_track: 6, oa_overdue: '2' });
const ageing = agingSchema.parse({ age1: 100, age2: 50, age3: 25, age4: 10, age5: 10, age6: 5, overdue: 75 });

test('open OAs and unpaid invoices, each with its on-track share', () => {
  const invoice = invoiceStatusSchema.parse({ invoice_open: 10, invoice_on_track: 4, invoice_overdue: 6, open_value: 5000, overdue_value: '3500' });
  const { track } = salesSummary(dash, oa, null, undefined, invoice);
  expect(track.oa).toEqual({ open: 8, onTrack: 6, late: 2, onTrackPct: 75, openValue: null, lateValue: null, progress: null, stages: [] });
  expect(track.invoice).toEqual({ open: 10, onTrack: 4, late: 6, onTrackPct: 40, openValue: 5000, lateValue: 3500, progress: null, stages: [] });
  expect(salesSummary(dash).track).toEqual({ oa: null, invoice: null });
});

test('latest month sales with change, and collection timeliness', () => {
  const s = salesSummary(dash, oa);
  expect([s.sales?.month, s.sales?.value, s.sales?.change]).toEqual(["Sep'26", 1000, 25]);
  expect([s.collected?.value, s.collected?.change, s.collected?.onTimePct]).toEqual([600, null, 80]);
});

test('ageing folds everything past 90 days into one slice', () => {
  const r = salesSummary(dash, oa, ageing).receivable;
  expect(r?.slices.map((x) => [x.label, x.value])).toEqual([
    ['0–30', 100],
    ['31–60', 50],
    ['61–90', 25],
    ['90+', 25],
  ]);
  expect([r?.total, r?.overdue]).toEqual([200, 75]);
});

test('a chosen month, its change from the one before, and fallback to the latest', () => {
  const aug = salesSummary(dash, oa, null, "Aug'26");
  expect([aug.month, aug.sales?.value, aug.sales?.change, aug.collected]).toEqual(["Aug'26", 800, null, null]);
  expect(salesSummary(dash, oa, null, 'nope').month).toBe("Sep'26");
  expect(salesSummary(dash).months).toEqual(["Aug'26", "Sep'26"]);
});

test('stages: not invoiced / part invoiced and unpaid / part paid, with OA value summed from them', () => {
  const row = (count: number, value: number, late: number, late_value: number, total = value, done = 0) => ({ count, value, total, done, on_track: count - late, late, late_value });
  const oaStaged = oaStatusSchema.parse({ ...oa, not_invoiced: row(5, 1000, 1, 200), part_invoiced: row(3, 400, 1, 100, 1000, 600) });
  const inv = invoiceStatusSchema.parse({ invoice_open: 4, invoice_on_track: 1, invoice_overdue: 3, open_value: 900, overdue_value: 700, unpaid: row(3, 800, 2, 600), part_paid: row(1, 100, 1, 100) });
  const { track } = salesSummary(dash, oaStaged, null, undefined, inv);
  expect(track.oa?.stages.map((s) => [s.label, s.count, s.value, s.onTrack, s.late])).toEqual([
    ['Not invoiced', 5, 1000, 4, 1],
    ['Part invoiced', 3, 400, 2, 1],
  ]);
  expect([track.oa?.openValue, track.oa?.lateValue]).toEqual([1400, 300]);
  // Ordered 1000 + 1000, of which 600 already invoiced.
  expect(track.oa?.progress).toEqual({ total: 2000, done: 600, pct: 30 });
  expect(track.invoice?.stages.map((s) => [s.label, s.count, s.value])).toEqual([
    ['Unpaid', 3, 800],
    ['Part paid', 1, 100],
  ]);
});
