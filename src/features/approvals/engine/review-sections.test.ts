/** @author Lokesh */
import { toReviewRows } from './review-sections';
import type { ReviewEntry } from './review-pager';

const entry = (key: string, date: string | null) =>
  ({
    key,
    item: { date },
    config: { summary: (i: { date: string | null }) => ({ date: i.date }) },
  }) as unknown as ReviewEntry;

test('groups by age in a fixed order with counts and panel edges', () => {
  const now = new Date(2026, 9, 3, 12);
  const rows = toReviewRows(
    [
      entry('a', '2026-10-03'),
      entry('b', '2026-10-02'),
      entry('c', '2026-10-03'),
      entry('d', null),
      entry('e', '2026-06-01'),
    ],
    now,
  );
  expect(rows.map((r) => (r.kind === 'header' ? `${r.label}(${r.count})` : r.key))).toEqual([
    'Today(2)',
    'a',
    'c',
    'Yesterday(1)',
    'b',
    'Older(1)',
    'e',
    'No date(1)',
    'd',
  ]);
  expect(rows[1]).toMatchObject({ first: true, last: false });
  expect(rows[2]).toMatchObject({ first: false, last: true });
});
