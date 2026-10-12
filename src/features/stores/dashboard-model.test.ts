/** @author Lokesh */
import dashboard from '../../../__fixtures__/stores/dashboard_data.json';
import grnStatus from '../../../__fixtures__/stores/grnStatus.json';
import indentStatus from '../../../__fixtures__/stores/indentStatus.json';
import { storesSummary } from './dashboard-model';
import { grnStatusSchema, indentStatusSchema, storeDashboardSchema } from './schemas';

const d = storeDashboardSchema.parse(dashboard);

test('stock flow with change against opening (string numbers coerced)', () => {
  expect(storesSummary(d).stock).toEqual({ opening: 1500000, received: 425000, issued: 300000, closing: 1625000, change: 125000, changePct: 8 });
  expect(storesSummary(storeDashboardSchema.parse({ ...dashboard, stock_statement: null })).stock).toBeNull();
});

test('indents and GRNs with their completion share', () => {
  const s = storesSummary(d, indentStatusSchema.parse(indentStatus), grnStatusSchema.parse(grnStatus));
  expect(s.indents).toEqual({ raised: 12, closed: 4, open: 8, duePo: 3, dueMaterial: 2, closedPct: 33 });
  expect(s.grns).toEqual({ raised: 20, inProcess: 5, accounted: 15, accountedPct: 75 });
  expect(storesSummary(d).indents).toBeUndefined();
});

test('stock mix keeps the biggest categories and folds the rest into Others', () => {
  const many = storeDashboardSchema.parse({
    ...dashboard,
    stock_mix: ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((category, i) => ({ category, value: (i + 1) * 10 })),
  });
  const s = storesSummary(many);
  expect(s.mix.map((m) => [m.label, m.value])).toEqual([
    ['G', 70],
    ['F', 60],
    ['E', 50],
    ['D', 40],
    ['C', 30],
    ['Others', 30],
  ]);
  expect(s.mixTotal).toBe(280);
});
