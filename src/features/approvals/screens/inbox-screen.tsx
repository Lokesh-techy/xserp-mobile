/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { enter, makeStyles, useTheme, type ModuleTint } from '@/core/theme';
import { Badge, Card, ModuleScreen, StateView, Text, useHostRefresh, type IconName, type ScrollHost } from '@/ui';

export type InboxEntry = { key: string; title: string; icon: IconName; tint: ModuleTint; count: number; loading: boolean; href: Href };

type Props = { entries: InboxEntry[]; onRefresh: () => Promise<unknown> };

export function InboxScreen({ entries, onRefresh }: Props) {
  return (
    <ModuleScreen title="Approvals" subtitle="Everything awaiting you">
      {(host) => <InboxBody host={host} entries={entries} onRefresh={onRefresh} />}
    </ModuleScreen>
  );
}

function InboxBody({ host, entries, onRefresh }: Props & { host: ScrollHost }) {
  const t = useTheme();
  const styles = useStyles();
  const refresh = useCallback(() => onRefresh(), [onRefresh]);
  useHostRefresh(host, refresh);
  return host.attach(
    <Animated.ScrollView {...host.scrollProps} contentContainerStyle={styles.pad}>
      {entries.length === 0 ? (
        <StateView icon="lock-closed-outline" title="Nothing to approve" message="You don't have approval rights on any module." />
      ) : (
        entries.map((e, i) => {
          const tint = t.tints[e.tint];
          return (
            <Animated.View key={e.key} entering={enter(40 + i * 40)}>
              <Card onPress={() => router.push(e.href)} style={styles.card}>
                <View style={[styles.icon, { backgroundColor: `${tint}18` }]}>
                  <Ionicons name={e.icon} size={22} color={tint} />
                </View>
                <View style={styles.flex}>
                  <Text variant="heading">{e.title}</Text>
                  <Text variant="caption" color={e.count ? t.colors.warningText : t.colors.textMuted}>
                    {e.loading ? 'Checking…' : e.count ? `${e.count} waiting` : 'All caught up'}
                  </Text>
                </View>
                <Badge count={e.count} />
                <Ionicons name="chevron-forward" size={18} color={t.colors.textFaint} />
              </Card>
            </Animated.View>
          );
        })
      )}
    </Animated.ScrollView>,
  );
}

const useStyles = makeStyles((t) => ({
  pad: { padding: t.space.gutter, paddingBottom: 48 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  icon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: 2 },
}));
