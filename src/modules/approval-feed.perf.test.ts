/** @author Lokesh */
import { defineApproval, erase } from '@/features/approvals/engine';

import { buildFeed } from './approval-feed';

type Doc = { id: string; date: string };
const config = erase(
  defineApproval<Doc>({
    type: 'po',
    title: 'po',
    noun: 'PO',
    permission: 'PURCHASE',
    tint: 'purchase',
    queueKey: ['po'],
    queue: async () => [],
    id: (d) => d.id,
    summary: (d) => ({ code: d.id, party: '', date: d.date, status: { label: '', tone: 'info' } }),
    actions: [],
  }),
);

test('building the Home feed for 1 500 pending documents stays well under a frame budget', () => {
  // Mixed formats exactly as xserp sends them.
  const fmts = (i: number) => (i % 3 === 0 ? `2026-09-${String((i % 28) + 1).padStart(2, '0')} 10:20:00` : i % 3 === 1 ? `${String((i % 28) + 1).padStart(2, '0')}-09-2026` : `2026-09-${String((i % 28) + 1).padStart(2, '0')}`);
  const items = Array.from({ length: 1500 }, (_, i) => ({ id: String(i), date: fmts(i) }));
  const t0 = performance.now();
  const feed = buildFeed([{ config, items }]);
  const ms = performance.now() - t0;
  expect(feed).toHaveLength(1500);
  expect(ms).toBeLessThan(60);
});
