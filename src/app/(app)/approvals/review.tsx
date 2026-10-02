/** @author Lokesh */
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { approvalTints } from '@/core/theme';
import { ReviewPager } from '@/features/approvals/engine';
import { parseTypes } from '@/features/home';
import { summarizeByType, useApprovalFeed } from '@/modules/approval-feed';
import { ListSkeleton, ScreenHeader, TypeFilterBar } from '@/ui';

/** Focus review across modules — everything, one type, or any combination (adjustable mid-review). */
export default function Review() {
  const { start, types } = useLocalSearchParams<{ start?: string; types?: string }>();
  const feed = useApprovalFeed();
  const [selected, setSelected] = useState<string[]>(() => parseTypes(types));
  const options = useMemo(() => summarizeByType(feed.entries).map((g) => ({ key: g.type, label: g.label, tint: approvalTints[g.type], count: g.count })), [feed.entries]);
  const entries = useMemo(() => (selected.length ? feed.entries.filter((e) => selected.includes(e.config.type)) : feed.entries), [feed.entries, selected]);
  const title = selected.length === 1 ? (options.find((o) => o.key === selected[0])?.label ?? 'Review') : selected.length ? 'Your selection' : 'Waiting for you';
  const filter = options.length > 1 ? <TypeFilterBar options={options} selected={selected} onChange={setSelected} /> : null;

  if (feed.loading && feed.entries.length === 0) {
    return (
      <View style={{ flex: 1 }}>
        <ScreenHeader title={title} />
        <View style={{ padding: 18 }}>
          <ListSkeleton rows={2} />
        </View>
      </View>
    );
  }
  return <ReviewPager key={selected.join(',')} title={title} entries={entries} initialKey={start ?? null} accessory={filter} empty={{ title: 'All clear', message: 'Nothing left in this selection.' }} />;
}
