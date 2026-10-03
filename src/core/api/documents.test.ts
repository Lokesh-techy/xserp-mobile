/** @author Lokesh */
import { attachmentType, base64ToBytes, bytesToBase64, safeFilename } from './documents';

test('base64ToBytes decodes standard base64, with or without a data: prefix', () => {
  expect(Array.from(base64ToBytes('SGVsbG8='))).toEqual([72, 101, 108, 108, 111]);
  expect(Array.from(base64ToBytes('data:application/pdf;base64,SGk='))).toEqual([72, 105]);
});

test('safeFilename removes path separators and odd characters', () => {
  expect(safeFilename('PO/25-26/0012.pdf')).toBe('PO_25-26_0012.pdf');
  expect(safeFilename('  ')).toBe('document.pdf');
});

test('bytesToBase64 round-trips every padding length', () => {
  for (const text of ['', 'a', 'ab', 'abc', 'abcd', '%PDF-1.7']) {
    const bytes = Uint8Array.from(text, (c) => c.charCodeAt(0));
    const b64 = bytesToBase64(bytes);
    expect(b64).toBe(btoa(text));
    expect(Array.from(base64ToBytes(b64))).toEqual(Array.from(bytes));
  }
});

test('attachment type trusts the bytes over the name, then falls back to the extension', () => {
  const pdf = Uint8Array.from('%PDF-1.4', (c) => c.charCodeAt(0));
  const jpg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]);
  const unknown = Uint8Array.from([1, 2, 3, 4]);
  expect(attachmentType(pdf, '102/abc.hex')).toEqual({ mimeType: 'application/pdf', ext: 'pdf' });
  expect(attachmentType(jpg, 'scan.pdf')).toEqual({ mimeType: 'image/jpeg', ext: 'jpg' });
  expect(attachmentType(unknown, '102/abc.xlsx').ext).toBe('xlsx');
  expect(attachmentType(unknown, '102/abc')).toEqual({ mimeType: 'application/octet-stream', ext: 'bin' });
});
