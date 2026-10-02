/** @author Lokesh */
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { errorMessage } from '@/core/api';
import { changePassword } from '@/core/auth';
import { Button, Input, StateView, toast } from '@/ui';

import { AuthFrame, NoticeBox } from '../components/auth-frame';

/** Opened from xserp's emailed reset link (https://<host>/erp/?u=<cp_token>). */
export function ResetPasswordScreen() {
  const { u, email: emailParam } = useLocalSearchParams<{ u?: string; email?: string }>();
  const [email, setEmail] = useState(emailParam ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [mismatch, setMismatch] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!u) {
    return (
      <AuthFrame title="Reset password" subtitle="Choose a new password for your account.">
        <StateView icon="link-outline" title="This reset link is invalid" action={{ label: 'Back to sign in', onPress: () => router.replace('/login') }} />
      </AuthFrame>
    );
  }

  const submit = async () => {
    if (password.length < 6) return setMismatch('Use at least 6 characters.');
    if (password !== confirm) return setMismatch('Passwords do not match.');
    setMismatch(null);
    setError(null);
    try {
      await changePassword({ email: email.trim(), newPassword: password, cpToken: u });
      toast.show({ message: 'Password updated. Please sign in.', tone: 'success' });
      router.replace('/login');
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <AuthFrame title="New password" subtitle="Choose a new password for your account." back={false}>
      <Input label="Email" icon="mail-outline" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Input label="New password" icon="lock-closed-outline" secure value={password} onChangeText={setPassword} />
      <Input label="Confirm password" icon="lock-closed-outline" secure value={confirm} onChangeText={setConfirm} error={mismatch} />
      {!!error && <NoticeBox tone="danger" message={error} />}
      <Button title="Update password" icon="checkmark-outline" onPress={submit} />
    </AuthFrame>
  );
}
