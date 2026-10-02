/** @author Lokesh */
import { router } from 'expo-router';
import { Alert } from 'react-native';

import type { DocumentRequest } from '@/core/api';

import { Button } from './button';
import { useDocumentViewer } from './pdf/viewer-store';
import { withPressFeel } from './press-feel';

/** Opens the in-app PDF preview immediately; the viewer shows a skeleton while the file downloads. */
export function DocumentButton({ request, label = 'View PDF' }: { request: DocumentRequest; label?: string }) {
  const open = (regenerate: boolean) =>
    withPressFeel(() => {
      useDocumentViewer.setState({ request, regenerate });
      router.push('/document');
    })();
  return (
    <Button
      title={label}
      icon="document-text-outline"
      variant="ghost"
      onPress={() => open(false)}
      onLongPress={() => Alert.alert('Document', 'Regenerate this document from the latest data?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Regenerate', onPress: () => open(true) }])}
    />
  );
}
