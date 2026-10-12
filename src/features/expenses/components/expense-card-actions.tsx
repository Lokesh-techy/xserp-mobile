/** @author Lokesh */
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/core/api';
import { useSession } from '@/core/auth';
import { makeStyles } from '@/core/theme';
import { errorFeedback, successFeedback } from '@/core/utils';
import { CardActionRow } from '@/features/approvals/engine';
import { BottomSheet, Button, Input, toast } from '@/ui';

import { fetchExpense, saveExpense, type Expense } from '../api';
import { expenseKeys } from '../keys';
import { expenseStatus, nextSteps, type Step } from '../status';

const ICON = {
  confirm: 'checkmark-outline',
  approve: 'checkmark-done-outline',
  check: 'eye-outline',
  verify: 'shield-checkmark-outline',
} as const;

/**
 * The claim editor's workflow steps (Confirm, Approve, Check, Verify), on the list card. The full claim is
 * loaded before saving, so lines and fields the list doesn't carry are kept.
 */
export function ExpenseCardActions({ item }: { item: Expense }) {
  const styles = useStyles();
  const session = useSession();
  const qc = useQueryClient();
  const [step, setStep] = useState<Step | null>(null);
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);
  const steps = nextSteps(item, session);
  if (steps.length === 0) return null;

  const run = async (s: Step, note: string) => {
    setBusy(true);
    try {
      const full = await fetchExpense(item.id);
      if (!full.claimHeadId || full.particulars.length === 0) {
        toast.show({ message: 'Open the claim to finish it before moving it on.', tone: 'info' });
        return;
      }
      await saveExpense(note ? { ...full, remarks: note } : full, s.to);
      successFeedback();
      toast.show({
        message: `${item.code || `Draft #${item.id}`} · ${expenseStatus(s.to).label.toLowerCase()}`,
        tone: 'success',
      });
      await qc.invalidateQueries({ queryKey: expenseKeys.all });
    } catch (e) {
      errorFeedback();
      toast.show({ message: errorMessage(e), tone: 'danger', durationMs: 5000 });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <CardActionRow
        disabled={busy}
        actions={steps.map((s) => ({
          key: s.id,
          label: s.label,
          icon: ICON[s.id],
          tone: s.tone,
          onPress: () => {
            setRemarks('');
            setStep(s);
          },
          a11y: `${s.label} ${item.code || `draft ${item.id}`}`,
        }))}
      />
      <BottomSheet visible={!!step} onClose={() => setStep(null)} title={step?.label}>
        <View style={styles.sheet}>
          <Input
            label={step?.remarks === 'required' ? 'Remarks (required)' : 'Remarks (optional)'}
            icon="chatbox-ellipses-outline"
            value={remarks}
            onChangeText={setRemarks}
            multiline
          />
          <Button
            title={step?.label ?? ''}
            variant={step?.tone ?? 'primary'}
            onPress={() => {
              if (!step) return;
              if (step.remarks === 'required' && !remarks.trim()) {
                toast.show({ message: 'Please add a reason.', tone: 'danger' });
                return;
              }
              const s = step;
              setStep(null);
              void run(s, remarks.trim());
            }}
          />
        </View>
      </BottomSheet>
    </>
  );
}

const useStyles = makeStyles(() => ({
  sheet: { paddingHorizontal: 20, gap: 14 },
}));
