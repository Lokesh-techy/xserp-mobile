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

test('summarises the feed by document type in a fixed order (stable across refreshes)', () => {
  const po = make('po');
  const inv = make('invoice');
  const feed = buildFeed([
    { config: po, items: [{ id: '1', date: null }] },
    { config: inv, items: [{ id: '1', date: null }, { id: '2', date: null }] },
  ]);
  expect(summarizeByType(feed)).toEqual([
    { type: 'po', label: 'po', tint: 'purchase', count: 1, value: 0, foreign: false },
    { type: 'invoice', label: 'invoice', tint: 'purchase', count: 2, value: 0, foreign: false },
  ]);
  expect(summarizeByType([])).toEqual([]);
});

test('totals rupee amounts per type; foreign-currency documents are flagged, not added', () => {
  const priced = erase(
    defineApproval<{ id: string; amount: number; currency: string }>({
      type: 'po',
      title: 'po',
      noun: 'PO',
      permission: 'PURCHASE',
      tint: 'purchase',
      queueKey: ['po'],
      queue: async () => [],
      id: (d) => d.id,
      summary: (d) => ({ code: d.id, party: '', amount: d.amount, currency: d.currency, status: { label: '', tone: 'info' } }),
      actions: [],
    }),
  );
  const feed = buildFeed([
    {
      config: priced,
      items: [
        { id: '1', amount: 1000, currency: '₹' },
        { id: '2', amount: 250.5, currency: 'INR' },
        { id: '3', amount: 99, currency: '' },
        { id: '4', amount: 500, currency: '$' },
      ],
    },
  ]);
  expect(summarizeByType(feed)[0]).toMatchObject({ count: 4, value: 1349.5, foreign: true });
});

test('repeated or blank ids still get unique keys', () => {
  const po = make('po');
  const feed = buildFeed([{ config: po, items: [{ id: '7', date: null }, { id: '7', date: null }, { id: '', date: null }, { id: '', date: null }] }]);
  expect(new Set(feed.map((e) => e.key)).size).toBe(4);
});
