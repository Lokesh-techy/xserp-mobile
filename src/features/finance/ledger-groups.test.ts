/** @author Lokesh */
import { drCr, groupCounts, groupLedgers, type LedgerItem } from './ledger-groups';

const l = (id: string, name: string, group: string, balance: number | null): LedgerItem => ({ id, name, group, partyCode: null, balance });

const items = [
  l('1', 'zeta', 'Sundry Debtors', -500),
  l('2', 'Alpha', 'Sundry Debtors', -2000),
  l('3', 'HDFC', 'Bank Accounts', 900),
  l('4', 'beta', 'Sundry Debtors', null),
];

test('sections A–Z by group with count and net balance; rows panelled', () => {
  const rows = groupLedgers(items, 'name');
  expect(rows.map((r) => (r.kind === 'header' ? `[${r.group}]` : r.item.name))).toEqual(['[Bank Accounts]', 'HDFC', '[Sundry Debtors]', 'Alpha', 'beta', 'zeta']);
  expect(rows[2]).toMatchObject({ kind: 'header', count: 3, total: -2500 });
  expect(rows[3]).toMatchObject({ first: true, last: false });
  expect(rows[5]).toMatchObject({ first: false, last: true });
});

test('balance sort puts the biggest either side first and unknown balances last', () => {
  const names = groupLedgers(items, 'balance')
    .filter((r) => r.kind === 'item')
    .map((r) => (r.kind === 'item' ? r.item.name : ''));
  expect(names).toEqual(['HDFC', 'Alpha', 'zeta', 'beta']);
});

test('a group total is null until any balance is known', () => {
  expect(groupLedgers([l('9', 'x', 'G', null)], 'name')[0]).toMatchObject({ total: null });
});

test('Dr/Cr from a credit-positive balance', () => {
  expect(drCr(-1200)).toEqual({ amount: 1200, side: 'Dr' });
  expect(drCr(50)).toEqual({ amount: 50, side: 'Cr' });
  expect(drCr(0).side).toBeNull();
});

test('group counts for the filter', () => {
  expect(groupCounts(items)).toEqual([
    { group: 'Bank Accounts', count: 1 },
    { group: 'Sundry Debtors', count: 3 },
  ]);
});
