/** @author Lokesh */
import { useLocalSearchParams } from 'expo-router';

import { ExpenseEditorScreen } from '@/features/expenses';

export default function Expense() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ExpenseEditorScreen id={id} />;
}
