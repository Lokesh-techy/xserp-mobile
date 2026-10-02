/** @author Lokesh */
import { filterItems, matches, normalize } from './search';

test('normalize strips case, accents and punctuation spacing', () => {
  expect(normalize('  Schnëll-Energy  ')).toBe('schnell-energy');
});

test('matches every token across fields', () => {
  expect(matches('sch po', 'Schnell Energy', 'PO/25-26/0012')).toBe(true);
  expect(matches('acme', 'Schnell Energy', null)).toBe(false);
  expect(matches('', 'anything')).toBe(true);
});

test('filterItems stays fast on 5 000 rows', () => {
  const rows = Array.from({ length: 5000 }, (_, i) => ({ code: `INV/${i}`, party: i % 2 ? 'Acme Ltd' : 'Globex' }));
  const t0 = Date.now();
  const out = filterItems(rows, 'acme 4999', (r) => [r.code, r.party]);
  expect(out).toHaveLength(1);
  expect(Date.now() - t0).toBeLessThan(200);
});
