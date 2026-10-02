/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useSessionStore } from '@/core/auth';
import { env } from '@/core/config/env';
import { can } from '@/core/permissions';
import { makeStyles, useTheme } from '@/core/theme';
import { ModuleScreen, PressableScale, SearchField, Section, StateView, Text, useHostRefresh, type ScrollHost } from '@/ui';

import { visibleReports, type Report } from '../catalog';

export function ReportsScreen() {
  return <ModuleScreen title="Reports">{(host) => <Body host={host} />}</ModuleScreen>;
}

function Body({ host }: { host: ScrollHost }) {
  const styles = useStyles();
  const session = useSessionStore((s) => s.session);
  const [query, setQuery] = useState('');
  useHostRefresh(host, useCallback(() => Promise.resolve(), []));
  const sections = useMemo(() => visibleReports((code) => can(session, code, 'view'), query), [session, query]);
  const open = (r: Report) => (r.kind === 'app' ? router.push(r.href) : void WebBrowser.openBrowserAsync(`${env.serverUrl}${r.path}`));
  return host.attach(
    <Animated.ScrollView {...host.scrollProps} contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
      <SearchField value={query} onChangeText={setQuery} placeholder="Search reports" />
      {sections.length === 0 && (
        <View style={styles.empty}>
          <StateView icon="document-text-outline" title="No reports found" message={query ? 'Try a different word.' : "You don't have access to any report yet."} />
        </View>
      )}
      {sections.map((s) => (
        <Section key={s.title} title={s.title}>
          <View style={styles.group}>
            {s.items.map((r, i) => (
              <ReportRow key={r.id} report={r} last={i === s.items.length - 1} onPress={() => open(r)} />
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
  const web = report.kind === 'web';
  return (
    <PressableScale onPress={onPress} style={[styles.row, !last && styles.divider]} scaleTo={0.99} accessibilityLabel={`${report.title}${web ? ', opens XSERP web' : ''}`}>
      <View style={[styles.icon, { backgroundColor: web ? t.colors.fill : t.colors.primarySoft }]}>
        <Ionicons name={report.icon} size={18} color={web ? t.colors.textMuted : t.colors.onPrimarySoft} />
      </View>
      <View style={styles.flex}>
        <Text variant="label">{report.title}</Text>
        <Text variant="caption" color={t.colors.textMuted} numberOfLines={1}>
          {report.description}
        </Text>
      </View>
      {web ? (
        <View style={styles.webTag}>
          <Text variant="caption" weight="bold" color={t.colors.textMuted}>
            WEB
          </Text>
          <Ionicons name="open-outline" size={12} color={t.colors.textMuted} />
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={16} color={t.colors.textFaint} />
      )}
    </PressableScale>
  );
}

const useStyles = makeStyles((t) => ({
  pad: { padding: t.space.gutter, paddingBottom: 48 },
  empty: { marginTop: 18 },
  group: { backgroundColor: t.colors.surface, borderRadius: t.radius.lg, paddingHorizontal: 14, ...t.shadow.card },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  divider: { borderBottomWidth: 1, borderBottomColor: t.colors.divider },
  icon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: 2 },
  webTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, height: 22, borderRadius: t.radius.pill, backgroundColor: t.colors.fill },
}));
