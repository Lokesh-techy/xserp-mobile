/** @author Lokesh */
import { parseQty, picksSummary, setPickQty } from './material-picks';

test('setting a quantity adds or updates; zero or less removes', () => {
  let p: Record<string, number> = {};
  p = setPickQty(p, 'a', 1);
  p = setPickQty(p, 'b', 5);
  p = setPickQty(p, 'a', 3);
  expect(p).toEqual({ a: 3, b: 5 });
  expect(setPickQty(p, 'a', 0)).toEqual({ b: 5 });
});

test('summary counts items and units', () => {
  expect(picksSummary({ a: 3, b: 2.5 })).toEqual({ items: 2, units: 5.5 });
  expect(picksSummary({})).toEqual({ items: 0, units: 0 });
});

test('typed quantities accept decimals and reject junk', () => {
  expect(parseQty('12')).toBe(12);
  expect(parseQty('2.5')).toBe(2.5);
  expect(parseQty('')).toBeNull();
  expect(parseQty('abc')).toBeNull();
  expect(parseQty('-3')).toBeNull();
});
