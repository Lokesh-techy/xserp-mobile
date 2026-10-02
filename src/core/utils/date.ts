/** @author Lokesh */
import { addYears, endOfMonth, format, isValid, parse, startOfDay, startOfMonth, subDays } from 'date-fns';

export type DateRange = { since: Date; till: Date };
export const DEFAULT_RANGE_DAYS = 30;

const SERVER_FORMATS = ['yyyy-MM-dd HH:mm:ss', "yyyy-MM-dd'T'HH:mm:ss", 'yyyy-MM-dd', 'dd-MM-yyyy', 'dd/MM/yyyy', 'MMM d, yyyy', 'MMM dd, yyyy', 'dd MMM yyyy'];

export const toApiDate = (d: Date) => format(d, 'yyyy-MM-dd');

// Fast paths for the shapes xserp actually sends; date-fns `parse` is ~100× slower and only a fallback.
const ISO = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/;
const DMY = /^(\d{2})[-/](\d{2})[-/](\d{4})$/;

function fast(value: string): Date | null {
  let m = ISO.exec(value);
  if (m) {
    const d = new Date(+m[1]!, +m[2]! - 1, +m[3]!, +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0));
    return d.getMonth() === +m[2]! - 1 ? d : null;
  }
  m = DMY.exec(value);
  if (m) {
    const d = new Date(+m[3]!, +m[2]! - 1, +m[1]!);
    return d.getMonth() === +m[2]! - 1 ? d : null;
  }
  return null;
}

export function parseServerDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const value = s.trim().replace(/\.\d+$/, '');
  const quick = fast(value);
  if (quick) return quick;
  for (const f of SERVER_FORMATS) {
    const d = parse(value, f, new Date());
    if (isValid(d)) return d;
  }
  return null;
}

export function formatDate(v: string | Date | null | undefined, pattern = 'dd MMM yyyy'): string {
  const d = v instanceof Date ? v : parseServerDate(v);
  return d ? format(d, pattern) : '—';
}

export function lastDays(n: number, now = new Date()): DateRange {
  return { since: startOfDay(subDays(now, n - 1)), till: startOfDay(now) };
}

export function thisMonth(now = new Date()): DateRange {
  return { since: startOfMonth(now), till: startOfDay(endOfMonth(now)) };
}

/** `fy_start_day` from login looks like "01/04" (dd/MM); defaults to 1 April when absent/unparseable. */
export function financialYear(fyStartDay?: string | null, at = new Date()): DateRange {
  const m = fyStartDay?.match(/^(\d{1,2})[/-](\d{1,2})/);
  const day = m ? Number(m[1]) : 1;
  const month = m ? Number(m[2]) - 1 : 3;
  let since = new Date(at.getFullYear(), month, day);
  if (since > at) since = addYears(since, -1);
  return { since, till: subDays(addYears(since, 1), 1) };
}

export function rangeParams(r: DateRange, keys: readonly [string, string] = ['since', 'till']): Record<string, string> {
  return { [keys[0]]: toApiDate(r.since), [keys[1]]: toApiDate(r.till) };
}
