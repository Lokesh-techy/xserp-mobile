/** @author Lokesh */
import { useLocalSearchParams } from 'expo-router';

import { BucketLedgersScreen } from '@/features/finance';

export default function Bucket() {
  const { bucket } = useLocalSearchParams<{ bucket: string }>();
  return <BucketLedgersScreen param={bucket} />;
}
