/** @author Lokesh */
import { useLocalSearchParams } from 'expo-router';

import { LedgerScreen } from '@/features/finance';

export default function Ledger() {
  const { id, name, group } = useLocalSearchParams<{ id: string; name?: string; group?: string }>();
  return <LedgerScreen id={id} name={name ?? ''} group={group ?? ''} />;
}
