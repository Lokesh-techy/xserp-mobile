/** @author Lokesh */
import * as Application from 'expo-application';
import * as Updates from 'expo-updates';
import * as WebBrowser from 'expo-web-browser';
import { ScrollView, View } from 'react-native';

import { env, serverHost } from '@/core/config/env';
import { makeStyles } from '@/core/theme';
import { Card, KeyValue, ScreenHeader, Section, Text } from '@/ui';

import { AppearanceControl } from '../components/appearance-control';
import { SyncStatus } from '../components/sync-status';

export function SettingsScreen() {
  const styles = useStyles();
  const open = (path: string) => void WebBrowser.openBrowserAsync(`${env.serverUrl}/erp/public/${path}/`);
  return (
    <View style={styles.root}>
      <ScreenHeader title="Settings" />
      <ScrollView contentContainerStyle={styles.body}>
        <Section title="Appearance">
          <AppearanceControl />
          <Text variant="caption" style={styles.hint}>
            {"System follows your phone's light or dark mode."}
          </Text>
        </Section>
        <Section title="Offline data">
          <SyncStatus />
        </Section>
        <Section title="About">
          <Card>
            <KeyValue label="Server" value={serverHost} />
            <KeyValue label="Environment" value={env.appEnv.toUpperCase()} />
            <KeyValue label="Version" value={`${Application.nativeApplicationVersion ?? '3.0.0'} (${Application.nativeBuildVersion ?? '66'})`} />
            <KeyValue label="Update" value={Updates.updateId ? Updates.updateId.slice(0, 8) : 'embedded'} />
          </Card>
        </Section>
        <Section title="Legal">
          <Card>
            <Text variant="label" onPress={() => open('terms')} style={styles.link}>
              Terms of service
            </Text>
            <Text variant="label" onPress={() => open('privacy')} style={styles.link}>
              Privacy policy
            </Text>
          </Card>
        </Section>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.bg },
  body: { padding: t.space.gutter, paddingBottom: 48 },
  hint: { color: t.colors.textMuted },
  link: { paddingVertical: 10, color: t.colors.accent },
}));
