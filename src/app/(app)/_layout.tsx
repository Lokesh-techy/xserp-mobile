/** @author Lokesh */
import { Stack } from 'expo-router';

import { useTheme } from '@/core/theme';
import { SubscriptionSheet, useSessionRefresh } from '@/features/auth';
import { useMasterSync } from '@/features/master-data';

export default function AppLayout() {
  const t = useTheme();
  useSessionRefresh();
  useMasterSync();
  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.colors.bg }, animation: 'slide_from_right' }}>
        <Stack.Screen name="profile" options={{ animation: 'fade_from_bottom' }} />
      </Stack>
      <SubscriptionSheet />
    </>
  );
}
