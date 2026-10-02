/** @author Lokesh */
import { countActiveFilters, rangePresets, type FilterField } from './filter-sheet';

const fields: FilterField[] = [
  { kind: 'dateRange', key: 'range', label: 'Date' },
  { kind: 'select', key: 'status', label: 'Status', options: [{ value: '100', label: 'All' }, { value: '2', label: 'Approved' }] },
  { kind: 'picker', key: 'party', label: 'Supplier', items: [] },
];

test('counts only values that differ from defaults', () => {
  const range = { since: new Date(2026, 0, 1), till: new Date(2026, 0, 31) };
  const defaults = { range, status: '100', party: null };
  expect(countActiveFilters(fields, defaults, defaults)).toBe(0);
  expect(countActiveFilters(fields, { ...defaults, status: '2', party: '9' }, defaults)).toBe(2);
  expect(countActiveFilters(fields, { ...defaults, range: { since: new Date(2026, 0, 2), till: range.till } }, defaults)).toBe(1);
});

test('date presets include last financial year', () => {
  const presets = rangePresets('01/04');
  const last = presets.find((p) => p.key === 'lastFy');
  const fy = presets.find((p) => p.key === 'fy');
  expect(last).toBeDefined();
  expect(last!.range.till.getTime()).toBeLessThan(fy!.range.since.getTime());
  expect(last!.range.since.getMonth()).toBe(3);
});
