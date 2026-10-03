/** @author Lokesh */
import { differenceInCalendarDays } from 'date-fns';

import { parseServerDate } from '@/core/utils';

import type { ReviewEntry } from './review-pager';

export type ReviewRow =
  | { kind: 'header'; key: string; label: string; count: number }
  | { kind: 'entry'; key: string; entry: ReviewEntry; first: boolean; last: boolean };

const BUCKETS = ['Today', 'Yesterday', 'This week', 'This month', 'Older', 'No date'] as const;

function bucketOf(date: Date | null, now: Date): (typeof BUCKETS)[number] {
  if (!date) return 'No date';
  const days = differenceInCalendarDays(now, date);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return 'This week';
  if (days < 30) return 'This month';
  return 'Older';
}

/**
 * Groups the review list by age (Today, Yesterday, This week…), keeping each group's incoming order.
 * Flat rows — headers interleaved — so a single FlatList renders it; `first`/`last` let rows draw one panel per group.
 */
export function toReviewRows(entries: ReviewEntry[], now = new Date()): ReviewRow[] {
  const groups = new Map<string, ReviewEntry[]>();
  for (const e of entries) {
    const b = bucketOf(parseServerDate(e.config.summary(e.item).date), now);
    const list = groups.get(b);
    if (list) list.push(e);
    else groups.set(b, [e]);
  }
  const rows: ReviewRow[] = [];
  for (const label of BUCKETS) {
    const list = groups.get(label);
    if (!list) continue;
    rows.push({ kind: 'header', key: `h:${label}`, label, count: list.length });
    list.forEach((entry, i) =>
      rows.push({ kind: 'entry', key: entry.key, entry, first: i === 0, last: i === list.length - 1 }),
    );
  }
  return rows;
}
