/** @author Lokesh */
export type ApiErrorKind = 'network' | 'timeout' | 'session' | 'server' | 'validation' | 'csrf' | 'config';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly code?: number;
  readonly path?: string;
  readonly details?: string;

  constructor(kind: ApiErrorKind, message: string, opts: { code?: number; path?: string; details?: string } = {}) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.code = opts.code;
    this.path = opts.path;
    this.details = opts.details;
  }
}

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError;

const FRIENDLY: Partial<Record<ApiErrorKind, string>> = {
  network: 'Unable to reach the server. Check your connection.',
  timeout: 'The server took too long to respond.',
  csrf: 'The server rejected the request. Please try again.',
  validation: 'Unexpected server response.',
};

/** A message safe to show to the user. */
export function errorMessage(e: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (isApiError(e)) return FRIENDLY[e.kind] ?? e.message ?? fallback;
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}
