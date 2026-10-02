/** @author Lokesh */
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Alert } from 'react-native';

import { errorMessage, fetchDocument, type DocumentRequest } from '@/core/api';

import { Button } from './button';
import { useDocumentViewer } from './pdf/viewer-store';
import { toast } from './toast';

/** Fetches the PDF (the label morphs into a loader meanwhile), then opens the in-app preview. */
export function DocumentButton({ request, label = 'View PDF' }: { request: DocumentRequest; label?: string }) {
  const open = async (regenerate: boolean) => {
    try {
      const doc = await fetchDocument(request, { regenerate });
      useDocumentViewer.setState({ doc });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      router.push('/document');
    } catch (e) {
      toast.show({ message: errorMessage(e), tone: 'danger' });
    }
  };
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
