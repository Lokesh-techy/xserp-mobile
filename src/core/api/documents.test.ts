/** @author Lokesh */
import { base64ToBytes, safeFilename } from './documents';

test('base64ToBytes decodes standard base64, with or without a data: prefix', () => {
  expect(Array.from(base64ToBytes('SGVsbG8='))).toEqual([72, 101, 108, 108, 111]);
  expect(Array.from(base64ToBytes('data:application/pdf;base64,SGk='))).toEqual([72, 105]);
});

test('safeFilename removes path separators and odd characters', () => {
  expect(safeFilename('PO/25-26/0012.pdf')).toBe('PO_25-26_0012.pdf');
  expect(safeFilename('  ')).toBe('document.pdf');
});
