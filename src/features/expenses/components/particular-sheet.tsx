/** @author Lokesh */
import { useState } from 'react';
import { ScrollView } from 'react-native';

import { makeStyles } from '@/core/theme';
import { parseServerDate, toApiDate } from '@/core/utils';
import {
  BottomSheet,
  Button,
  DateField,
  Input,
  PickerSheet,
  PressableScale,
  Text,
  type PickerItem,
  SwitchRow,
} from '@/ui';

import type { Particular } from '../api';

type Props = {
  initial: Particular | null;
  heads: PickerItem[];
  canEditAmount: boolean;
  canApproverDebit: boolean;
  canAuditDebit: boolean;
  onClose: () => void;
  onSave: (p: Particular) => void;
};

const num = (s: string) => Number(s.replace(/,/g, '')) || 0;
const blank: Particular = {
  raw: {},
  itemNo: 0,
  headId: '',
  spentOn: null,
  description: '',
  amount: 0,
  approverDebit: 0,
  auditDebit: 0,
  billAvailable: false,
  remarks: '',
};

/** Add or edit one expense line. Debit fields open only to the approver / auditor at their step. */
export function ParticularSheet({
  initial,
  heads,
  canEditAmount,
  canApproverDebit,
  canAuditDebit,
  onClose,
  onSave,
}: Props) {
  const styles = useStyles();
  const [p, setP] = useState<Particular>(initial ?? blank);
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [approverDebit, setApproverDebit] = useState(initial ? String(initial.approverDebit || '') : '');
  const [auditDebit, setAuditDebit] = useState(initial ? String(initial.auditDebit || '') : '');
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const head = heads.find((h) => h.id === p.headId);

  const save = () => {
    if (!p.headId) return setError('Choose an expense head.');
    if (num(amount) <= 0) return setError('Enter the amount spent.');
    onSave({ ...p, amount: num(amount), approverDebit: num(approverDebit), auditDebit: num(auditDebit) });
    onClose();
  };

  return (
    <BottomSheet visible onClose={onClose} title={initial ? 'Edit line' : 'Add line'}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <PressableScale
          onPress={() => {
            if (canEditAmount) setPicking(true);
          }}
          style={styles.picker}>
          <Text variant="label">{head?.label ?? 'Choose expense head'}</Text>
        </PressableScale>
        <DateField
          label="Spent on"
          value={parseServerDate(p.spentOn) ?? new Date()}
          maximumDate={new Date()}
          onChange={(d) => setP({ ...p, spentOn: toApiDate(d) })}
        />
        <Input
          label="Description"
          icon="create-outline"
          value={p.description}
          editable={canEditAmount}
          onChangeText={(description) => setP({ ...p, description })}
        />
        <Input
          label="Amount"
          icon="cash-outline"
          keyboardType="decimal-pad"
          value={amount}
          editable={canEditAmount}
          onChangeText={setAmount}
        />
        <SwitchRow
          label="Bill available"
          detail="A bill or receipt backs this amount"
          value={p.billAvailable}
          disabled={!canEditAmount}
          onChange={(billAvailable) => setP({ ...p, billAvailable })}
        />
        {canApproverDebit && (
          <Input
            label="Approver debit"
            icon="remove-circle-outline"
            keyboardType="decimal-pad"
            value={approverDebit}
            onChangeText={setApproverDebit}
          />
        )}
        {canAuditDebit && (
          <Input
            label="Audit debit"
            icon="remove-circle-outline"
            keyboardType="decimal-pad"
            value={auditDebit}
            onChangeText={setAuditDebit}
          />
        )}
        <Input
          label="Remarks"
          icon="chatbox-ellipses-outline"
          value={p.remarks}
          onChangeText={(remarks) => setP({ ...p, remarks })}
        />
        {!!error && (
          <Text variant="label" style={styles.error}>
            {error}
          </Text>
        )}
        <Button title={initial ? 'Update line' : 'Add line'} icon="checkmark-outline" onPress={save} />
      </ScrollView>
      <PickerSheet
        visible={picking}
        title="Expense head"
        items={heads}
        selectedId={p.headId}
        allowClear={false}
        onSelect={(i) => i && setP({ ...p, headId: i.id })}
        onClose={() => setPicking(false)}
      />
    </BottomSheet>
  );
}

const useStyles = makeStyles((t) => ({
  body: { paddingHorizontal: 20, paddingBottom: 16, gap: 14 },
  picker: {
    minHeight: 54,
    borderRadius: t.radius.md,
    borderWidth: 1.5,
    borderColor: t.colors.border,
    backgroundColor: t.colors.fillSubtle,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  error: { color: t.colors.danger },
}));
