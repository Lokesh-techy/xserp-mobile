/** @author Lokesh */
import { mastersSummary } from './dashboard-model';
import { mastersDashboardSchema } from './schemas';

const payload = {
  parties: { total: 100, active: 90, inactive: 10, customers: 50, suppliers: 30, both: 20, other: 0 },
  materials: { total: 220, in_use: 200, not_in_use: 20, stocked: 150, non_stock: 40, services: 10, no_price: '50', added_this_month: 7 },
  categories: ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((name, i) => ({ name, count: 40 - i * 5 })),
};
const s = mastersSummary(mastersDashboardSchema.parse(payload));

test('parties by role with shares; "Neither" only when there are any', () => {
  expect(s.parties.activePct).toBe(90);
  expect(s.parties.roles.map((r) => [r.label, r.count, r.pct])).toEqual([
    ['Customers', 50, 50],
    ['Suppliers', 30, 30],
    ['Both', 20, 20],
  ]);
});

test('materials by kind, with the priced share and gaps', () => {
  expect([s.materials.inUse, s.materials.noPrice, s.materials.pricedPct, s.materials.added]).toEqual([200, 50, 75, 7]);
  expect(s.materials.kinds.map((k) => [k.label, k.count, k.pct])).toEqual([
    ['Stocked', 150, 75],
    ['Non-stock', 40, 20],
    ['Services', 10, 5],
  ]);
});

test('top categories, the rest folded into Others', () => {
  expect(s.categories.map((c) => [c.label, c.count])).toEqual([
    ['A', 40],
    ['B', 35],
    ['C', 30],
    ['D', 25],
    ['E', 20],
    ['Others', 25],
  ]);
});
