/** @author Lokesh */
import { useLocalSearchParams } from 'expo-router';

import { PartyScreen } from '@/features/masters';

export default function Screen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PartyScreen id={id} />;
}
