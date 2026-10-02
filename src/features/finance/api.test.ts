/** @author Lokesh */
import aging from '../../../__fixtures__/finance/aging.json';
import ledgers from '../../../__fixtures__/finance/aging_ledgers.json';
import dashboard from '../../../__fixtures__/finance/dashboard_api.json';
import ie from '../../../__fixtures__/finance/income_and_expenses.json';
import vouchers from '../../../__fixtures__/finance/ledger_data.json';

import { BUCKETS, bucketFromParam, bucketParams, isReceivableGroup } from './buckets';
import { agingSummarySchema, bucketLedgersSchema, financeDashboardSchema, incomeExpenseSchema, ledgerDataSchema } from './schemas';

test('dashboard list values come from value, closing_balance or amount', () => {
  const d = financeDashboardSchema.parse(dashboard);
  expect(d.bank).toBe(1250000);
  expect(d.receivables.map((r) => r.value)).toEqual([300000, 120000]);
  expect(d.payables[0]?.value).toBe(90000);
  expect(d.tax_liability).toBe(65000);
});

test('other fixtures parse', () => {
  expect(incomeExpenseSchema.parse(ie).income_and_expenses[0]?.income).toBe(900000);
  expect(agingSummarySchema.parse(aging).payable_aging?.age4).toBe(40);
  expect(bucketLedgersSchema.parse(ledgers).ledgers[0]?.closing_balance).toBe(300000);
  expect(ledgerDataSchema.parse(vouchers).vouchers[1]).toMatchObject({ is_debit: false, value: 2000 });
});

test('bucket params', () => {
  const b = bucketFromParam('r-age2');
  expect(b).toMatchObject({ receivable: true, bucket: { key: 'age2' } });
  expect(bucketParams(b!)).toEqual({ is_receivable: 'true', option: 'ledgers', is_advance: 'false', start_days: 31, end_days: 60 });
  expect(bucketParams(bucketFromParam('p-advance')!)).toMatchObject({ is_receivable: 'false', is_advance: 'true' });
  expect(bucketFromParam('x-zzz')).toBeNull();
  expect(BUCKETS.map((x) => x.key)).toEqual(['age1', 'age2', 'age3', 'age4', 'advance']);
});

test('ledger groups map to receivable/payable', () => {
  expect(isReceivableGroup('Sundry Debtors')).toBe(true);
  expect(isReceivableGroup('Sundry Creditors')).toBe(false);
  expect(isReceivableGroup('Bank Accounts')).toBeNull();
});
