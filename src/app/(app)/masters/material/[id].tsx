/** @author Lokesh */
import { useLocalSearchParams } from 'expo-router';

import { MaterialScreen } from '@/features/masters';

export default function Screen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <MaterialScreen id={id} />;
}
