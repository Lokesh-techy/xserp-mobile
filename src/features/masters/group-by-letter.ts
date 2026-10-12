/** @author Lokesh */
import type { RowEdge } from '@/ui';

export type LetterRow<T> =
  { kind: 'header'; key: string; label: string; count: number } | ({ kind: 'item'; key: string; item: T } & RowEdge);

/** The section a name files under: its first letter, upper-cased; digits and symbols go under `#`. */
export function letterOf(name: string): string {
  const c = name.trim().charAt(0).toUpperCase();
  return c >= 'A' && c <= 'Z' ? c : '#';
}

/**
 * A–Z sections (`#` first) as flat rows — headers interleaved — so one FlatList renders them; `first`/`last`
 * let each section draw as its own panel. Rows are sorted by name within a section.
 */
export function groupByLetter<T>(items: T[], nameOf: (t: T) => string, keyOf: (t: T) => string): LetterRow<T>[] {
  const groups = new Map<string, { sort: string; item: T }[]>();
  for (const item of items) {
    const name = nameOf(item).trim();
    const letter = letterOf(name);
    const entry = { sort: name.toUpperCase(), item };
    const list = groups.get(letter);
    if (list) list.push(entry);
    else groups.set(letter, [entry]);
  }
  const rows: LetterRow<T>[] = [];
  for (const letter of [...groups.keys()].sort(byLetter)) {
    const list = groups.get(letter)!.sort((a, b) => (a.sort < b.sort ? -1 : a.sort > b.sort ? 1 : 0));
    rows.push({ kind: 'header', key: `h:${letter}`, label: letter, count: list.length });
    list.forEach((e, i) =>
      rows.push({ kind: 'item', key: keyOf(e.item), item: e.item, first: i === 0, last: i === list.length - 1 }),
    );
  }
  return rows;
}

/** Search results: one panel in the incoming order, no headers. */
export function flatRows<T>(items: T[], keyOf: (t: T) => string): LetterRow<T>[] {
  return items.map((item, i) => ({
    kind: 'item',
    key: keyOf(item),
    item,
    first: i === 0,
    last: i === items.length - 1,
  }));
}

/** Indices of the header rows, for `stickyHeaderIndices`. */
export function headerIndices<T>(rows: LetterRow<T>[]): number[] {
  const out: number[] = [];
  rows.forEach((r, i) => r.kind === 'header' && out.push(i));
  return out;
}

const byLetter = (a: string, b: string) => (a === '#' ? -1 : b === '#' ? 1 : a < b ? -1 : a > b ? 1 : 0);
