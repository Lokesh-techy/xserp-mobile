/** @author Lokesh */
import { Directory, File, Paths } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { z } from 'zod';

import { currentEnterpriseId, post, postBinary } from './client';
import { ApiError } from './errors';
import type { FormParams } from './form';
import { zStr } from './schema';

/** `raw`: the endpoint answers with the file's bytes (uploaded attachments), not a base64 JSON envelope. */
export type DocumentRequest = { path: string; params: FormParams; filename: string; mimeType?: string; raw?: boolean };

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

export function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8) | bytes[i + 2]!;
    out += ALPHABET[(n >> 18) & 63]! + ALPHABET[(n >> 12) & 63]! + ALPHABET[(n >> 6) & 63]! + ALPHABET[n & 63]!;
  }
  const rest = bytes.length - i;
  if (rest === 1) {
    const n = bytes[i]! << 16;
    out += ALPHABET[(n >> 18) & 63]! + ALPHABET[(n >> 12) & 63]! + '==';
  } else if (rest === 2) {
    const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8);
    out += ALPHABET[(n >> 18) & 63]! + ALPHABET[(n >> 12) & 63]! + ALPHABET[(n >> 6) & 63]! + '=';
  }
  return out;
}

/** The file's real type from its first bytes — uploads are often named wrongly or not at all. */
export function sniffType(bytes: Uint8Array): { mimeType: string; ext: string } | null {
  const b = (i: number) => bytes[i] ?? -1;
  if (b(0) === 0x25 && b(1) === 0x50 && b(2) === 0x44 && b(3) === 0x46) return { mimeType: 'application/pdf', ext: 'pdf' };
  if (b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47) return { mimeType: 'image/png', ext: 'png' };
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return { mimeType: 'image/jpeg', ext: 'jpg' };
  if (b(0) === 0x47 && b(1) === 0x49 && b(2) === 0x46) return { mimeType: 'image/gif', ext: 'gif' };
  if (b(0) === 0x52 && b(1) === 0x49 && b(2) === 0x46 && b(3) === 0x46 && b(8) === 0x57 && b(9) === 0x45) return { mimeType: 'image/webp', ext: 'webp' };
  return null;
}

const BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  txt: 'text/plain',
};

const extOf = (name: string) => name.match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase() ?? '';

/** Type of a downloaded attachment: its bytes first, then any extension the server or request names. */
export function attachmentType(bytes: Uint8Array, ...names: string[]): { mimeType: string; ext: string } {
  const sniffed = sniffType(bytes);
  if (sniffed) return sniffed;
  for (const n of names) {
    const ext = extOf(n);
    if (BY_EXT[ext]) return { mimeType: BY_EXT[ext]!, ext };
  }
  return { mimeType: 'application/octet-stream', ext: 'bin' };
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
  if (req.raw) return fetchAttachment(req);
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

/** An uploaded attachment (any type), saved with the extension its bytes say it really has. */
async function fetchAttachment(req: DocumentRequest): Promise<FetchedDocument> {
  const company = String(currentEnterpriseId() ?? 'none');
  const { bytes } = await postBinary(req.path, req.params, { timeoutMs: 120_000 });
  if (bytes.length === 0) throw new ApiError('server', 'The attachment is empty.');
  const uriName = typeof req.params.document_uri === 'string' ? req.params.document_uri : '';
  const { mimeType, ext } = attachmentType(bytes, uriName, req.filename);
  const filename = `${req.filename.replace(/\.[a-z0-9]{2,5}$/i, '')}.${ext}`;
  const dir = new Directory(Paths.cache, DOCS_DIR, company);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  const file = new File(Paths.cache, DOCS_DIR, company, safeFilename(filename));
  if (file.exists) file.delete();
  file.create();
  file.write(bytes);
  return { title: filename, base64: bytesToBase64(bytes), uri: file.uri, mimeType };
}

/** Hands a downloaded document to the system share sheet / other apps. */
export async function shareDocument(doc: Pick<FetchedDocument, 'uri' | 'mimeType' | 'title'>) {
  if (!(await Sharing.isAvailableAsync())) throw new ApiError('config', 'No app available to share this document.');
  await Sharing.shareAsync(doc.uri, { mimeType: doc.mimeType, UTI: doc.mimeType === 'application/pdf' ? 'com.adobe.pdf' : undefined, dialogTitle: doc.title });
}

const SAVE_DIR_KEY = 'docs.saveDirUri';

/** Where a download went: the folder name on Android, or the system sheet on iOS. */
export type SavedDocument = { where: 'folder'; folder: string; name: string } | { where: 'sheet' };

/**
 * Saves a copy outside the app. Android: into a folder the user picks once (e.g. Downloads), remembered for
 * next time; if that folder is no longer writable it asks again. iOS has no Downloads folder, so it opens the
 * system sheet, where "Save to Files" is the download.
 */
export async function saveDocument(doc: Pick<FetchedDocument, 'uri' | 'mimeType' | 'title' | 'base64'>): Promise<SavedDocument | null> {
  if (Platform.OS !== 'android') {
    await shareDocument(doc);
    return { where: 'sheet' };
  }
  const bytes = base64ToBytes(doc.base64);
  const name = safeFilename(doc.title);
  const write = (dir: Directory) => {
    const file = dir.createFile(name, doc.mimeType);
    file.write(bytes);
    return { where: 'folder' as const, folder: decodeURIComponent(dir.uri).split(/[/:]/).filter(Boolean).pop() ?? 'folder', name: file.name };
  };
  const remembered = await SecureStore.getItemAsync(SAVE_DIR_KEY).catch(() => null);
  if (remembered) {
    try {
      return write(new Directory(remembered));
    } catch {
      // Permission revoked or folder gone — fall through and ask again.
    }
  }
  let dir: Directory;
  try {
    dir = await Directory.pickDirectoryAsync();
  } catch {
    return null; // the user closed the picker
  }
  await SecureStore.setItemAsync(SAVE_DIR_KEY, dir.uri).catch(() => undefined);
  return write(dir);
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
