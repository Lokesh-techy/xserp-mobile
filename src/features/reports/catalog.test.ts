/** @author Lokesh */
import { REPORTS, visibleReports } from './catalog';

const allow = (codes: string[]) => (code: string) => codes.includes(code);

test('only shows reports for modules the user can view, grouped in catalogue order', () => {
  const sections = visibleReports(allow(['SALES']), '');
  expect(sections.map((s) => s.title)).toEqual(['Sales']);
  expect(sections[0]!.items.every((i) => i.permission === 'SALES')).toBe(true);
});

test('search matches title and description across sections; empty sections drop out', () => {
  const sections = visibleReports(allow(['ACCOUNTS', 'SALES', 'PURCHASE', 'STORES']), 'ageing');
  expect(sections.map((s) => s.title)).toEqual(['Finance']);
  expect(sections[0]!.items.map((i) => i.id)).toEqual(['aging']);
});

test('every entry opens an in-app route', () => {
  for (const r of REPORTS) expect(String(r.href).startsWith('/')).toBe(true);
});
