/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { differenceInCalendarDays } from 'date-fns';
import * as Application from 'expo-application';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ERP_WEB } from '@/core/api';
import { displayName, initials, logout, useSession, useSessionStore, type Session } from '@/core/auth';
import { env } from '@/core/config/env';
import { enter, makeStyles, useTheme, type Theme } from '@/core/theme';
import { parseServerDate, successFeedback, tapFeedback } from '@/core/utils';
import {
  CountUp,
  GlassIconButton,
  goBack,
  PressableScale,
  SatinBackground,
  Section,
  Text,
  toast,
  type IconName,
} from '@/ui';

import { AppearanceControl } from '../components/appearance-control';
import { ChangePasswordSheet } from '../components/change-password-sheet';

const AVATAR = 64;
const TOP = 14; // below the safe area, as on Home

/** Scroll distance over which the large header dissolves into the compact bar. */
const COLLAPSE = { start: 24, end: 120 } as const;
const collapse = (y: number) => {
  'worklet';
  return interpolate(y, [COLLAPSE.start, COLLAPSE.end], [0, 1], Extrapolation.CLAMP);
};

/** `trial` → `Trial`; nothing when the server sends no plan. */
const planName = (plan: string | null) => (plan ? plan[0]!.toUpperCase() + plan.slice(1) : '');

/** Modules the user can open, modules they can approve in, and days left on the plan (null if none). */
export function accessSummary(session: Pick<Session, 'permissions' | 'subscription'>, today = new Date()) {
  const perms = Object.values(session.permissions);
  const expiry = parseServerDate(session.subscription.expiredOn);
  return {
    modules: perms.filter((p) => p.view).length,
    approve: perms.filter((p) => p.approve).length,
    daysLeft: expiry ? Math.max(0, differenceInCalendarDays(expiry, today)) : null,
  };
}

function Row({
  icon,
  label,
  value,
  onPress,
  tone,
  last,
}: {
  icon: IconName;
  label: string;
  value?: string;
  onPress?: () => void;
  tone?: 'danger';
  last?: boolean;
}) {
  const t = useTheme();
  const styles = useStyles();
  const danger = tone === 'danger';
  return (
    <PressableScale
      onPress={onPress}
      disabled={!onPress}
      style={[styles.row, !last && styles.rowDivider]}
      scaleTo={0.98}>
      <View style={[styles.rowIcon, { backgroundColor: danger ? t.colors.dangerSoft : t.colors.primarySoft }]}>
        <Ionicons name={icon} size={18} color={danger ? t.colors.dangerText : t.colors.onPrimarySoft} />
      </View>
      <View style={styles.flex}>
        <Text variant="label" color={danger ? t.colors.dangerText : t.colors.text}>
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
  const session = useSession();
  const insets = useSafeAreaInsets();
  const [pwOpen, setPwOpen] = useState(false);
  const { user } = session;
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });

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

  const version = `${Application.nativeApplicationVersion ?? '3.0.0'} (${Application.nativeBuildVersion ?? '66'}) · ${
    Updates.updateId ? Updates.updateId.slice(0, 8) : 'embedded'
  }`;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <SatinBackground />
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        <Header scrollY={scrollY} />
        <View style={styles.body}>
          <Animated.View entering={enter(60)}>
            <AccessCard session={session} />
          </Animated.View>
          <Animated.View entering={enter(120)}>
            <Section title="Appearance">
              <AppearanceControl />
            </Section>
          </Animated.View>
          <Animated.View entering={enter(170)}>
            <Section title="Account">
              <View style={styles.group}>
                <Row icon="key-outline" label="Change password" onPress={() => setPwOpen(true)} />
                <Row icon="log-out-outline" label="Sign out" tone="danger" onPress={signOut} last />
              </View>
            </Section>
          </Animated.View>
          <Animated.View entering={enter(220)}>
            <Section title="About">
              <View style={styles.group}>
                <Row
                  icon="document-text-outline"
                  label="Terms of service"
                  onPress={() => void WebBrowser.openBrowserAsync(`${env.serverUrl}${ERP_WEB.terms}`)}
                />
                <Row
                  icon="lock-closed-outline"
                  label="Privacy policy"
                  onPress={() => void WebBrowser.openBrowserAsync(`${env.serverUrl}${ERP_WEB.privacy}`)}
                  last
                />
              </View>
            </Section>
          </Animated.View>
          <Animated.View entering={enter(270)}>
            <Text variant="caption" color={t.colors.textFaint} style={styles.version}>
              XSERP {version}
            </Text>
          </Animated.View>
        </View>
      </Animated.ScrollView>
      <MiniHeader scrollY={scrollY} title={displayName(user)} />
      <View style={[styles.back, { top: insets.top + TOP }]}>
        <GlassIconButton icon="chevron-back" onPress={goBack} accessibilityLabel="Back" />
      </View>
      <ChangePasswordSheet visible={pwOpen} onClose={() => setPwOpen(false)} />
    </View>
  );
}

