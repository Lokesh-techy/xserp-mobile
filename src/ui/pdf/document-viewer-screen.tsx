/** @author Lokesh */
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';
import { WebView } from 'react-native-webview';

import { errorMessage, fetchDocument, shareDocument } from '@/core/api';
import { makeStyles, useTheme } from '@/core/theme';

import { ScreenHeader } from '../screen-header';
import { CardSkeleton } from '../skeleton';
import { StateView } from '../state-view';
import { toast } from '../toast';
import { pdfDataScript, pdfViewerHtml } from './pdf-html';
import { useDocumentViewer } from './viewer-store';

/** In-app PDF preview (pinch to zoom) with Share in the header. */
export function DocumentViewerScreen() {
  const t = useTheme();
  const styles = useStyles();
  const request = useDocumentViewer((s) => s.request);
  const regenerate = useDocumentViewer((s) => s.regenerate);
  const query = useQuery({
    queryKey: ['document', request?.path, request?.params, regenerate],
    queryFn: () => fetchDocument(request!, { regenerate }),
    enabled: !!request,
    gcTime: 0,
    staleTime: 0,
    retry: 0,
  });
  const doc = query.data;
  const [pages, setPages] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!request) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Document" />
        <View style={styles.pad}>
          <StateView icon="document-outline" title="No document open" />
        </View>
      </View>
    );
  }

  const share = () => (doc ? shareDocument(doc).catch((e: unknown) => void toast.show({ message: errorMessage(e), tone: 'danger' })) : undefined);
  const title = request.filename.replace(/\.pdf$/i, '');

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={title}
        subtitle={pages ? `${pages} page${pages === 1 ? '' : 's'}` : query.isPending ? 'Downloading…' : 'PDF'}
        actions={doc ? [{ icon: 'share-outline', label: 'Share', onPress: () => void share() }] : []}
      />
      {query.isError ? (
        <View style={styles.pad}>
          <StateView icon="cloud-offline-outline" title="Couldn't download this document" message={errorMessage(query.error)} action={{ label: 'Try again', onPress: () => void query.refetch() }} />
        </View>
      ) : !doc ? (
        <View style={styles.loading}>
          <CardSkeleton />
          <CardSkeleton />
        </View>
      ) : failed ? (
        <View style={styles.pad}>
          <StateView icon="alert-circle-outline" title="Couldn't preview this PDF" message="You can still share or open it in another app." action={{ label: 'Share', onPress: () => void share() }} />
        </View>
      ) : (
        <View style={styles.flex}>
          <WebView
            originWhitelist={['*']}
            source={{ html: pdfViewerHtml({ dark: t.dark }) }}
            injectedJavaScriptBeforeContentLoaded={pdfDataScript(doc.base64)}
            onMessage={(e) => {
              const m = JSON.parse(e.nativeEvent.data) as { type: string; count?: number };
              if (m.type === 'pages') {
                setPages(m.count ?? null);
                setReady(true);
              } else if (m.type === 'error') setFailed(true);
            }}
            style={styles.web}
            setBuiltInZoomControls={false}
            showsVerticalScrollIndicator={false}
          />
          {!ready && (
            <Animated.View exiting={FadeOut.duration(200)} style={styles.loading} pointerEvents="none">
              <CardSkeleton />
              <CardSkeleton />
            </Animated.View>
          )}
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.bg },
  flex: { flex: 1 },
  pad: { padding: t.space.gutter },
  web: { flex: 1, backgroundColor: t.colors.bg },
  loading: { position: 'absolute', top: 0, left: 0, right: 0, padding: t.space.gutter, backgroundColor: t.colors.bg },
}));
