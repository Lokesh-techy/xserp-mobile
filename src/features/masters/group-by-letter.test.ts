/** @author Lokesh */
import { flatRows, groupByLetter, headerIndices, letterOf } from './group-by-letter';

type P = { id: string; name: string };
const p = (id: string, name: string): P => ({ id, name });
const group = (items: P[]) =>
  groupByLetter(
    items,
    (i) => i.name,
    (i) => i.id,
  );

test('letterOf upper-cases and files digits and symbols under #', () => {
  expect(letterOf('acme')).toBe('A');
  expect(letterOf('  zeta')).toBe('Z');
  expect(letterOf('3M India')).toBe('#');
  expect(letterOf('(Old) Globex')).toBe('#');
  expect(letterOf('')).toBe('#');
});

test('groups into sorted sections with # first and counts on each header', () => {
  const rows = group([p('1', 'beta'), p('2', 'Alpha'), p('3', '9 Volt'), p('4', 'acme'), p('5', 'Bravo')]);
  expect(rows.map((r) => (r.kind === 'header' ? `${r.label}:${r.count}` : r.key))).toEqual([
    '#:1',
    '3',
    'A:2',
    '4',
    '2',
    'B:2',
    '1',
    '5',
  ]);
});

test('marks the first and last row of each section so it draws as one panel', () => {
  const rows = group([p('1', 'Alpha'), p('2', 'Apex'), p('3', 'Axe'), p('4', 'Beta')]);
  const edges = rows.flatMap((r) => (r.kind === 'item' ? [`${r.key}${r.first ? 'F' : ''}${r.last ? 'L' : ''}`] : []));
  expect(edges).toEqual(['1F', '2', '3L', '4FL']);
});

test('headerIndices points at every header row', () => {
  const rows = group([p('1', 'Alpha'), p('2', 'Beta'), p('3', 'Bob')]);
  expect(headerIndices(rows)).toEqual([0, 2]);
});

test('flatRows keeps order with a single panel and no headers', () => {
  const rows = flatRows([p('2', 'b'), p('1', 'a'), p('3', 'c')], (i) => i.id);
  expect(rows.every((r) => r.kind === 'item')).toBe(true);
  expect(rows.map((r) => r.key)).toEqual(['2', '1', '3']);
  expect(rows.map((r) => (r.kind === 'item' ? [r.first, r.last] : null))).toEqual([
    [true, false],
    [false, false],
    [false, true],
  ]);
  expect(headerIndices(rows)).toEqual([]);
});

test('empty input gives no rows', () => {
  expect(group([])).toEqual([]);
});
