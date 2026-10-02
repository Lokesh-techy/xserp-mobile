/** @author Lokesh */
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { initials, useSession } from '@/core/auth';
import { makeStyles, useTheme } from '@/core/theme';
import { Glass, GlassIconButton, PressableScale, Text } from '@/ui';

const greeting = (h: number) => (h < 12 ? 'Good morning,' : h < 17 ? 'Good afternoon,' : 'Good evening,');

/** Despack home header: date, greeting, enterprise pill, bell and avatar over the brand gradient. */
export function HomeHeader({ pull, unread }: { pull: ReactNode; unread: number }) {
  const t = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const now = new Date();
  return (
    <LinearGradient colors={t.gradients.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.root, { paddingTop: insets.top + 14 }]}>
      <StatusBar style="light" />
      <View style={styles.orb} />
      {pull}
      <View style={styles.top}>
        <Text variant="overline" color={t.alpha.onGradientFaint}>
          {format(now, 'EEEE, d MMMM')}
        </Text>
        <View style={styles.actions}>
          <GlassIconButton icon="notifications-outline" size={44} badge={unread} onPress={() => router.push('/notifications')} accessibilityLabel="Notifications" />
          <PressableScale onPress={() => router.push('/profile')} style={styles.avatar} accessibilityLabel="Profile">
            <Text variant="heading" weight="extrabold" color={t.colors.primary}>
              {initials(user) || 'U'}
            </Text>
          </PressableScale>
        </View>
      </View>
      <Text variant="body" color={t.alpha.onGradientMuted} style={styles.greeting}>
        {greeting(now.getHours())}
      </Text>
      <Text variant="display" color={t.alpha.onGradient} numberOfLines={1}>
        {user.firstName || user.username || 'there'}
      </Text>
      {!!user.enterpriseName && (
        <Glass style={styles.pill} fallbackStyle={styles.pillFallback}>
          <Ionicons name="business-outline" size={14} color={t.alpha.onGradient} />
          <Text variant="label" color={t.alpha.onGradient} numberOfLines={1}>
            {user.enterpriseName}
          </Text>
        </Glass>
      )}
    </LinearGradient>
  );
}

const useStyles = makeStyles((t) => ({
  root: { paddingHorizontal: 22, paddingBottom: 70, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: 'hidden' },
  orb: { position: 'absolute', width: 260, height: 260, borderRadius: 130, top: -80, right: -90, backgroundColor: t.alpha.orb },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: t.colors.white, borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  greeting: { marginTop: 18 },
  pill: { marginTop: 12, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 32, borderRadius: t.radius.pill, maxWidth: '100%' },
  pillFallback: { backgroundColor: t.alpha.glassFill, borderWidth: 1, borderColor: t.alpha.glassBorder },
}));
