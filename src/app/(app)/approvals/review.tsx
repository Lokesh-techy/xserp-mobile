/** @author Lokesh */
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { ReviewPager } from '@/features/approvals/engine';
import { useApprovalFeed } from '@/modules/approval-feed';
import { ListSkeleton, ScreenHeader } from '@/ui';

/** Focus review across every module, opened from Home's "Waiting for you". */
export default function Review() {
  const { start } = useLocalSearchParams<{ start?: string }>();
  const feed = useApprovalFeed();
  if (feed.loading && feed.entries.length === 0) {
    return (
      <View style={{ flex: 1 }}>
        <ScreenHeader title="Waiting for you" />
        <View style={{ padding: 18 }}>
          <ListSkeleton rows={2} />
        </View>
      </View>
    );
  }
  return <ReviewPager title="Waiting for you" entries={feed.entries} initialKey={start ?? null} empty={{ title: 'All clear', message: 'Nothing is waiting for your approval.' }} />;
}
