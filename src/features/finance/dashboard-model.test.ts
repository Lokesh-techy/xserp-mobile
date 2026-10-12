/** @author Lokesh */
import { financeSummary, isFinanceSide } from './dashboard-model';
import { financeDashboardSchema } from './schemas';

const base = {
  bank: 600,
  bank_balance: [{ id: 1, name: 'HDFC', value: 600, group_name: 'Bank' }],
  cash: 200,
  cash_in_hand: [],
  receivable: 1000,
  receivables: [
    { id: 2, name: 'Acme', closing_balance: 250, group_name: 'Debtors' },
    { id: 3, name: 'Zen', closing_balance: 400, group_name: 'Debtors' },
  ],
  receivable_others: 100,
  payable: 1500,
  payables: [],
  payable_others: '500',
  sales_revenue: 900,
  tax_liability: 80,
};
const parse = (over: Record<string, unknown> = {}) => financeDashboardSchema.parse({ ...base, ...over });

test('cash and bank, payables covered and net position', () => {
  const s = financeSummary(parse());
  expect(s.liquid).toBe(800);
  expect(s.coverPct).toBe(40);
  expect(s.net).toBe(1100 - 2000);
  expect(s.bankAccounts).toBe(1);
  expect(s.period).toEqual({ sales: 900, tax: 80 });
});

test('each side splits trade and others and names its biggest party', () => {
  const [rec, pay] = financeSummary(parse()).sides;
  expect([rec.key, rec.total, rec.trade, rec.others]).toEqual(['receivable', 1100, 1000, 100]);
  expect(rec.top).toEqual({ name: 'Zen', value: 400, pct: 40 });
  expect([pay.total, pay.top]).toEqual([2000, null]);
});

test('cover is capped at 100 and absent with nothing payable', () => {
  expect(financeSummary(parse({ bank: 5000 })).coverPct).toBe(100);
  expect(financeSummary(parse({ payable: 0, payable_others: 0 })).coverPct).toBeNull();
});

test('latest month net and change skip empty months', () => {
  const s = financeSummary(parse(), [
    { month: 'Jul', income: 500, expense: 300 },
    { month: 'Aug', income: 400, expense: 350 },
    { month: 'Sep', income: 0, expense: 0 },
  ]);
  expect(s.latest).toEqual({ month: 'Aug', net: 50, change: -150 });
  expect(financeSummary(parse()).latest).toBeNull();
});

test('side param guard', () => {
  expect(isFinanceSide('payable')).toBe(true);
  expect(isFinanceSide('x')).toBe(false);
});
