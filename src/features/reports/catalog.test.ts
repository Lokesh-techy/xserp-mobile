/** @author Lokesh */
import { REPORTS, visibleReports } from './catalog';

const allow = (codes: string[]) => (code: string) => codes.includes(code);

test('only shows reports for modules the user can view, grouped in catalogue order', () => {
  const sections = visibleReports(allow(['SALES']), '');
  expect(sections.map((s) => s.title)).toEqual(['Sales']);
  expect(sections[0]!.items.every((i) => i.permission === 'SALES')).toBe(true);
});

test('search matches title and description across sections; empty sections drop out', () => {
  const sections = visibleReports(allow(['ACCOUNTS', 'SALES', 'PURCHASE', 'STORES']), 'gstr');
  expect(sections.map((s) => s.title)).toEqual(['Finance']);
  expect(sections[0]!.items.map((i) => i.id)).toEqual(['gstr1', 'gstr2', 'gstr3b']);
});

test('every entry is either an in-app route or an /erp/ web path', () => {
  for (const r of REPORTS) {
    if (r.kind === 'app') expect(String(r.href).startsWith('/')).toBe(true);
    else expect(r.path.startsWith('/erp/')).toBe(true);
  }
});
