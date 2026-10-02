/** @author Lokesh */
import { DEFAULT_RANGE_DAYS, financialYear, formatDate, lastDays, parseServerDate, rangeParams, toApiDate } from './date';

test('toApiDate', () => expect(toApiDate(new Date(2026, 0, 5))).toBe('2026-01-05'));

test('parseServerDate accepts the formats xserp emits', () => {
  expect(parseServerDate('2026-03-31')?.getDate()).toBe(31);
  expect(parseServerDate('2026-03-31 14:05:00')?.getHours()).toBe(14);
  expect(parseServerDate('31-03-2026')?.getMonth()).toBe(2);
  expect(parseServerDate('Mar 31, 2026')?.getFullYear()).toBe(2026);
  expect(parseServerDate('')).toBeNull();
  expect(parseServerDate(null)).toBeNull();
  expect(parseServerDate('garbage')).toBeNull();
});

test('formatDate falls back to a dash', () => {
  expect(formatDate('2026-03-31')).toBe('31 Mar 2026');
  expect(formatDate(null)).toBe('—');
});

test('default range is 30 days ending today', () => {
  const now = new Date(2026, 9, 2);
  const r = lastDays(DEFAULT_RANGE_DAYS, now);
  expect(toApiDate(r.till)).toBe('2026-10-02');
  expect(toApiDate(r.since)).toBe('2026-09-03');
});

test('financial year defaults to April and honours fy_start_day', () => {
  const fy = financialYear(null, new Date(2026, 1, 10));
  expect(toApiDate(fy.since)).toBe('2025-04-01');
  expect(toApiDate(fy.till)).toBe('2026-03-31');
  const jan = financialYear('01/01', new Date(2026, 1, 10));
  expect(toApiDate(jan.since)).toBe('2026-01-01');
});

test('rangeParams uses the requested key names', () => {
  const r = { since: new Date(2026, 0, 1), till: new Date(2026, 0, 31) };
  expect(rangeParams(r)).toEqual({ since: '2026-01-01', till: '2026-01-31' });
  expect(rangeParams(r, ['from_date', 'to_date'])).toEqual({ from_date: '2026-01-01', to_date: '2026-01-31' });
});
