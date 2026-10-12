/** @author Lokesh */
import { freshness } from './freshness';

const now = Date.parse('2026-10-09T12:00:00Z');
const ago = (ms: number) => new Date(now - ms);

test('ring drains over a day, colour bands at 1 h and 24 h', () => {
  expect(freshness(ago(0), now)).toEqual({ fill: 1, level: 'fresh', short: 'now' });
  expect(freshness(ago(20 * 60_000), now)).toMatchObject({ level: 'fresh', short: '20m' });
  expect(freshness(ago(12 * 3_600_000), now)).toMatchObject({ fill: 0.5, level: 'aging', short: '12h' });
  expect(freshness(ago(30 * 3_600_000), now)).toMatchObject({ fill: 0, level: 'stale', short: '30h' });
  expect(freshness(ago(72 * 3_600_000), now).short).toBe('3d');
  expect(freshness(null, now)).toEqual({ fill: 0, level: 'stale', short: '—' });
});
