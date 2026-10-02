/** @author Lokesh */
// Which document types the user wants to review. Empty selection means "everything".

export const toggleType = (selected: string[], key: string) => (selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]);

export const selectionTotal = (groups: { key: string; count: number }[], selected: string[]) =>
  groups.filter((g) => selected.length === 0 || selected.includes(g.key)).reduce((n, g) => n + g.count, 0);

export const serializeTypes = (types: string[]) => types.join(',');

export const parseTypes = (param: string | undefined): string[] =>
  (param ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
