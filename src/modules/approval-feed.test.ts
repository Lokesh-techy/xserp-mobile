/** @author Lokesh */
import { defineApproval, erase } from '@/features/approvals/engine';

import { buildFeed, summarizeByType } from './approval-feed';

type Doc = { id: string; date: string | null };
const make = (type: 'po' | 'invoice') =>
  erase(
    defineApproval<Doc>({
      type,
      title: type,
      noun: type,
      permission: 'PURCHASE',
      tint: 'purchase',
      queueKey: [type],
      queue: async () => [],
      id: (d) => d.id,
      summary: (d) => ({ code: d.id, party: '', date: d.date, status: { label: '', tone: 'info' } }),
      actions: [],
    }),
  );

test('merges every queue newest first, undated last, with stable keys', () => {
  const po = make('po');
  const inv = make('invoice');
  const feed = buildFeed([
    { config: po, items: [{ id: '1', date: '2026-09-01' }, { id: '2', date: null }] },
    { config: inv, items: [{ id: '1', date: '2026-10-01' }] },
  ]);
  expect(feed.map((e) => e.key)).toEqual(['invoice:1', 'po:1', 'po:2']);
});

test('summarises the feed by document type, largest first', () => {
  const po = make('po');
  const inv = make('invoice');
  const feed = buildFeed([
    { config: po, items: [{ id: '1', date: null }] },
    { config: inv, items: [{ id: '1', date: null }, { id: '2', date: null }] },
  ]);
  expect(summarizeByType(feed)).toEqual([
    { type: 'invoice', label: 'invoice', tint: 'purchase', count: 2 },
    { type: 'po', label: 'po', tint: 'purchase', count: 1 },
  ]);
  expect(summarizeByType([])).toEqual([]);
});
