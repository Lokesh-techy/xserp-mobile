/** @author Lokesh */
import { router, type Href } from 'expo-router';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useSession } from '@/core/auth';
import { makeStyles, useTheme, type ModuleTint } from '@/core/theme';
import { Text, usePullToSync, type IconName } from '@/ui';

import { HomeHeader } from '../components/home-header';
import { ModuleTile } from '../components/module-tile';

export type HomeModule = { id: string; title: string; subtitle: string; icon: IconName; tint: ModuleTint; href: Href; access: 'open' | 'locked' | 'soon'; badge: number };

type Props = { modules: HomeModule[]; unread: number; onRefresh: () => Promise<unknown> };

export function HomeScreen({ modules, unread, onRefresh }: Props) {
  const t = useTheme();
  const styles = useStyles();
  useSession();
  const pull = usePullToSync(onRefresh);
  return (
    <View style={styles.root}>
      {pull.attach(
        <Animated.ScrollView {...pull.scrollProps} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <HomeHeader pull={pull.indicator} unread={unread} />
          <View style={styles.body}>
            <Text variant="overline" color={t.alpha.onGradientMuted} style={styles.label}>
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
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.bg },
  content: { paddingBottom: 40 },
  body: { paddingHorizontal: t.space.gutter, marginTop: -44 },
  label: { marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 },
}));
