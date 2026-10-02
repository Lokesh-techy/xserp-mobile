/** @author Lokesh */
import { Stack } from 'expo-router';

import { useTheme } from '@/core/theme';
import { SubscriptionSheet, useSessionRefresh } from '@/features/auth';
import { useMasterSync } from '@/features/master-data';

// Home is always the root of the signed-in stack. Without this, expo-router uses the first
// declared screen (profile) as the initial route, so Android landed on Profile with no way back.
export const unstable_settings = { initialRouteName: 'index' };

export default function AppLayout() {
  const t = useTheme();
  useSessionRefresh();
  useMasterSync();
  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.colors.bg }, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="profile" options={{ animation: 'fade_from_bottom' }} />
        <Stack.Screen name="document" options={{ animation: 'slide_from_bottom' }} />
      </Stack>
      <SubscriptionSheet />
    </>
  );
}
