/** @author Lokesh */
import { View } from 'react-native';

import { useSessionStore } from '@/core/auth';
import { Button, Text } from '@/ui';

// Replaced by the module grid in Task 11.
export default function Home() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <Text>Signed in</Text>
      <Button title="Sign out" variant="ghost" onPress={() => useSessionStore.getState().signOut()} />
    </View>
  );
}
