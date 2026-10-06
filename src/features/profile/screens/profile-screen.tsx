/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import * as Application from 'expo-application';
import * as Updates from 'expo-updates';
import * as WebBrowser from 'expo-web-browser';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { displayName, initials, logout, useSession, useSessionStore } from '@/core/auth';
import { ERP_WEB } from '@/core/api';
import { env, serverHost } from '@/core/config/env';
import { makeStyles, useTheme, type Theme } from '@/core/theme';
import { formatDate } from '@/core/utils';
import { GlassIconButton, goBack, PressableScale, Section, Text, type IconName } from '@/ui';

import { AppearanceControl } from '../components/appearance-control';
import { ChangePasswordSheet } from '../components/change-password-sheet';

function Row({
  icon,
  label,
  value,
  onPress,
  tone,
}: {
  icon: IconName;
  label: string;
  value?: string;
  onPress?: () => void;
  tone?: 'danger';
}) {
  const t = useTheme();
  const styles = useStyles();
  const fg = tone === 'danger' ? t.colors.danger : t.colors.onPrimarySoft;
  return (
    <PressableScale onPress={onPress} disabled={!onPress} style={styles.row} scaleTo={0.99}>
      <View
        style={[styles.rowIcon, { backgroundColor: tone === 'danger' ? t.colors.dangerSoft : t.colors.primarySoft }]}>
        <Ionicons name={icon} size={18} color={fg} />
      </View>
      <View style={styles.flex}>
        <Text variant="label" color={tone === 'danger' ? t.colors.danger : t.colors.text}>
          {label}
        </Text>
        {!!value && (
          <Text variant="caption" color={t.colors.textMuted}>
            {value}
          </Text>
        )}
      </View>
      {onPress && <Ionicons name="chevron-forward" size={16} color={t.colors.textFaint} />}
    </PressableScale>
  );
}

export function ProfileScreen() {
  const t = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const session = useSession();
  const [pwOpen, setPwOpen] = useState(false);
  const { user, subscription: sub } = session;

  const signOut = () =>
    Alert.alert('Sign out?', 'You will need to sign in again to use XSERP.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await logout(session);
          await useSessionStore.getState().signOut();
        },
      },
    ]);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <LinearGradient
          colors={t.gradients.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + 8 }]}>
          <View style={styles.top}>
            <GlassIconButton icon="chevron-down" onPress={goBack} accessibilityLabel="Close" />
          </View>
          <LinearGradient colors={['#5CC3FF', '#209BE1', '#004195']} style={styles.ring}>
            <View style={styles.avatar}>
              <Text variant="title" weight="extrabold" color={t.colors.primary}>
                {initials(user) || 'U'}
              </Text>
            </View>
          </LinearGradient>
          <Text variant="title" color={t.alpha.onGradient}>
            {displayName(user)}
          </Text>
          <Text variant="body" color={t.alpha.onGradientMuted}>
            {user.email}
          </Text>
        </LinearGradient>
        <View style={styles.body}>
          <Section title="Appearance">
            <AppearanceControl />
          </Section>
          <Section title="Account">
            <View style={styles.group}>
              {user.isSuper && <Row icon="star-outline" label="Administrator" value="Full access to every module" />}
              {(sub.plan || sub.expiredOn) && (
                <Row
                  icon="ribbon-outline"
                  label={sub.plan ? `${sub.plan} plan` : 'Subscription'}
                  value={
                    sub.expiredOn ? `${sub.isExpired ? 'Expired' : 'Renews'} ${formatDate(sub.expiredOn)}` : undefined
                  }
                />
              )}
              <Row icon="key-outline" label="Change password" onPress={() => setPwOpen(true)} />
            </View>
          </Section>
          <Section title="About">
            <View style={styles.group}>
              <Row icon="server-outline" label="Server" value={`${serverHost} · ${env.serverLabel}`} />
              <Row
                icon="information-circle-outline"
                label="Version"
                value={`${Application.nativeApplicationVersion ?? '3.0.0'} (${Application.nativeBuildVersion ?? '66'}) · ${Updates.updateId ? Updates.updateId.slice(0, 8) : 'embedded'}`}
              />
              <Row
                icon="document-text-outline"
                label="Terms of service"
                onPress={() => void WebBrowser.openBrowserAsync(`${env.serverUrl}${ERP_WEB.terms}`)}
              />
              <Row
                icon="lock-closed-outline"
                label="Privacy policy"
                onPress={() => void WebBrowser.openBrowserAsync(`${env.serverUrl}${ERP_WEB.privacy}`)}
              />
            </View>
          </Section>
          <Section title="Session">
            <View style={styles.group}>
              <Row icon="log-out-outline" label="Sign out" tone="danger" onPress={signOut} />
            </View>
          </Section>
        </View>
      </ScrollView>
      <ChangePasswordSheet visible={pwOpen} onClose={() => setPwOpen(false)} />
    </View>
  );
}

const useStyles = makeStyles((t: Theme) => ({
  root: { flex: 1, backgroundColor: t.colors.bg },
  scroll: { paddingBottom: 48 },
  hero: {
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingBottom: 30,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    gap: 4,
  },
  top: { alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'flex-end' },
  ring: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: t.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { paddingHorizontal: t.space.gutter },
  group: { backgroundColor: t.colors.surface, borderRadius: t.radius.lg, paddingHorizontal: 14, ...t.shadow.card },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.divider,
  },
  rowIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: 2 },
}));
