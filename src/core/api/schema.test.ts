/** @author Lokesh */
import { z } from 'zod';

import { zBool, zId, zList, zNum, zNumOrNull, zStr, zStrOrNull } from './schema';

test('zNum coerces server numbers', () => {
  expect(zNum.parse('1,234.50')).toBe(1234.5);
  expect(zNum.parse('')).toBe(0);
  expect(zNum.parse(null)).toBe(0);
  expect(zNum.parse(undefined)).toBe(0);
  expect(zNum.parse('abc')).toBe(0);
  expect(zNum.parse(7)).toBe(7);
});

test('zNumOrNull keeps missing values distinct', () => {
  expect(zNumOrNull.parse(null)).toBeNull();
  expect(zNumOrNull.parse('')).toBeNull();
  expect(zNumOrNull.parse('3')).toBe(3);
});

test('string helpers', () => {
  expect(zStr.parse(null)).toBe('');
  expect(zStr.parse(12)).toBe('12');
  expect(zStrOrNull.parse('')).toBeNull();
  expect(zId.parse(42)).toBe('42');
});

test('zBool understands Django and JSON booleans', () => {
  for (const v of [true, 1, '1', 'true', 'True']) expect(zBool.parse(v)).toBe(true);
  for (const v of [false, 0, '0', 'false', null, undefined, '']) expect(zBool.parse(v)).toBe(false);
});

test('zList treats missing or non-array as empty', () => {
  const s = z.object({ items: zList(z.object({ id: zId })) });
  expect(s.parse({}).items).toEqual([]);
  expect(s.parse({ items: null }).items).toEqual([]);
  expect(s.parse({ items: [{ id: 1 }] }).items).toEqual([{ id: '1' }]);
});
