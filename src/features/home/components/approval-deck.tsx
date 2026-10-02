/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';

import { enter, makeStyles, useTheme, type Tone } from '@/core/theme';
import { formatDate, formatMoney } from '@/core/utils';
import { Bone, PressableScale, StatusPill, Text } from '@/ui';

export type DeckCard = {
  key: string;
  noun: string;
  tint: string;
  code: string;
  party: string;
  amount?: number | null;
  currency?: string | null;
  date?: string | null;
  status: { label: string; tone: Tone };
};

type Props = {
  cards: DeckCard[];
  loading: boolean;
  onOpen: (key: string | null) => void;
  extra?: { label: string; count: number; onPress: () => void };
  nested?: object;
};

/** "Waiting for you": the newest pending documents from every module, one tap from review. */
export function ApprovalDeck({ cards, loading, onOpen, extra, nested }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(320, width * 0.74);
  const total = cards.length;

  if (!loading && total === 0 && !extra?.count) {
    return (
      <Animated.View entering={enter(40)} style={styles.clear}>
        <View style={styles.clearIcon}>
          <Ionicons name="checkmark-done" size={20} color={t.colors.success} />
        </View>
        <View style={styles.flex}>
          <Text variant="heading">All clear</Text>
          <Text variant="caption" color={t.colors.textMuted}>
            Nothing is waiting for your approval.
          </Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={enter(40)} style={styles.root}>
      <View style={styles.head}>
        <Text variant="heading">{loading && total === 0 ? 'Checking approvals…' : `${total} waiting for you`}</Text>
        {total > 0 && (
          <PressableScale onPress={() => onOpen(null)} style={styles.reviewAll} accessibilityLabel="Review all">
            <Text variant="label" color={t.colors.accent}>
              Review all
            </Text>
            <Ionicons name="arrow-forward" size={14} color={t.colors.accent} />
          </PressableScale>
        )}
      </View>
      <Animated.ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={cardWidth + 12} decelerationRate="fast" contentContainerStyle={styles.row} {...nested}>
        {loading && total === 0
          ? [0, 1].map((i) => (
              <View key={i} style={[styles.card, { width: cardWidth }]}>
                <Bone style={{ width: 80, height: 18, borderRadius: 999 }} />
                <Bone style={{ width: '70%', height: 16, marginTop: 14 }} />
                <Bone style={{ width: '50%', height: 12, marginTop: 10 }} />
              </View>
            ))
          : cards.slice(0, 10).map((c) => (
              <PressableScale key={c.key} onPress={() => onOpen(c.key)} style={[styles.card, { width: cardWidth }]} scaleTo={0.98}>
                <View style={[styles.stripe, { backgroundColor: c.tint }]} />
                <View style={styles.cardTop}>
                  <View style={[styles.noun, { backgroundColor: `${c.tint}1A` }]}>
                    <Text variant="caption" weight="bold" color={c.tint}>
                      {c.noun}
                    </Text>
                  </View>
                  <StatusPill label={c.status.label} tone={c.status.tone} />
                </View>
                <Text variant="heading" numberOfLines={1}>
                  {c.code}
                </Text>
                <Text variant="label" color={t.colors.textMuted} numberOfLines={1}>
                  {c.party || '—'}
                </Text>
                <View style={styles.cardBottom}>
                  <Text variant="caption" color={t.colors.textFaint}>
                    {formatDate(c.date)}
                  </Text>
                  {typeof c.amount === 'number' && <Text variant="heading">{formatMoney(c.amount, c.currency || '₹')}</Text>}
                </View>
              </PressableScale>
            ))}
        {!!extra?.count && (
          <PressableScale onPress={extra.onPress} style={[styles.card, styles.extra, { width: cardWidth * 0.6 }]}>
            <Ionicons name="wallet-outline" size={22} color={t.tints.expenses} />
            <Text variant="heading">{extra.count}</Text>
            <Text variant="caption" color={t.colors.textMuted}>
              {extra.label}
            </Text>
          </PressableScale>
        )}
      </Animated.ScrollView>
    </Animated.View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewAll: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  row: { gap: 12, paddingRight: 18 },
  card: { backgroundColor: t.colors.surface, borderRadius: t.radius.lg, padding: 16, paddingLeft: 20, gap: 6, overflow: 'hidden', ...t.shadow.card },
  stripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  noun: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: t.radius.pill },
  cardBottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 6 },
  extra: { justifyContent: 'center', alignItems: 'flex-start', paddingLeft: 16 },
  clear: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: t.colors.surface, borderRadius: t.radius.lg, padding: 16, ...t.shadow.card },
  clearIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.successSoft, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: 2 },
}));