/** Home's header language: navy gradient, a soft orb, the name in display type; dissolves with parallax on scroll. */
function Header({ scrollY }: { scrollY: SharedValue<number> }) {
  const t = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const dissolve = useAnimatedStyle(() => {
    const p = collapse(scrollY.get());
    return {
      opacity: interpolate(p, [0, 0.75], [1, 0], Extrapolation.CLAMP),
      transform: [{ translateY: scrollY.get() * 0.35 }, { scale: 1 - p * 0.08 }],
    };
  });
  const orb = useAnimatedStyle(() => ({ transform: [{ translateY: scrollY.get() * 0.5 }] }));
  const copyEmail = async () => {
    await Clipboard.setStringAsync(user.email);
    successFeedback();
    toast.show({ message: 'Email copied', tone: 'success' });
  };
  return (
    <LinearGradient
      colors={t.gradients.header}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, { paddingTop: insets.top + TOP }]}>
      <Animated.View style={[styles.orb, orb]} />
      <Animated.View style={[styles.orbSoft, orb]} />
      <Animated.View style={[styles.headerContent, dissolve]}>
        <View style={styles.headerTop}>
          <Avatar label={initials(user) || 'U'} />
        </View>
        <Text variant="overline" color={t.alpha.onGradientFaint} numberOfLines={1} style={styles.enterprise}>
          {user.enterpriseName || 'XSERP'}
        </Text>
        <Text variant="display" color={t.alpha.onGradient} numberOfLines={1}>
          {displayName(user)}
        </Text>
        <PressableScale
          onLongPress={() => void copyEmail()}
          delayLongPress={350}
          haptic={false}
          scaleTo={0.97}
          style={styles.email}
          accessibilityHint="Long-press to copy">
          <Ionicons name="mail-outline" size={13} color={t.alpha.onGradientMuted} />
          <Text variant="body" color={t.alpha.onGradientMuted} numberOfLines={1}>
            {user.email}
          </Text>
        </PressableScale>
      </Animated.View>
    </LinearGradient>
  );
}

