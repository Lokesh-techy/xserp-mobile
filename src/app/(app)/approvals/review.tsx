/** @author Lokesh */
import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { ReviewPager } from '@/features/approvals/engine';
import { useApprovalFeed } from '@/modules/approval-feed';
import { ListSkeleton, ScreenHeader } from '@/ui';

/** Focus review across every module, opened from Home's "Waiting for you". */
export default function Review() {
  const { start, type } = useLocalSearchParams<{ start?: string; type?: string }>();
  const feed = useApprovalFeed();
  // `type` narrows the review to one document type (tapped from the Home chips).
  const entries = useMemo(() => (type ? feed.entries.filter((e) => e.config.type === type) : feed.entries), [feed.entries, type]);
  const title = type ? (entries[0]?.config.title ?? 'Approvals') : 'Waiting for you';
  if (feed.loading && entries.length === 0) {
    return (
      <View style={{ flex: 1 }}>
        <ScreenHeader title={title} />
        <View style={{ padding: 18 }}>
          <ListSkeleton rows={2} />
        </View>
      </View>
    );
  }
  return <ReviewPager title={title} entries={entries} initialKey={start ?? null} empty={{ title: 'All clear', message: 'Nothing is waiting for your approval.' }} />;
}
