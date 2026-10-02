/** @author Lokesh */
import { router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { makeStyles, useTheme, type ModuleTint } from '@/core/theme';
import { Text, usePullToSync, type IconName } from '@/ui';

import { HomeActions, HomeHeader, MiniHomeHeader } from '../components/home-header';
import { ModuleTile } from '../components/module-tile';
import { useSyncStep } from '../use-sync-status';

export type HomeModule = { id: string; title: string; subtitle: string; icon: IconName; tint: ModuleTint; href: Href; access: 'open' | 'locked' | 'soon'; badge: number };

type Props = {
  modules: HomeModule[];
  /** Self-updating approvals section (it subscribes to its own data). */
  approvals: ReactNode;
  onRefresh: () => Promise<unknown>;
};

/**
 * Home layout only. Live values (sync status, unread count, approvals) are read by the small components
 * that show them, so a sync or a new notification never re-renders this screen.
 */
export function HomeScreen({ modules, approvals, onRefresh }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const pull = usePullToSync(onRefresh, true, useSyncStep);
  return (
    <View style={styles.root}>
      {pull.attach(
        <Animated.ScrollView {...pull.scrollProps} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <HomeHeader pull={pull.indicator} scrollY={pull.scrollY} />
          <View style={styles.body}>
            {approvals}
            <Text variant="overline" color={t.colors.textMuted} style={styles.label}>
              Modules
            </Text>
            <View style={styles.grid}>
              {modules.map((m, i) => (
                <ModuleTile key={m.id} index={i} title={m.title} subtitle={m.subtitle} icon={m.icon} tint={t.tints[m.tint]} access={m.access} badge={m.badge} onPress={() => router.push(m.href)} />
              ))}
            </View>
          </View>
        </Animated.ScrollView>,
      )}
      <MiniHomeHeader scrollY={pull.scrollY} />
      <HomeActions scrollY={pull.scrollY} pull={pull.pull} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.bg },
  content: { paddingBottom: 40 },
  body: { paddingHorizontal: t.space.gutter, marginTop: -40, gap: 4 },
  label: { marginTop: 24, marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
}));
