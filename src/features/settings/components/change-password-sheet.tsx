/** @author Lokesh */
import { useState } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/core/api';
import { changePassword, logout, useSession, useSessionStore } from '@/core/auth';
import { makeStyles } from '@/core/theme';
import { BottomSheet, Button, Input, Text } from '@/ui';

export function ChangePasswordSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const styles = useStyles();
  const session = useSession();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!current) return setError('Enter your current password.');
    if (next.length < 6) return setError('Use at least 6 characters for the new password.');
    if (next !== confirm) return setError('New passwords do not match.');
    setError(null);
    try {
      await changePassword({ email: session.user.email, oldPassword: current, newPassword: next });
      onClose();
      // xserp signs the user's devices out after a password change.
      await logout(session);
      await useSessionStore.getState().signOut('Password changed. Please sign in with your new password.');
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Change password">
      <View style={styles.body}>
        <Input label="Current password" icon="lock-closed-outline" secure value={current} onChangeText={setCurrent} />
        <Input label="New password" icon="key-outline" secure value={next} onChangeText={setNext} />
        <Input label="Confirm new password" icon="key-outline" secure value={confirm} onChangeText={setConfirm} />
        {!!error && <Text variant="label" style={styles.error}>{error}</Text>}
        <Button title="Update password" icon="checkmark-outline" onPress={submit} />
      </View>
    </BottomSheet>
  );
}

const useStyles = makeStyles((t) => ({ body: { paddingHorizontal: 20, gap: 14 }, error: { color: t.colors.danger } }));
