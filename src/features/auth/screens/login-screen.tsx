/** @author Lokesh */
import * as Application from 'expo-application';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { errorMessage } from '@/core/api';
import { login, useSessionStore } from '@/core/auth';
import { serverHost } from '@/core/config/env';
import { enter, makeStyles, useTheme } from '@/core/theme';
import { errorFeedback } from '@/core/utils';
import { AmbientBackground, Button, Input, Text, XMark } from '@/ui';

export function LoginScreen() {
  const t = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const notice = useSessionStore((s) => s.notice);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);
  const shake = useSharedValue(0);
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }] }));

  const fail = (message: string) => {
    setError(message);
    errorFeedback();
    shake.set(withSequence(...[-10, 10, -8, 8, -4, 0].map((x) => withTiming(x, { duration: 50 }))));
  };

  const submit = async () => {
    if (!email.trim() || !password) return fail('Enter your email and password.');
    setError(null);
    try {
      const session = await login(email, password);
      await useSessionStore.getState().signIn(session);
    } catch (e) {
      fail(errorMessage(e));
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <AmbientBackground />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
          <Animated.View entering={enter(0)} style={styles.brand}>
            <View style={styles.logoTile}>
              <XMark size={40} variant="onDark" />
            </View>
            <View>
              <Text variant="title" color={t.alpha.onGradient}>
                XSERP
              </Text>
              <Text variant="caption" color={t.alpha.onGradientFaint}>
                by Schnell Energy
              </Text>
            </View>
          </Animated.View>
          <Animated.View entering={enter(60)}>
            <Text variant="display" color={t.alpha.onGradient} style={styles.welcome}>
              Welcome back
            </Text>
            <Text variant="body" color={t.alpha.onGradientMuted}>
              Sign in to approve, track and run your business on the go.
            </Text>
          </Animated.View>
          <Animated.View entering={enter(120)} style={[styles.card, cardStyle]}>
            <Input label="Email" icon="mail-outline" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="username" returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} />
            <Input ref={passwordRef} label="Password" icon="lock-closed-outline" secure value={password} onChangeText={setPassword} autoComplete="password" textContentType="password" returnKeyType="go" onSubmitEditing={() => void submit()} />
            {!!notice && !error && (
              <View style={[styles.box, { backgroundColor: t.colors.accentSoft }]}>
                <Text variant="label" color={t.colors.infoText}>
                  {notice}
                </Text>
              </View>
            )}
            {!!error && (
              <View style={[styles.box, { backgroundColor: t.colors.dangerSoft }]}>
                <Text variant="label" color={t.colors.danger}>
                  {error}
                </Text>
              </View>
            )}
            <Button title="Sign in" icon="arrow-forward" onPress={submit} />
            <Pressable hitSlop={10} onPress={() => router.push('/forgot-password')} style={styles.forgot}>
              <Text variant="label" color={t.colors.accent}>
                Forgot password?
              </Text>
            </Pressable>
          </Animated.View>
          <View style={styles.footer}>
            <View style={[styles.dot, { backgroundColor: t.alpha.liveDot }]} />
            <Text variant="caption" color={t.alpha.onGradientFaint}>
              {serverHost} · v{Application.nativeApplicationVersion ?? '3.0.0'}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.navy900 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 22 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  logoTile: { width: 56, height: 56, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', backgroundColor: t.alpha.glassFill, alignItems: 'center', justifyContent: 'center' },
  welcome: { marginTop: 36, marginBottom: 6 },
  card: { marginTop: 28, backgroundColor: t.colors.surface, borderRadius: t.radius.xl, padding: 22, gap: 18, ...t.shadow.lifted },
  box: { borderRadius: t.radius.sm, padding: 12 },
  forgot: { alignSelf: 'center' },
  footer: { marginTop: 'auto', paddingTop: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
}));
