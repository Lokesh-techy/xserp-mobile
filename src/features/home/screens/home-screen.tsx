/** @author Lokesh */
import { router, type Href } from 'expo-router';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { makeStyles, useTheme, type ModuleTint } from '@/core/theme';
import { Text, usePullToSync, type IconName } from '@/ui';

import { ApprovalsCard, type ApprovalGroup } from '../components/approvals-card';
import { HomeActions, HomeHeader, MiniHomeHeader } from '../components/home-header';
import { ModuleTile } from '../components/module-tile';

export type HomeModule = { id: string; title: string; subtitle: string; icon: IconName; tint: ModuleTint; href: Href; access: 'open' | 'locked' | 'soon'; badge: number };

type Props = {
  modules: HomeModule[];
  unread: number;
  approvals: { show: boolean; groups: ApprovalGroup[]; loading: boolean; onReview: (key: string | null) => void };
  sync: { text: string; syncing: boolean };
  onRefresh: () => Promise<unknown>;
};

export function HomeScreen({ modules, unread, approvals, sync, onRefresh }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const pull = usePullToSync(onRefresh);
  return (
    <View style={styles.root}>
      {pull.attach(
        <Animated.ScrollView {...pull.scrollProps} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <HomeHeader pull={pull.indicator} scrollY={pull.scrollY} syncText={sync.text} syncing={sync.syncing} />
          <View style={styles.body}>
            {approvals.show && <ApprovalsCard groups={approvals.groups} loading={approvals.loading} onReview={approvals.onReview} />}
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
      <MiniHomeHeader scrollY={pull.scrollY} syncText={sync.text} />
      <HomeActions unread={unread} scrollY={pull.scrollY} pull={pull.pull} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.bg },
  content: { paddingBottom: 40 },
  body: { paddingHorizontal: t.space.gutter, marginTop: -40, gap: 4 },
  label: { marginTop: 22, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 },
}));
