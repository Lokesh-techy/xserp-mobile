/** @author Lokesh */
import { PDFJS_VERSION, pdfDataScript, pdfViewerHtml } from './pdf-html';

test('viewer page loads pdf.js from the CDN and renders every page', () => {
  const html = pdfViewerHtml({ dark: false });
  expect(html).toContain(`pdf.js/${PDFJS_VERSION}/pdf.min.js`);
  expect(html).toContain('getPage');
  expect(html).toContain('width=device-width');
});

test('document bytes are injected separately, never inlined into the page', () => {
  expect(pdfViewerHtml({ dark: true })).not.toContain('JVBER');
  expect(pdfDataScript('JVBERi0x')).toContain('window.__PDF_B64 = "JVBERi0x"');
});
