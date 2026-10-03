/** @author Lokesh */
import { parseAttachments } from './attachments';

test('JSON list → enterprise-scoped keys with the real file names', () => {
  const raw = JSON.stringify([
    { uid: 'a1b2', name: 'Customer PO.pdf', ext: 'pdf' },
    { uid: 'c3d4', name: 'drawing.jpg', ext: 'jpg' },
  ]);
  expect(parseAttachments(raw, 102)).toEqual([
    { key: '102/a1b2.pdf', name: 'Customer PO.pdf', ext: 'pdf' },
    { key: '102/c3d4.jpg', name: 'drawing.jpg', ext: 'jpg' },
  ]);
});

test('older Python-repr rows and single entries parse too', () => {
  expect(parseAttachments("[{'uid': 'x9', 'name': 'po.pdf', 'ext': 'pdf'}]", 7)).toEqual([{ key: '7/x9.pdf', name: 'po.pdf', ext: 'pdf' }]);
  expect(parseAttachments('{"uid": "x9", "ext": "png"}', 7)).toEqual([{ key: '7/x9.png', name: 'Attachment.png', ext: 'png' }]);
});

test('a bare path is used as is; empty values give nothing', () => {
  expect(parseAttachments('102/legacy.pdf', 102)).toEqual([{ key: '102/legacy.pdf', name: 'legacy.pdf', ext: 'pdf' }]);
  expect(parseAttachments('', 102)).toEqual([]);
  expect(parseAttachments('[]', 102)).toEqual([]);
  expect(parseAttachments(null, 102)).toEqual([]);
});
