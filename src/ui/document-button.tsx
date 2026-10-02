/** @author Lokesh */
import { Alert } from 'react-native';

import { errorMessage, openDocument, type DocumentRequest } from '@/core/api';

import { Button } from './button';
import { toast } from './toast';

export function DocumentButton({ request, label = 'View PDF' }: { request: DocumentRequest; label?: string }) {
  const open = (regenerate: boolean) => openDocument(request, { regenerate }).catch((e: unknown) => void toast.show({ message: errorMessage(e), tone: 'danger' }));
  return (
    <Button
      title={label}
      icon="document-text-outline"
      variant="ghost"
      onPress={() => open(false)}
      onLongPress={() => Alert.alert('Document', 'Regenerate this document from the latest data?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Regenerate', onPress: () => void open(true) }])}
    />
  );
}
