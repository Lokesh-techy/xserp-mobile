/** @author Lokesh */
import { ApiError } from './errors';

export type Envelope = { response_code: number; response_message?: string; custom_message?: string; [key: string]: unknown };

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** Validates xserp's `{response_code, response_message, custom_message, ...data}` envelope. */
export function checkEnvelope(data: unknown, path: string, emptyCodes: readonly number[] = []): Envelope {
  if (!isRecord(data)) throw new ApiError('validation', 'Unexpected server response', { path, details: 'Body is not an object' });
  if (data.response_message === 'Session Timeout') {
    throw new ApiError('session', 'Your session has ended. Please sign in again.', { path, code: 400 });
  }
  const hasCode = 'response_code' in data;
  const code = hasCode ? Number(data.response_code) : 200;
  if (code !== 200) {
    if (emptyCodes.includes(code)) return { response_code: 200 };
    const msg = [data.custom_message, data.error, data.message, data.response_message].find((m) => typeof m === 'string' && m.trim());
    throw new ApiError('server', (msg as string | undefined) ?? 'Request failed', { path, code });
  }
  return { ...data, response_code: 200 } as Envelope;
}

/** Maps the HTML pages xserp returns for auth/CSRF failures. */
export function htmlError(text: string, status: number, path: string): ApiError {
  if (status === 403 || /csrf/i.test(text)) return new ApiError('csrf', 'Request rejected by server (CSRF)', { path, code: status });
  if (/session has expired|session timeout|login again/i.test(text)) return new ApiError('session', 'Your session has expired', { path });
  if (/inactive/i.test(text)) return new ApiError('server', 'This account is inactive', { path, code: status });
  return new ApiError('validation', `Unexpected response from server (${status})`, { path, code: status });
}
