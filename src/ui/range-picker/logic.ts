/** @author Lokesh */
import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameYear,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

import type { DateRange } from '@/core/utils';

/** Which end of the range the next tap sets. */
export type RangeEnd = 'since' | 'till';

export const WEEK_STARTS_ON = 1; // Monday

/** The month as weeks of 7 cells; days outside the month are `null` so the grid keeps its shape. */
export function monthWeeks(month: Date): (Date | null)[][] {
  const first = startOfMonth(month);
  const last = endOfMonth(month);
  const weeks: (Date | null)[][] = [];
  let day = startOfWeek(first, { weekStartsOn: WEEK_STARTS_ON });
  while (!isAfter(day, last)) {
    const week: (Date | null)[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(day.getMonth() === first.getMonth() ? day : null);
      day = addDays(day, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

/**
 * One tap on a day. Setting the start never loses the end unless it would cross it; setting the end before
 * the start swaps them — so any two taps make a valid range, and the cursor moves to the other end.
 */
export function pickDay(range: DateRange, tapped: Date, editing: RangeEnd): { range: DateRange; next: RangeEnd } {
  const day = startOfDay(tapped);
  if (editing === 'since') {
    return { range: { since: day, till: isAfter(day, range.till) ? day : range.till }, next: 'till' };
  }
  if (isBefore(day, range.since)) return { range: { since: day, till: range.since }, next: 'since' };
  return { range: { since: range.since, till: day }, next: 'since' };
}

export type DayState = { inRange: boolean; isStart: boolean; isEnd: boolean };

export function dayState(day: Date, range: DateRange): DayState {
  const isStart = isSameDay(day, range.since);
  const isEnd = isSameDay(day, range.till);
  return { isStart, isEnd, inRange: !isBefore(day, startOfDay(range.since)) && !isAfter(day, startOfDay(range.till)) };
}

export const rangeDays = (r: DateRange) => differenceInCalendarDays(r.till, r.since) + 1;

/** "1 Sep – 30 Sep 2026", dropping the repeated year (and the whole date when it is one day). */
export function rangeLabel(r: DateRange): string {
  if (isSameDay(r.since, r.till)) return format(r.since, 'd MMM yyyy');
  return isSameYear(r.since, r.till)
    ? `${format(r.since, 'd MMM')} – ${format(r.till, 'd MMM yyyy')}`
    : `${format(r.since, 'd MMM yy')} – ${format(r.till, 'd MMM yy')}`;
}

/** Compact form for header buttons: "1–30 Sep", "28 Aug – 3 Sep". */
export function rangeShort(r: DateRange): string {
  if (isSameDay(r.since, r.till)) return format(r.since, 'd MMM');
  if (r.since.getMonth() === r.till.getMonth() && isSameYear(r.since, r.till))
    return `${format(r.since, 'd')}–${format(r.till, 'd MMM')}`;
  return `${format(r.since, 'd MMM')} – ${format(r.till, 'd MMM')}`;
}
