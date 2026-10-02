/** @author Lokesh */
import { useLocalSearchParams } from 'expo-router';

import { SoonScreen } from '@/features/home';
import { MODULES } from '@/modules/registry';

export default function Soon() {
  const { module } = useLocalSearchParams<{ module: string }>();
  const def = MODULES.find((m) => m.id === module);
  return <SoonScreen title={def?.title ?? 'This module'} icon={def?.icon ?? 'time-outline'} />;
}
