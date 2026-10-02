/** @author Lokesh */
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { ReviewPager } from '@/features/approvals/engine';
import { useReviewSelection } from '@/modules/use-review-selection';
import { ListSkeleton, ScreenHeader, TypeFilterBar } from '@/ui';

/** One document at a time (opened from the review list); swipe for the next in the same selection. */
export default function ReviewDetail() {
  const { start, types } = useLocalSearchParams<{ start?: string; types?: string }>();
  const { feed, options, entries, selected, setSelected, title } = useReviewSelection(types);
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
  const filter = options.length > 1 ? <TypeFilterBar options={options} selected={selected} onChange={setSelected} /> : undefined;
  return <ReviewPager key={selected.join(',')} title={title} entries={entries} initialKey={start ?? null} accessory={filter} empty={{ title: 'All clear', message: 'Nothing left in this selection.' }} />;
}