/** The initials in a white disc inside a gradient ring; a tap gives the ring a playful spin. */
function Avatar({ label }: { label: string }) {
  const t = useTheme();
  const styles = useStyles();
  const spin = useSharedValue(0);
  const pop = useSharedValue(1);
  const ring = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.get()}deg` }] }));
  const disc = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));
  return (
    <PressableScale
      haptic={false}
      scaleTo={0.94}
      onPress={() => {
        tapFeedback();
        spin.set(withTiming(spin.get() + 360, { duration: 900 }));
        pop.set(withSequence(withTiming(0.9, { duration: 90 }), withSpring(1, { dampingRatio: 0.45, duration: 520 })));
      }}
      accessibilityLabel="Your avatar">
      <View style={styles.avatarWrap}>
        <Animated.View style={[StyleSheet.absoluteFill, ring]}>
          <LinearGradient colors={['#5CC3FF', '#209BE1', '#004195', '#5CC3FF']} style={styles.ring} />
        </Animated.View>
        <Animated.View style={[styles.avatar, disc]}>
          <Text variant="title" weight="extrabold" color={t.colors.primary}>
            {label}
          </Text>
        </Animated.View>
      </View>
    </PressableScale>
  );
}

/** Home's hero-card treatment for what this account can do: modules, approval rights, plan days. */
function AccessCard({ session }: { session: Session }) {
  const t = useTheme();
  const styles = useStyles();
  const a = accessSummary(session);
  const tiles: { key: string; label: string; value: number | null; icon: IconName; tint: string; suffix?: string }[] = [
    { key: 'modules', label: 'Modules', value: a.modules, icon: 'apps-outline', tint: t.colors.accent },
    { key: 'approve', label: 'Can approve', value: a.approve, icon: 'checkmark-done-outline', tint: t.colors.success },
    {
      key: 'days',
      label: [session.subscription.isExpired ? 'Plan expired' : 'Days left', planName(session.subscription.plan)]
        .filter(Boolean)
        .join(' · '),
      value: a.daysLeft,
      icon: 'hourglass-outline',
      tint: session.subscription.isExpired || (a.daysLeft ?? 99) < 15 ? t.colors.warning : t.colors.violet,
    },
  ];
  return (
    <View style={styles.card}>
      <View pointerEvents="none" style={styles.cardBackdrop}>
        <LinearGradient
          colors={
            t.dark ? ['rgba(32,155,225,0.16)', 'rgba(32,155,225,0)'] : ['rgba(32,155,225,0.14)', 'rgba(32,155,225,0)']
          }
          start={{ x: 1, y: 0 }}
          end={{ x: 0.2, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
      <Text variant="overline" color={t.colors.textMuted}>
        {session.user.isSuper ? 'Your access · Administrator' : 'Your access'}
      </Text>
      <View style={styles.tiles}>
        {tiles.map((x) => (
          <View key={x.key} style={styles.tile}>
            <View style={[styles.tileIcon, { backgroundColor: `${x.tint}1F` }]}>
              <Ionicons name={x.icon} size={16} color={x.tint} />
            </View>
            {x.value === null ? (
              <Text variant="title" weight="extrabold" style={styles.tileValue}>
                —
              </Text>
            ) : (
              <CountUp value={x.value} variant="title" style={styles.tileValue} />
            )}
            <Text variant="caption" color={t.colors.textMuted} numberOfLines={1}>
              {x.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** The compact bar that takes over once the large header has scrolled away. */
function MiniHeader({ scrollY, title }: { scrollY: SharedValue<number>; title: string }) {
  const t = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const bar = useAnimatedStyle(() => ({
    opacity: interpolate(collapse(scrollY.get()), [0.35, 1], [0, 1], Extrapolation.CLAMP),
  }));
  const text = useAnimatedStyle(() => {
    const p = interpolate(collapse(scrollY.get()), [0.5, 1], [0, 1], Extrapolation.CLAMP);
    return { opacity: p, transform: [{ translateY: (1 - p) * 8 }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.mini, bar]}>
      <LinearGradient
        colors={t.gradients.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.miniInner, { paddingTop: insets.top + 10 }]}>
        <Animated.View style={[styles.miniText, text]}>
          <Text variant="heading" color={t.alpha.onGradient} numberOfLines={1}>
            {title}
          </Text>
          <Text variant="caption" color={t.alpha.onGradientFaint} numberOfLines={1}>
            Profile
          </Text>
        </Animated.View>
      </LinearGradient>
    </Animated.View>
  );
}

const useStyles = makeStyles((t: Theme) => ({
  root: { flex: 1, backgroundColor: t.colors.bg },
  scroll: { paddingBottom: 48 },
  header: {
    paddingHorizontal: 22,
    paddingBottom: 64,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    top: -80,
    right: -90,
    backgroundColor: t.alpha.orb,
  },
  orbSoft: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    bottom: -70,
    left: -60,
    backgroundColor: t.alpha.orbSoft,
  },
  headerContent: { transformOrigin: 'left top' },
  headerTop: { minHeight: 44, alignItems: 'flex-end' },
  enterprise: { marginTop: 14 },
  email: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, alignSelf: 'flex-start' },
  avatarWrap: { width: AVATAR, height: AVATAR, alignItems: 'center', justifyContent: 'center' },
  ring: { flex: 1, borderRadius: AVATAR / 2 },
  avatar: {
    width: AVATAR - 6,
    height: AVATAR - 6,
    borderRadius: (AVATAR - 6) / 2,
    backgroundColor: t.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  back: { position: 'absolute', left: 22, zIndex: 20 },
  body: { paddingHorizontal: t.space.gutter, marginTop: -40 },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.dark ? 'rgba(91,155,255,0.28)' : 'rgba(0,65,149,0.10)',
    shadowColor: t.dark ? '#209BE1' : '#004195',
    shadowOpacity: t.dark ? 0.22 : 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  cardBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: t.radius.lg,
    overflow: 'hidden',
  },
  tiles: { flexDirection: 'row', gap: 8, marginTop: 12 },
  tile: { flex: 1, padding: 12, borderRadius: t.radius.md, backgroundColor: t.colors.fill, gap: 2 },
  tileIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  tileValue: { fontSize: 24, lineHeight: 30, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  group: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.edgeLight,
    ...t.shadow.card,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.colors.divider },
  rowIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: 2 },
  version: { textAlign: 'center', marginTop: 28, fontVariant: ['tabular-nums'] },
  mini: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  miniInner: {
    paddingLeft: 22 + 42 + 12,
    paddingRight: 22,
    paddingBottom: 14,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...t.shadow.lifted,
  },
  miniText: { minHeight: 40, justifyContent: 'center' },
}));
