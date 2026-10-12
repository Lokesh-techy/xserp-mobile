/** @author Lokesh */
import fixture from '../../../__fixtures__/purchase/dashboard.json';
import { isOrderKind, purchaseSummary } from './dashboard-model';
import { poDashboardSchema } from './schemas';

const parse = (over: Record<string, unknown> = {}) => poDashboardSchema.parse({ ...fixture, ...over });

test('open POs, delayed and on-track share from both delivery groups', () => {
  const s = purchaseSummary(parse());
  expect(s.open).toBe(9);
  expect(s.delayed).toBe(5);
  expect(s.onTrackPct).toBe(44);
  expect(s.groups.map((g) => [g.key, g.total, g.onTrack, g.delayed])).toEqual([
    ['pending', 5, 3, 2],
    ['part supplied', 4, 1, 3],
  ]);
});

test('indent pipeline includes closed (string numbers coerced)', () => {
  expect(purchaseSummary(parse()).indents).toEqual({ raised: 12, closed: 4, pending: 8, duePo: 3, dueMaterial: 2 });
});

test('on-time rate for the latest month with change from the month before', () => {
  expect(purchaseSummary(parse()).onTime).toEqual({ month: 'Sep', pct: 64, delta: -19 });
});

test('empty months are skipped; no open POs gives no share', () => {
  const s = purchaseSummary(
    parse({
      pending: 0,
      part_supplied: 0,
      pending_delayed: 0,
      part_delayed: 0,
      performance: [
        { po_month: 'Aug', on_time: 3, delayed: 1 },
        { po_month: 'Sep', on_time: 0, delayed: 0 },
      ],
    }),
  );
  expect(s.onTrackPct).toBeNull();
  expect(s.onTime).toEqual({ month: 'Aug', pct: 75, delta: null });
  expect(purchaseSummary(parse({ performance: [] })).onTime).toBeNull();
});

test('open and late values; older servers without values read as zero', () => {
  const s = purchaseSummary(parse({ pending_value: '1200.5', part_value: 800, delayed_value: 950 }));
  expect([s.openValue, s.delayedValue, s.groups[0]!.value, s.groups[1]!.value]).toEqual([2000.5, 950, 1200.5, 800]);
  expect(purchaseSummary(parse()).openValue).toBe(0);
});

describe('order kinds', () => {
  const side = (n: number, month: string) => ({
    pending: n,
    pending_on_track: n,
    pending_delayed: 0,
    part_supplied: 0,
    part_on_track: 0,
    part_delayed: 0,
    pending_value: n * 100,
    performance: [{ po_month: month, on_time: n, delayed: 0 }],
  });
  const d = parse({ by_type: { po: side(7, 'Apr'), jo: side(2, 'May') } });

  test('each kind reads its own figures and chart; indents stay shared', () => {
    const jo = purchaseSummary(d, 'jo');
    expect([jo.open, jo.openValue, jo.performance[0]!.po_month]).toEqual([2, 200, 'May']);
    expect(purchaseSummary(d, 'po').open).toBe(7);
    expect(jo.indents).toEqual(purchaseSummary(d, 'po').indents);
  });

  test('servers without by_type fall back to the combined figures', () => {
    expect(purchaseSummary(parse(), 'jo').open).toBe(9);
  });

  test('isOrderKind splits PO Lookup rows by poType', () => {
    expect([
      isOrderKind({ poType: 1 }, 'jo'),
      isOrderKind({ poType: 0 }, 'jo'),
      isOrderKind({ poType: 0 }, 'po'),
    ]).toEqual([true, false, true]);
  });
});
