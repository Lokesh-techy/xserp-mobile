/** @author Lokesh */

/** One uploaded file on a sales document. `key` is the storage key the download endpoint expects. */
export type Attachment = { key: string; name: string; ext: string };

type Entry = { uid?: unknown; name?: unknown; ext?: unknown };

/** The column holds a JSON list (newer rows) or a Python repr of one (older rows, single quotes). */
function parseList(raw: string): Entry[] | null {
  for (const text of [raw, raw.replace(/'/g, '"').replace(/\bNone\b/g, 'null').replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false')]) {
    try {
      const v: unknown = JSON.parse(text);
      if (Array.isArray(v)) return v as Entry[];
      if (v && typeof v === 'object') return [v as Entry];
    } catch {
      // try the next form
    }
  }
  return null;
}

/**
 * The document's attachments as download keys, the way the web app builds them: `<enterprise>/<uid>.<ext>`
 * (the server strips the extension when it looks the file up). A bare path from very old rows is used as is.
 */
export function parseAttachments(raw: string | null | undefined, enterpriseId: number | string | null): Attachment[] {
  const value = raw?.trim();
  if (!value) return [];
  const list = parseList(value);
  if (!list) return [{ key: value, name: value.split('/').pop() || 'Attachment', ext: value.match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase() ?? '' }];
  return list.flatMap((e) => {
    const uid = typeof e.uid === 'string' ? e.uid.trim() : '';
    if (!uid) return [];
    const ext = typeof e.ext === 'string' ? e.ext.replace(/^\./, '').toLowerCase() : '';
    const name = typeof e.name === 'string' && e.name.trim() ? e.name.trim() : `Attachment${ext ? `.${ext}` : ''}`;
    const base = uid.includes('/') || enterpriseId == null ? uid : `${enterpriseId}/${uid}`;
    return [{ key: ext && !/\.[a-z0-9]{2,5}$/i.test(base) ? `${base}.${ext}` : base, name, ext }];
  });
}
