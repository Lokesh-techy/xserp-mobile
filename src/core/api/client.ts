/** @author Lokesh */
import { z } from 'zod';

import { env, erpUrl } from '../config/env';
import { checkEnvelope, htmlError, type Envelope } from './envelope';
import { ApiError } from './errors';
import { encodeForm, type FormParams } from './form';

export type AuthParams = { token: string; userId: number; enterpriseId: number };

type ApiHooks = { getAuth: () => AuthParams | null; onSessionExpired: () => void };
let hooks: ApiHooks = { getAuth: () => null, onSessionExpired: () => {} };

/** Wired once by core/auth/bootstrap so the client never imports the session store (no cycles). */
export function configureApi(next: Partial<ApiHooks>) {
  hooks = { ...hooks, ...next };
}

// Django's CSRF check is double-submit: cookie must equal the field/header, so any 32-hex value works.
const CSRF_TOKEN = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

type RequestOptions = { auth?: boolean; timeoutMs?: number; emptyCodes?: readonly number[] };
export type PostOptions<S extends z.ZodType> = RequestOptions & { schema: S };

/** The raw POST: auth fields, CSRF, timeout. Callers decide how to read the body. */
async function send(path: string, params: FormParams, { auth = true, timeoutMs = 30_000 }: RequestOptions): Promise<Response> {
  const body: FormParams = { ...params, csrfmiddlewaretoken: CSRF_TOKEN };
  if (auth) {
    const a = hooks.getAuth();
    if (!a) throw new ApiError('session', 'Please sign in again.', { path });
    body.token = a.token;
    body.user_id = a.userId;
    body.enterprise_id = a.enterpriseId;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(erpUrl(path), {
      method: 'POST',
      headers: {
        Accept: 'application/json, text/plain, */*',
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-CSRFToken': CSRF_TOKEN,
        Cookie: `csrftoken=${CSRF_TOKEN}`,
        Referer: `${env.serverUrl}/`,
      },
      body: encodeForm(body),
      // iOS would otherwise replace our CSRF cookie with stored cookies; auth is via POST fields.
      credentials: 'omit',
      signal: controller.signal,
    });
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError';
    throw new ApiError(aborted ? 'timeout' : 'network', aborted ? 'Request timed out' : 'Unable to reach the server', { path });
  } finally {
    clearTimeout(timer);
  }
  return res;
}

async function request(path: string, params: FormParams, opts: RequestOptions): Promise<Envelope> {
  const { auth = true, emptyCodes = [] } = opts;
  const res = await send(path, params, opts);
  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    const err = htmlError(text, res.status, path);
    if (err.kind === 'session' && auth) hooks.onSessionExpired();
    throw err;
  }

  try {
    return checkEnvelope(data, path, emptyCodes);
  } catch (e) {
    if (e instanceof ApiError && e.kind === 'session' && auth) hooks.onSessionExpired();
    throw e;
  }
}

/** POST + envelope check + zod validation. Feature api.ts files are the only callers. */
export async function post<S extends z.ZodType>(path: string, params: FormParams, opts: PostOptions<S>): Promise<z.infer<S>> {
  const data = await request(path, params, opts);
  const parsed = opts.schema.safeParse(data);
  if (!parsed.success) {
    const details = z.prettifyError(parsed.error);
    if (__DEV__) console.warn(`[api] ${path} schema mismatch\n${details}`);
    throw new ApiError('validation', 'Unexpected server response', { path, details });
  }
  return parsed.data;
}

/** For actions (approve/reject/save) where only success matters. */
export function postOk(path: string, params: FormParams, opts: RequestOptions = {}): Promise<Envelope> {
  return request(path, params, opts);
}

export type BinaryFile = { bytes: Uint8Array; contentType: string };

/**
 * For endpoints that answer with the file itself (e.g. `commons/json/document/`) rather than a JSON envelope.
 * A JSON or HTML answer is an error page; a plain-text 404 carries the server's reason, shown as is.
 */
export async function postBinary(path: string, params: FormParams, opts: RequestOptions = {}): Promise<BinaryFile> {
  const res = await send(path, params, opts);
  const contentType = res.headers.get('content-type') ?? '';
  if (!res.ok || /json|text\/html/i.test(contentType)) {
    const text = await res.text();
    if (/json/i.test(contentType)) {
      try {
        checkEnvelope(JSON.parse(text), path, []);
      } catch (e) {
        if (e instanceof ApiError && e.kind === 'session') hooks.onSessionExpired();
        throw e;
      }
    }
    if (res.status === 404 && text && !/<html/i.test(text)) throw new ApiError('server', text.trim().slice(0, 240), { path, code: 404 });
    const err = htmlError(text, res.status, path);
    if (err.kind === 'session') hooks.onSessionExpired();
    throw err;
  }
  return { bytes: new Uint8Array(await res.arrayBuffer()), contentType };
}

/** Company of the signed-in user, for scoping on-device caches. */
export const currentEnterpriseId = () => hooks.getAuth()?.enterpriseId ?? null;
