/** @author Lokesh */
import { useMemo, useState } from 'react';

import { approvalTints } from '@/core/theme';
import { parseTypes } from '@/features/home';

import { summarizeByType, useApprovalFeed } from './approval-feed';

/** The review feed filtered by a document-type selection (from the route, adjustable on screen). */
export function useReviewSelection(typesParam: string | undefined) {
  const feed = useApprovalFeed();
  const [selected, setSelected] = useState<string[]>(() => parseTypes(typesParam));
  const options = useMemo(() => summarizeByType(feed.entries).map((g) => ({ key: g.type, label: g.label, tint: approvalTints[g.type], count: g.count })), [feed.entries]);
  const entries = useMemo(() => (selected.length ? feed.entries.filter((e) => selected.includes(e.config.type)) : feed.entries), [feed.entries, selected]);
  const title = selected.length === 1 ? (options.find((o) => o.key === selected[0])?.label ?? 'Review') : selected.length ? 'Your selection' : 'Waiting for you';
  return { feed, options, entries, selected, setSelected, title };
}
