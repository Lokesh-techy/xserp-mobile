/** @author Lokesh */
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { enter, makeStyles, useTheme } from '@/core/theme';
import { AmbientBackground, GlassIconButton, Text } from '@/ui';

type Props = { title: string; subtitle: string; back?: boolean; children: ReactNode };

/** Shared chrome for the signed-out screens: brand gradient, title block and the white card. */
export function AuthFrame({ title, subtitle, back = true, children }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <AmbientBackground />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
          {back && <GlassIconButton icon="chevron-back" onPress={() => router.back()} accessibilityLabel="Back" />}
          <Animated.View entering={enter(0)} style={styles.head}>
            <Text variant="display" color={t.alpha.onGradient}>
              {title}
            </Text>
            <Text variant="body" color={t.alpha.onGradientMuted}>
              {subtitle}
            </Text>
          </Animated.View>
          <Animated.View entering={enter(80)} style={styles.card}>
            {children}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

export function NoticeBox({ tone, message }: { tone: 'info' | 'danger' | 'success'; message: string }) {
  const t = useTheme();
  const styles = useStyles();
  const c = tone === 'danger' ? { bg: t.colors.dangerSoft, fg: t.colors.danger } : tone === 'success' ? { bg: t.colors.successSoft, fg: t.colors.success } : { bg: t.colors.accentSoft, fg: t.colors.infoText };
  return (
    <View style={[styles.box, { backgroundColor: c.bg }]}>
      <Text variant="label" color={c.fg}>
        {message}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.navy900 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 22 },
  head: { marginTop: 36, gap: 6 },
  card: { marginTop: 28, backgroundColor: t.colors.surface, borderRadius: t.radius.xl, padding: 22, gap: 18, ...t.shadow.lifted },
  box: { borderRadius: t.radius.sm, padding: 12 },
}));
