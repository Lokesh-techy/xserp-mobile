/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useSessionStore } from '@/core/auth';
import { can } from '@/core/permissions';
import { makeStyles, useTheme } from '@/core/theme';
import {
  ModuleScreen,
  PressableScale,
  Section,
  StateView,
  Text,
  useHostRefresh,
  type ScrollHost,
  useScreenSearch,
} from '@/ui';

import { visibleReports, type Report } from '../catalog';

export function ReportsScreen() {
  return <ModuleScreen title="Reports">{(host) => <Body host={host} />}</ModuleScreen>;
}

function Body({ host }: { host: ScrollHost }) {
  const styles = useStyles();
  const session = useSessionStore((s) => s.session);
  const query = useScreenSearch('Search reports');
  useHostRefresh(
    host,
    useCallback(() => Promise.resolve(), []),
  );
  const sections = useMemo(() => visibleReports((code) => can(session, code, 'view'), query), [session, query]);
  return host.attach(
    <Animated.ScrollView {...host.scrollProps} contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
      {sections.length === 0 && (
        <View style={styles.empty}>
          <StateView
            icon="document-text-outline"
            title="No reports found"
            message={query ? 'Try a different word.' : "You don't have access to any report yet."}
          />
        </View>
      )}
      {sections.map((s) => (
        <Section key={s.title} title={s.title}>
          <View style={styles.group}>
            {s.items.map((r, i) => (
              <ReportRow key={r.id} report={r} last={i === s.items.length - 1} onPress={() => router.push(r.href)} />
            ))}
          </View>
        </Section>
      ))}
    </Animated.ScrollView>,
  );
}

function ReportRow({ report, last, onPress }: { report: Report; last: boolean; onPress: () => void }) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <PressableScale
      onPress={onPress}
      style={[styles.row, !last && styles.divider]}
      scaleTo={0.99}
      accessibilityLabel={report.title}>
      <View style={styles.icon}>
        <Ionicons name={report.icon} size={18} color={t.colors.onPrimarySoft} />
      </View>
      <View style={styles.flex}>
        <Text variant="label">{report.title}</Text>
        <Text variant="caption" color={t.colors.textMuted} numberOfLines={1}>
          {report.description}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={t.colors.textFaint} />
    </PressableScale>
  );
}

const useStyles = makeStyles((t) => ({
  pad: { padding: t.space.gutter, paddingBottom: 48 },
  empty: { marginTop: 18 },
  group: { backgroundColor: t.colors.surface, borderRadius: t.radius.lg, paddingHorizontal: 14, ...t.shadow.card },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  divider: { borderBottomWidth: 1, borderBottomColor: t.colors.divider },
  icon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.primarySoft },
  flex: { flex: 1, gap: 2 },
}));
