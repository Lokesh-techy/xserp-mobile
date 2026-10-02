/** @author Lokesh */
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { z } from 'zod';

import { currentEnterpriseId, post } from './client';
import { ApiError } from './errors';
import type { FormParams } from './form';
import { zStr } from './schema';

export type DocumentRequest = { path: string; params: FormParams; filename: string; mimeType?: string };

const docSchema = z.looseObject({ data: zStr, filename: zStr.optional(), ext: zStr.optional() });

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function base64ToBytes(input: string): Uint8Array {
  const b64 = input.replace(/^data:[^,]*,/, '').replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((b64.length * 3) / 4));
  let buffer = 0;
  let bits = 0;
  let n = 0;
  for (const ch of b64) {
    buffer = (buffer << 6) | ALPHABET.indexOf(ch);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[n++] = (buffer >> bits) & 0xff;
    }
  }
  return out.slice(0, n);
}

export function safeFilename(name: string): string {
  const cleaned = name.trim().replace(/[\\/:*?"<>|\s]+/g, '_');
  return cleaned || 'document.pdf';
}

const DOCS_DIR = 'xserp-docs';

export type FetchedDocument = { title: string; base64: string; uri: string; mimeType: string };

/**
 * Downloads an xserp `*_doc` PDF (base64 mode) and saves it per company (so one company's PDF can never
 * be shown to another). Always fetched fresh — documents change after approval.
 */
export async function fetchDocument(req: DocumentRequest, { regenerate = false } = {}): Promise<FetchedDocument> {
  const company = String(currentEnterpriseId() ?? 'none');
  const res = await post(
    req.path,
    { ...req.params, response_data_type: 'data', source: 'mobile', ...(regenerate ? { document_regenerate: 'true' } : {}) },
    { schema: docSchema, timeoutMs: 120_000 },
  );
  if (!res.data) throw new ApiError('server', 'The document is not available yet.');
  const base64 = res.data.replace(/^data:[^,]*,/, '');
  const dir = new Directory(Paths.cache, DOCS_DIR, company);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  const file = new File(Paths.cache, DOCS_DIR, company, safeFilename(req.filename));
  if (file.exists) file.delete();
  file.create();
  file.write(base64ToBytes(base64));
  return { title: req.filename, base64, uri: file.uri, mimeType: req.mimeType ?? 'application/pdf' };
}

/** Hands a downloaded document to the system share sheet / other apps. */
export async function shareDocument(doc: Pick<FetchedDocument, 'uri' | 'mimeType' | 'title'>) {
  if (!(await Sharing.isAvailableAsync())) throw new ApiError('config', 'No app available to share this document.');
  await Sharing.shareAsync(doc.uri, { mimeType: doc.mimeType, UTI: 'com.adobe.pdf', dialogTitle: doc.title });
}

/** Download + share in one step (kept for flows without an in-app preview). */
export async function openDocument(req: DocumentRequest, opts: { regenerate?: boolean } = {}): Promise<void> {
  await shareDocument(await fetchDocument(req, opts));
}

/** Removes every downloaded document (called on sign-out). */
export function clearDocumentCache() {
  try {
    const dir = new Directory(Paths.cache, DOCS_DIR);
    if (dir.exists) dir.delete();
  } catch {
    // The cache is best effort; the OS also evicts it.
  }
}
