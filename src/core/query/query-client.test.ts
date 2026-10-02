/** @author Lokesh */
import { ApiError } from '../api/errors';
import { shouldRetry } from './query-client';

test('never retries session, validation, csrf or server errors', () => {
  for (const kind of ['session', 'validation', 'csrf', 'server'] as const) {
    expect(shouldRetry(0, new ApiError(kind, 'x'))).toBe(false);
  }
});

test('retries transient network failures twice', () => {
  const e = new ApiError('network', 'x');
  expect(shouldRetry(0, e)).toBe(true);
  expect(shouldRetry(1, e)).toBe(true);
  expect(shouldRetry(2, e)).toBe(false);
});
