/** @author Lokesh */
import aging from '../../../__fixtures__/finance/aging.json';
import ledgers from '../../../__fixtures__/finance/aging_ledgers.json';
import dashboard from '../../../__fixtures__/finance/dashboard_api.json';
import ie from '../../../__fixtures__/finance/income_and_expenses.json';
import vouchers from '../../../__fixtures__/finance/ledger_data.json';

import { BUCKETS, bucketAmount, bucketFromParam, bucketParam, bucketParams, isReceivableGroup } from './buckets';
import { agingDetailsSchema, bucketLedgersSchema, financeDashboardSchema, incomeExpenseSchema, ledgerBalancesSchema, ledgerDataSchema } from './schemas';

test('dashboard list values come from value, closing_balance or amount', () => {
  const d = financeDashboardSchema.parse(dashboard);
  expect(d.bank).toBe(1250000);
  expect(d.receivables.map((r) => r.value)).toEqual([300000, 120000]);
  expect(d.payables[0]?.value).toBe(90000);
  expect(d.tax_liability).toBe(65000);
});

test('other fixtures parse', () => {
  expect(incomeExpenseSchema.parse(ie).income_and_expenses[0]?.income).toBe(900000);
  expect(agingDetailsSchema.parse(aging).payable_aging?.age4).toBe(40);
  expect(bucketLedgersSchema.parse(ledgers).ledgers[0]?.closing_balance).toBe(300000);
  expect(ledgerDataSchema.parse(vouchers).vouchers[1]).toMatchObject({ is_debit: false, value: 2000 });
});

test('bucket params', () => {
  const b = bucketFromParam('r-age2');
  expect(b).toMatchObject({ receivable: true, scope: 'trade', bucket: { key: 'age2' } });
  // option=ledgers: the server does int(is_receivable), so flags go as 1/0.
  expect(bucketParams(b!)).toEqual({ is_receivable: 1, option: 'ledgers', is_advance: 0, start_days: 31, end_days: 60, group_name: 'Sundry Debtors' });
  expect(bucketParams(bucketFromParam('p-advance')!)).toMatchObject({ is_receivable: 0, is_advance: 1, group_name: 'Sundry Creditors' });
  expect(bucketParams(bucketFromParam('po-age6')!)).toMatchObject({ start_days: 181, end_days: 100000, group_name: 'Other Current Liabilities' });
  expect(bucketParam(true, 'others', 'age5')).toBe('ro-age5');
  expect(bucketFromParam('ro-age5')).toMatchObject({ receivable: true, scope: 'others', bucket: { startDays: 121, endDays: 180 } });
  expect(bucketFromParam('r-billable')).toBeNull(); // no ledger view for un-billed
  expect(bucketFromParam('x-zzz')).toBeNull();
  expect(BUCKETS.map((x) => x.key)).toEqual(['age1', 'age2', 'age3', 'age4', 'age5', 'age6', 'advance', 'billable', 'excess']);
});

test('ageing details: cached null, payable advance shown as a magnitude', () => {
  const d = agingDetailsSchema.parse({ payable_aging: { advance: -500, age5: '12', age7: 3 }, datetime: '2026-10-09 09:00:00' });
  expect(bucketAmount(d.payable_aging!, 'advance')).toBe(500);
  expect(d.payable_aging?.age5).toBe(12);
  expect(d.receivable_aging).toBeUndefined();
});

test('ledger balances parse', () => {
  const d = ledgerBalancesSchema.parse({ ledgers: [{ id: 3, name: 'HDFC', group_name: 'Bank Accounts', balance: '-1200.5', party_code: null }], computed_on: null });
  expect(d.ledgers[0]).toMatchObject({ id: '3', balance: -1200.5, party_code: null });
});

test('ledger groups map to receivable/payable', () => {
  expect(isReceivableGroup('Sundry Debtors')).toBe(true);
  expect(isReceivableGroup('Sundry Creditors')).toBe(false);
  expect(isReceivableGroup('Bank Accounts')).toBeNull();
});
