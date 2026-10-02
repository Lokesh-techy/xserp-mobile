/** @author Lokesh */
import { router } from 'expo-router';
import { useState } from 'react';

import { errorMessage } from '@/core/api';
import { forgotPassword } from '@/core/auth';
import { Button, Input, withPressFeel } from '@/ui';

import { AuthFrame, NoticeBox } from '../components/auth-frame';

export function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  const submit = async () => {
    if (!email.trim()) return setError('Enter the email you sign in with.');
    setError(null);
    try {
      setSent(await forgotPassword(email));
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <AuthFrame title="Reset password" subtitle="We'll email you a link to choose a new password.">
      {sent ? (
        <>
          <NoticeBox tone="success" message={sent} />
          <Button title="Back to sign in" variant="ghost" onPress={withPressFeel(() => router.back())} />
        </>
      ) : (
        <>
          <Input label="Email" icon="mail-outline" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" returnKeyType="send" onSubmitEditing={() => void submit()} />
          {!!error && <NoticeBox tone="danger" message={error} />}
          <Button title="Send reset link" icon="paper-plane-outline" onPress={submit} />
        </>
      )}
    </AuthFrame>
  );
}
