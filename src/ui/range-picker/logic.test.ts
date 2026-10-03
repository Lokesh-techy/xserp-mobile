/** @author Lokesh */
import { monthWeeks, pickDay, rangeDays, rangeLabel, rangeShort } from './logic';

const d = (m: number, day: number, y = 2026) => new Date(y, m - 1, day);

test('month grid starts on Monday and pads outside days with null', () => {
  const weeks = monthWeeks(d(10, 1)); // 1 Oct 2026 is a Thursday
  expect(weeks[0]?.slice(0, 3)).toEqual([null, null, null]);
  expect(weeks[0]?.[3]?.getDate()).toBe(1);
  expect(weeks.every((w) => w.length === 7)).toBe(true);
  expect(weeks.flat().filter(Boolean)).toHaveLength(31);
});

test('two taps always make a valid range', () => {
  const r = { since: d(9, 10), till: d(9, 20) };
  // start moves, end kept
  expect(pickDay(r, d(9, 5), 'since')).toEqual({ range: { since: d(9, 5), till: d(9, 20) }, next: 'till' });
  // start past the end pulls the end along
  expect(pickDay(r, d(9, 25), 'since').range).toEqual({ since: d(9, 25), till: d(9, 25) });
  // end before start swaps
  expect(pickDay(r, d(9, 1), 'till')).toEqual({ range: { since: d(9, 1), till: d(9, 10) }, next: 'since' });
  expect(pickDay(r, d(9, 30), 'till').range).toEqual({ since: d(9, 10), till: d(9, 30) });
});

test('labels', () => {
  expect(rangeDays({ since: d(9, 1), till: d(9, 30) })).toBe(30);
  expect(rangeLabel({ since: d(9, 1), till: d(9, 30) })).toBe('1 Sep – 30 Sep 2026');
  expect(rangeShort({ since: d(9, 1), till: d(9, 30) })).toBe('1–30 Sep');
  expect(rangeShort({ since: d(8, 28), till: d(9, 3) })).toBe('28 Aug – 3 Sep');
});
