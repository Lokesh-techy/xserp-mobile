/** @author Lokesh */
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';
import { WebView } from 'react-native-webview';

import { errorMessage, fetchDocument, saveDocument, shareDocument } from '@/core/api';
import { successFeedback } from '@/core/utils';
import { makeStyles, useTheme } from '@/core/theme';

import { ScreenHeader } from '../screen-header';
import { StateView } from '../state-view';
import { toast } from '../toast';
import { PdfComposing } from './pdf-composing';
import { pdfDataScript, pdfViewerHtml } from './pdf-html';
import { useDocumentViewer } from './viewer-store';

/** Decoded size of a base64 file, as "248 KB" / "1.2 MB". */
const fileSize = (b64: string) => {
  const bytes = Math.floor((b64.length * 3) / 4);
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

const isImage = (mime: string) => mime.startsWith('image/');
const previewable = (mime: string) => mime === 'application/pdf' || isImage(mime);

/** An image attachment, centred and pinch-zoomable; tells the screen it's ready once it has painted. */
const imageViewerHtml = (doc: { base64: string; mimeType: string }, dark: boolean) => `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5">
<style>html,body{margin:0;height:100%;background:${dark ? '#0A111D' : '#F4F7FB'}}body{display:flex;align-items:center;justify-content:center}
img{max-width:100%;max-height:100%;box-shadow:0 10px 30px rgba(0,26,61,.18)}</style></head><body>
<img src="data:${doc.mimeType};base64,${doc.base64}"
 onload="window.ReactNativeWebView.postMessage(JSON.stringify({type:'pages',count:1}))"
 onerror="window.ReactNativeWebView.postMessage(JSON.stringify({type:'error'}))"></body></html>`;

/** In-app preview (pinch to zoom) for PDFs and image attachments, with Share in the header. */
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

  const share = () =>
    doc
      ? shareDocument(doc).catch((e: unknown) => void toast.show({ message: errorMessage(e), tone: 'danger' }))
      : undefined;
  const download = async () => {
    if (!doc) return;
    try {
      const saved = await saveDocument(doc);
      if (saved?.where === 'folder') {
        successFeedback();
        toast.show({ message: `Saved to ${saved.folder} · ${saved.name}`, tone: 'success' });
      }
    } catch (e) {
      toast.show({ message: errorMessage(e, "Couldn't save the file."), tone: 'danger' });
    }
  };
  const title = request.filename.replace(/\.[a-z0-9]{2,5}$/i, '');

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={title}
        subtitle={
          pages && doc?.mimeType === 'application/pdf'
            ? `${pages} page${pages === 1 ? '' : 's'} · ${fileSize(doc.base64)}`
            : doc
              ? fileSize(doc.base64)
              : request.raw
                ? 'Attachment'
                : 'PDF'
        }
        actions={
          doc
            ? [
                { icon: 'download-outline', label: 'Download', onPress: () => void download() },
                { icon: 'share-outline', label: 'Share', onPress: () => void share() },
              ]
            : []
        }
      />
      {query.isError ? (
        <View style={styles.pad}>
          <StateView
            icon="cloud-offline-outline"
            title="Couldn't download this document"
            message={errorMessage(query.error)}
            action={{ label: 'Try again', onPress: () => void query.refetch() }}
          />
        </View>
      ) : !doc ? (
        <View style={styles.flex}>
          <PdfComposing phase="generating" attachment={request.raw} />
        </View>
      ) : !previewable(doc.mimeType) ? (
        <View style={styles.pad}>
          <StateView
            icon="document-attach-outline"
            title="No preview for this file type"
            message={`${fileSize(doc.base64)} · open it in another app to view.`}
            action={{ label: 'Open in another app', onPress: () => void share() }}
          />
        </View>
      ) : failed ? (
        <View style={styles.pad}>
          <StateView
            icon="alert-circle-outline"
            title="Couldn't preview this PDF"
            message="You can still share or open it in another app."
            action={{ label: 'Share', onPress: () => void share() }}
          />
        </View>
      ) : (
        <View style={styles.flex}>
          <WebView
            originWhitelist={['*']}
            source={{ html: isImage(doc.mimeType) ? imageViewerHtml(doc, t.dark) : pdfViewerHtml({ dark: t.dark }) }}
            injectedJavaScriptBeforeContentLoaded={isImage(doc.mimeType) ? undefined : pdfDataScript(doc.base64)}
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
          {/* The composing page hands over to the real one: it fades as the first page paints. */}
          {!ready && (
            <Animated.View exiting={FadeOut.duration(320)} style={StyleSheet.absoluteFill} pointerEvents="none">
              <PdfComposing phase="rendering" size={fileSize(doc.base64)} attachment={request.raw} />
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
}));
