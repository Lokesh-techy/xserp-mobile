/** @author Lokesh */
import { router, useLocalSearchParams } from 'expo-router';

import { ReviewList } from '@/features/approvals/engine';
import { serializeTypes } from '@/features/home';
import { useReviewSelection } from '@/modules/use-review-selection';
import { TypeFilterBar } from '@/ui';

/** "Review": the list first — pick a document to see its detail and act. */
export default function Review() {
  const { types } = useLocalSearchParams<{ types?: string }>();
  const { feed, options, entries, selected, setSelected, title } = useReviewSelection(types);
  return (
    <ReviewList
      title={title}
      entries={entries}
      loading={feed.loading && feed.entries.length === 0}
      headerRight={
        options.length > 1 ? (
          <TypeFilterBar inHeader options={options} selected={selected} onChange={setSelected} />
        ) : undefined
      }
      onRefresh={feed.refetch}
      onOpen={(e) =>
        router.push({
          pathname: '/approvals/detail',
          params: { start: e.key, ...(selected.length ? { types: serializeTypes(selected) } : {}) },
        })
      }
    />
  );
}
