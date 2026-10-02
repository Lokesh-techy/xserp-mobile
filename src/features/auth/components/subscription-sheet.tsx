/** @author Lokesh */
import { useState } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/core/api';
import { requestExtension, useSessionStore } from '@/core/auth';
import { makeStyles, useTheme } from '@/core/theme';
import { formatDate } from '@/core/utils';
import { BottomSheet, Button, Input, Text, toast } from '@/ui';

import { NoticeBox } from './auth-frame';

/** XSManager's expiry dialog: shown once per app session while the subscription timer is on. */
export function SubscriptionSheet() {
  const t = useTheme();
  const styles = useStyles();
  const sub = useSessionStore((s) => s.session?.subscription);
  const [dismissed, setDismissed] = useState(false);
  const [reason, setReason] = useState('');
  const [requested, setRequested] = useState(false);
  if (!sub) return null;

  const close = () => setDismissed(true);
  const request = async () => {
    try {
      await requestExtension(reason.trim() || 'Requesting an extension from the mobile app.');
      setRequested(true);
      toast.show({ message: 'Extension requested. We will be in touch.', tone: 'success' });
      close();
    } catch (e) {
      toast.show({ message: errorMessage(e), tone: 'danger' });
    }
  };
  const alreadyRequested = requested || !!sub.extensionRequestedOn;

  return (
    <BottomSheet visible={sub.showExpiry && !dismissed} onClose={close} title={sub.isExpired ? 'Subscription expired' : 'Subscription ending soon'}>
      <View style={styles.body}>
        <Text variant="body" color={t.colors.textMuted}>
          {sub.plan ? `${sub.plan} plan · ` : ''}
          {sub.isExpired ? 'Expired on' : 'Expires on'} {formatDate(sub.expiredOn)}
        </Text>
        {alreadyRequested ? (
          <NoticeBox tone="info" message={`Extension requested${sub.extensionRequestedOn ? ` on ${formatDate(sub.extensionRequestedOn)}` : ''}.`} />
        ) : (
          sub.canRequestExtension && (
            <>
              <Input label="Reason" icon="chatbox-ellipses-outline" value={reason} onChangeText={setReason} multiline />
              <Button title="Request extension" icon="time-outline" onPress={request} />
            </>
          )
        )}
        <Button title="Close" variant="ghost" onPress={close} />
      </View>
    </BottomSheet>
  );
}

const useStyles = makeStyles(() => ({ body: { paddingHorizontal: 20, gap: 14 } }));
