/** @author Lokesh */
export const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/** True when every whitespace-separated token of `query` appears in at least one field. */
export function matches(query: string, ...fields: (string | null | undefined)[]): boolean {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const hay = normalize(fields.filter(Boolean).join(' '));
  return tokens.every((tk) => hay.includes(tk));
}

export function filterItems<T>(items: T[], query: string, pick: (t: T) => (string | null | undefined)[]): T[] {
  if (!query.trim()) return items;
  return items.filter((i) => matches(query, ...pick(i)));
}
