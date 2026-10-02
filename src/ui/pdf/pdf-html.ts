/** @author Lokesh */
// In-app PDF preview: pdf.js renders every page to a canvas inside a WebView (works on Android, where
// WebView can't display PDFs natively, and in Expo Go). The document bytes are injected separately.

export const PDFJS_VERSION = '3.11.174';
const CDN = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}`;

export function pdfViewerHtml({ dark }: { dark: boolean }): string {
  const bg = dark ? '#0A111D' : '#F4F7FB';
  return `<!doctype html><html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=4, user-scalable=yes">
<style>
  html,body{margin:0;background:${bg};}
  #pages{padding:12px 10px 40px;display:flex;flex-direction:column;align-items:center;gap:12px;}
  canvas{width:100%;height:auto;background:#fff;border-radius:10px;box-shadow:0 6px 18px rgba(11,42,91,.14);}
  #msg{font:600 14px -apple-system,Roboto,sans-serif;color:${dark ? '#9AA8BD' : '#5B6B82'};text-align:center;padding:40px 16px;}
</style>
<script src="${CDN}/pdf.min.js"></script>
</head><body><div id="msg">Rendering…</div><div id="pages"></div>
<script>
(function () {
  function post(m){ window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(m)); }
  function start(){
    if (!window.pdfjsLib || !window.__PDF_B64) return setTimeout(start, 60);
    pdfjsLib.GlobalWorkerOptions.workerSrc = '${CDN}/pdf.worker.min.js';
    var raw = atob(window.__PDF_B64), bytes = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    pdfjsLib.getDocument({ data: bytes }).promise.then(function (pdf) {
      document.getElementById('msg').remove();
      post({ type: 'pages', count: pdf.numPages });
      var scale = Math.min(3, (window.devicePixelRatio || 2) * 1.25);
      var chain = Promise.resolve();
      for (var n = 1; n <= pdf.numPages; n++) (function (n) {
        chain = chain.then(function () { return pdf.getPage(n); }).then(function (page) {
          var vp = page.getViewport({ scale: scale }), c = document.createElement('canvas');
          c.width = vp.width; c.height = vp.height;
          document.getElementById('pages').appendChild(c);
          return page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
        });
      })(n);
      chain.then(function(){ post({ type: 'done' }); });
    }).catch(function (e) { document.getElementById('msg').textContent = 'Could not open this PDF.'; post({ type: 'error', message: String(e) }); });
  }
  start();
})();
</script></body></html>`;
}

/** Injected before the page runs; JSON.stringify keeps the base64 safely quoted. */
export const pdfDataScript = (base64: string) => `window.__PDF_B64 = ${JSON.stringify(base64)}; true;`;
