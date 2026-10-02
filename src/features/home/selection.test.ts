/** @author Lokesh */
import { parseTypes, selectionTotal, serializeTypes, toggleType } from './selection';

const groups = [
  { key: 'po', count: 212 },
  { key: 'grn', count: 160 },
  { key: 'invoice', count: 98 },
];

test('toggling builds a combination; toggling again removes it', () => {
  let sel: string[] = [];
  sel = toggleType(sel, 'po');
  sel = toggleType(sel, 'grn');
  expect(sel).toEqual(['po', 'grn']);
  expect(toggleType(sel, 'po')).toEqual(['grn']);
});

test('nothing selected means everything', () => {
  expect(selectionTotal(groups, [])).toBe(470);
  expect(selectionTotal(groups, ['po', 'grn'])).toBe(372);
});

test('route param round-trip ignores junk', () => {
  expect(serializeTypes(['po', 'grn'])).toBe('po,grn');
  expect(parseTypes('po,grn')).toEqual(['po', 'grn']);
  expect(parseTypes(undefined)).toEqual([]);
  expect(parseTypes(' , ')).toEqual([]);
});
