/** @author Lokesh */
import { useCallback, useMemo, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { approvalTints, makeStyles, useTheme } from '@/core/theme';
import { filterItems, formatMoney } from '@/core/utils';
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

import { Facts } from './approval-card';
import type { ReviewEntry } from './review-pager';
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

/**
 * One document inside its group's panel. A tinted badge says the type, so the eye can scan a column of types;
 * code and amount carry the first line, party and date the second.
 */
function ReviewRowItem({
  row,
  onOpen,
}: {
  row: Extract<ReviewRow, { kind: 'entry' }>;
  onOpen: (entry: ReviewEntry) => void;
}) {
  const t = useTheme();
  const styles = useStyles();
  const { entry, first, last } = row;
  const s = entry.config.summary(entry.item);
  const tint = approvalTints[entry.config.type];
  const kind = entry.config.short ?? entry.config.noun;
  return (
    <ListRow
      edge={{ first, last }}
      onPress={() => onOpen(entry)}
      dividerInset={68}
      accessibilityLabel={`${kind} ${s.code}, ${s.party || 'no party'}`}
      style={styles.row}>
      <View style={[styles.badge, { backgroundColor: `${tint}17` }]}>
        <Text weight="extrabold" color={tint} style={styles.badgeText} numberOfLines={1} adjustsFontSizeToFit>
          {kind}
        </Text>
      </View>
      <View style={styles.main}>
        <View style={styles.line}>
          <Text variant="rowTitle" weight="bold" numberOfLines={1} style={styles.flex}>
            {s.code}
          </Text>
          {typeof s.amount === 'number' && (
            <Text variant="rowTitle" weight="bold" style={styles.num}>
              {formatMoney(s.amount, s.currency || '₹')}
            </Text>
          )}
        </View>
        <Text variant="rowMeta" color={t.colors.textMuted} numberOfLines={1}>
          {s.party || '—'}
        </Text>
        <Facts summary={s} />
      </View>
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
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: 11, lineHeight: 14, letterSpacing: 0.2 },
  main: { flex: 1, gap: 3 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1 },
}));
