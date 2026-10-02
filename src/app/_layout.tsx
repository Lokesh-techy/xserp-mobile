/** @author Lokesh */
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { clearDocumentCache } from '@/core/api';
import { bootstrapAuth, markActive, useIdleSignOut, useSessionStore } from '@/core/auth';
import { queryClient, setupQueryManagers } from '@/core/query';
import { applySavedAppearance, ThemeProvider, useTheme } from '@/core/theme';
import { VersionGate } from '@/features/auth';
import { LaunchAnimation, ToastHost } from '@/ui';

SplashScreen.preventAutoHideAsync().catch(() => {});
bootstrapAuth();
applySavedAppearance();

function RootNavigator({ fontsLoaded }: { fontsLoaded: boolean }) {
  const t = useTheme();
  const status = useSessionStore((s) => s.status);
  useIdleSignOut();
  if (status === 'loading' || !fontsLoaded) return null;
  const signedIn = status === 'signedIn';
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.colors.bg }, animation: 'fade' }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" />
        <Stack.Screen name="forgot-password" options={{ animation: 'slide_from_right' }} />
      </Stack.Protected>
      <Stack.Screen name="reset-password" options={{ animation: 'slide_from_bottom' }} />
    </Stack>
  );
}

function Launch({ fontsLoaded }: { fontsLoaded: boolean }) {
  const ready = useSessionStore((s) => s.status !== 'loading') && fontsLoaded;
  const [done, setDone] = useState(false);
  const finish = useCallback(() => setDone(true), []);
  return done ? null : <LaunchAnimation ready={ready} onDone={finish} />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    void useSessionStore.getState().hydrate();
    return setupQueryManagers();
  }, []);

  // Sign-out must drop every cached response so the next user never sees the previous one's data.
  useEffect(
    () =>
      useSessionStore.subscribe((s, prev) => {
        if (prev.status === 'signedIn' && s.status === 'signedOut') {
          queryClient.clear();
          clearDocumentCache();
        }
      }),
    [],
  );

  return (
    // Every touch counts as activity for the idle sign-out.
    <GestureHandlerRootView style={{ flex: 1 }} onTouchStart={markActive}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <VersionGate>
              <RootNavigator fontsLoaded={fontsLoaded} />
            </VersionGate>
            <ToastHost />
            <Launch fontsLoaded={fontsLoaded} />
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
