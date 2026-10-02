/** @author Lokesh */
import { useQuery } from '@tanstack/react-query';
import * as Application from 'expo-application';
import { useState, type ReactNode } from 'react';
import { Linking, View } from 'react-native';

import { fetchVersionInfo } from '@/core/auth';
import { kv } from '@/core/storage/kv';
import { makeStyles, useTheme } from '@/core/theme';
import { BottomSheet, Button, Text } from '@/ui';

const STORE_URL = 'market://details?id=com.schnell.xsmanager';
const REMIND_KEY = 'xserp.updateRemindedOn';

// Server versions look like "2.16.5 qa"; compare numeric segments only.
const parts = (v: string) => v.split('.').map((p) => parseInt(p, 10) || 0);
const newer = (server: string, local: string) => {
  const a = parts(server);
  const b = parts(local);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d > 0;
  }
  return false;
};

/** Mirrors XSManager's splash check: forced update blocks; optional update nags at most once a day. */
export function VersionGate({ children }: { children: ReactNode }) {
  const t = useTheme();
  const styles = useStyles();
  const local = Application.nativeApplicationVersion ?? '3.0.0';
  const { data } = useQuery({ queryKey: ['version-info'], queryFn: fetchVersionInfo, staleTime: 6 * 60 * 60_000, retry: 0 });
  const today = new Date().toDateString();
  const [dismissed, setDismissed] = useState(kv.getString(REMIND_KEY) === today);
  const outdated = !!data && newer(data.version, local);
  const forced = outdated && data.forceUpdate;
  const remindLater = () => {
    kv.setString(REMIND_KEY, today);
    setDismissed(true);
  };

  return (
    <>
      {children}
      <BottomSheet visible={outdated && (forced || !dismissed)} onClose={forced ? () => undefined : remindLater} title={forced ? 'Update required' : 'Update available'}>
        <View style={styles.body}>
          <Text variant="body" color={t.colors.textMuted}>
            Version {data?.version} is available. {forced ? 'Please update to keep using XSERP.' : 'Update for the latest fixes and features.'}
          </Text>
          <Button title="Update now" icon="download-outline" onPress={() => void Linking.openURL(STORE_URL)} />
          {!forced && <Button title="Remind me later" variant="ghost" onPress={remindLater} />}
        </View>
      </BottomSheet>
    </>
  );
}

const useStyles = makeStyles(() => ({ body: { paddingHorizontal: 20, gap: 14 } }));
