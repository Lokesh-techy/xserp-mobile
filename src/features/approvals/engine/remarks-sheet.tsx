/** @author Lokesh */
import { useEffect, useRef, useState } from 'react';
import { View, type TextInput } from 'react-native';

import { makeStyles, useTheme } from '@/core/theme';
import { BottomSheet, Button, Input } from '@/ui';

import { actionTone } from './card-tone';
import { CountdownButton } from './countdown-button';
import type { ApprovalAction } from './types';

type Props<T> = {
  action: ApprovalAction<T> | null;
  onClose: () => void;
  /** Return `false` if the action could not be scheduled (the sheet then stays as it is). */
  onConfirm: (remarks: string) => boolean | void;
  /**
   * With a countdown, confirming turns the button into a timer the user can cancel from (`onCancel`);
   * the sheet closes when it runs out. Closing the sheet early cancels too.
   */
  countdownMs?: number;
  onCancel?: () => void;
};

export function RemarksSheet<T>(props: Props<T>) {
  if (!props.action) return null;
  // Keyed by action so every opening starts with empty remarks.
  return <RemarksBody key={props.action.id} {...props} action={props.action} />;
}

function RemarksBody<T>({
  action,
  onClose,
  onConfirm,
  countdownMs,
  onCancel,
}: Props<T> & { action: ApprovalAction<T> }) {
  const t = useTheme();
  const styles = useStyles();
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [counting, setCounting] = useState(false);
  const input = useRef<TextInput>(null);
  // Focus once the sheet has slid up, so the sheet (not just the keyboard) is what the user sees first.
  useEffect(() => {
    if (action.remarks === 'none') return;
    const timer = setTimeout(() => input.current?.focus(), 380);
    return () => clearTimeout(timer);
  }, [action.remarks]);
  // The action goes out when the countdown ends; the sheet's job is done.
  useEffect(() => {
    if (!counting || !countdownMs) return;
    const timer = setTimeout(onClose, countdownMs);
    return () => clearTimeout(timer);
  }, [counting, countdownMs, onClose]);

  const cancel = () => {
    onCancel?.();
    setCounting(false);
  };

  return (
    <BottomSheet
      visible
      onClose={() => {
        if (counting) onCancel?.();
        onClose();
      }}
      title={action.label}>
      <View style={styles.body}>
        {action.remarks !== 'none' && (
          <Input
            label={action.remarks === 'required' ? 'Remarks (required)' : 'Remarks (optional)'}
            icon="chatbox-ellipses-outline"
            value={remarks}
            onChangeText={setRemarks}
            multiline
            error={error}
            editable={!counting}
            ref={input}
          />
        )}
        {counting && countdownMs ? (
          <CountdownButton
            label={action.label}
            ms={countdownMs}
            size="block"
            tone={actionTone(t, action.tone)}
            onCancel={cancel}
            a11y={action.label}
          />
        ) : (
          <Button
            title={action.label}
            icon={action.icon}
            variant={action.tone}
            onPress={() => {
              if (action.remarks === 'required' && !remarks.trim()) return setError('Please add a reason.');
              const scheduled = onConfirm(remarks);
              if (scheduled === false) return;
              input.current?.blur();
              if (countdownMs) setCounting(true);
              else onClose();
            }}
          />
        )}
      </View>
    </BottomSheet>
  );
}

const useStyles = makeStyles(() => ({ body: { paddingHorizontal: 20, gap: 16 } }));
