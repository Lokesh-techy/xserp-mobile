/** @author Lokesh */
import { useCallback, useMemo, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { approvalTints, makeStyles, useTheme } from '@/core/theme';
import { filterItems } from '@/core/utils';
import {
  ListRow,
  ListSkeleton,
  ModuleScreen,
  StateView,
  Text,
  useHostRefresh,
  useScreenSearch,
  type ScrollHost,
} from '@/ui';

import { Amount, DateLabel, DocCode, Facts } from './approval-card';
import { CardActions } from './card-actions';
import type { ReviewEntry } from './review-pager';
import type { ApprovalType } from './types';
import { toReviewRows, type ReviewRow } from './review-sections';

type Props = {
  title: string;
  entries: ReviewEntry[];
  loading: boolean;
  /** At the right of the header bar, e.g. the document-type menu. */
  headerRight?: ReactNode;
  onOpen: (entry: ReviewEntry) => void;
  onRefresh: () => Promise<unknown>;
};

/** The review queue as a list: scan, search, then open one to see its detail and act. */
export function ReviewList(props: Props) {
  return (
    <ModuleScreen
      title={props.title}
      subtitle={props.loading ? 'Loading…' : `${props.entries.length} waiting`}
      headerRight={props.headerRight}>
      {(host) => <Body host={host} {...props} />}
    </ModuleScreen>
  );
}

function Body({ host, entries, loading, onOpen, onRefresh }: Props & { host: ScrollHost }) {
  const styles = useStyles();
  const query = useScreenSearch('Search code, party or type');
  useHostRefresh(
    host,
    useCallback(() => onRefresh(), [onRefresh]),
  );
  const rows = useMemo(
    () =>
      toReviewRows(
        filterItems(entries, query, (e) => {
          const s = e.config.summary(e.item);
          return [s.code, s.party, e.config.noun, ...(e.config.search?.(e.item) ?? [])];
        }),
      ),
    [entries, query],
  );
  return host.attach(
    <Animated.FlatList
      {...host.scrollProps}
      data={rows}
      keyExtractor={(r) => r.key}
      contentContainerStyle={styles.pad}
      initialNumToRender={14}
      windowSize={9}
      keyboardShouldPersistTaps="handled"
      ListEmptyComponent={
        loading ? (
          <ListSkeleton rows={4} />
        ) : (
          <StateView
            icon="checkmark-done-outline"
            title={query ? 'No matches' : 'All clear'}
            message={query ? 'Try a different search.' : 'Nothing left in this selection.'}
          />
        )
      }
      renderItem={({ item }) =>
        item.kind === 'header' ? (
          <GroupHeader label={item.label} count={item.count} />
        ) : (
          <ReviewRowItem row={item} onOpen={onOpen} />
        )
      }
    />,
  );
}

function GroupHeader({ label, count }: { label: string; count: number }) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.header} accessibilityRole="header">
      <Text variant="label" color={t.colors.text}>
        {label}
      </Text>
      <Text variant="caption" color={t.colors.textFaint} style={styles.num}>
        {count}
      </Text>
    </View>
  );
}

/** The document type, spelled out, for the card's overline. */
const KIND: Record<ApprovalType, string> = {
  po: 'Purchase order',
  invoice: 'Invoice',
  oa: 'Order acknowledgement',
  grn: 'Goods receipt',
  icd: 'GRN audit',
  rate: 'Rate request',
};

/**
 * One document inside its group's panel, using the full card width: the type is named in its colour on the
 * overline and marked by a thin stripe at the card's edge; code and amount carry the first line, party and
 * facts follow, then the footer bar with the date and the actions.
 */
function ReviewRowItem({
  row,
  onOpen,
}: {
  row: Extract<ReviewRow, { kind: 'entry' }>;
  onOpen: (entry: ReviewEntry) => void;
}) {
  const styles = useStyles();
  const { entry, first, last } = row;
  const s = entry.config.summary(entry.item);
  const tint = approvalTints[entry.config.type];
  return (
    <ListRow
      edge={{ first, last }}
      onPress={() => onOpen(entry)}
      dividerInset={14}
      accessibilityLabel={`${KIND[entry.config.type]} ${s.code}, ${s.party || 'no party'}`}
      style={styles.row}>
      <View style={styles.top}>
        <View style={[styles.stripe, { backgroundColor: tint }]} />
        <View style={styles.line}>
          <DocCode code={s.code} kind={{ label: KIND[entry.config.type], tint }} />
          {typeof s.amount === 'number' && <Amount value={s.amount} symbol={s.currency || '₹'} />}
        </View>
        <Text variant="body" weight="semibold" numberOfLines={1}>
          {s.party || '—'}
        </Text>
        <Facts summary={s} skipDate />
      </View>
      <CardActions config={entry.config} item={entry.item} leading={<DateLabel date={s.date} />} />
    </ListRow>
  );
}

const useStyles = makeStyles((t) => ({
  pad: { paddingHorizontal: t.space.gutter, paddingTop: 4, paddingBottom: 48 },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    paddingHorizontal: 4,
    paddingTop: 18,
    paddingBottom: 8,
  },
  num: { fontVariant: ['tabular-nums'] },
  row: { paddingHorizontal: 14 },
  top: { gap: 4 },
  // The type's colour as a thin bar flush with the card's left edge, alongside the content.
  stripe: {
    position: 'absolute',
    left: -14,
    top: 2,
    bottom: 2,
    width: 3,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  line: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  flex: { flex: 1 },
}));
