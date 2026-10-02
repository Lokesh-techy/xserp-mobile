/** @author Lokesh */
import { useState } from 'react';
import { View } from 'react-native';

import { makeStyles } from '@/core/theme';
import { BottomSheet, Button, Input } from '@/ui';

import type { ApprovalAction } from './types';

type Props<T> = { action: ApprovalAction<T> | null; onClose: () => void; onConfirm: (remarks: string) => void };

export function RemarksSheet<T>({ action, onClose, onConfirm }: Props<T>) {
  if (!action) return null;
  // Keyed by action so every opening starts with empty remarks.
  return <RemarksBody key={action.id} action={action} onClose={onClose} onConfirm={onConfirm} />;
}

function RemarksBody<T>({ action, onClose, onConfirm }: Props<T> & { action: ApprovalAction<T> }) {
  const styles = useStyles();
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <BottomSheet visible onClose={onClose} title={action.label}>
      <View style={styles.body}>
        {action.remarks !== 'none' && (
          <Input label={action.remarks === 'required' ? 'Remarks (required)' : 'Remarks (optional)'} icon="chatbox-ellipses-outline" value={remarks} onChangeText={setRemarks} multiline error={error} autoFocus />
        )}
        <Button
          title={action.label}
          icon={action.icon}
          variant={action.tone}
          onPress={() => {
            if (action.remarks === 'required' && !remarks.trim()) return setError('Please add a reason.');
            onConfirm(remarks);
            onClose();
          }}
        />
      </View>
    </BottomSheet>
  );
}

const useStyles = makeStyles(() => ({ body: { paddingHorizontal: 20, gap: 16 } }));
