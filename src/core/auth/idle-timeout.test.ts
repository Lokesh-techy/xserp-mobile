/** @author Lokesh */
import { isIdleExpired, markActive, resetIdle } from './idle-timeout';

test('expires after the configured idle minutes', () => {
  const t0 = 1_000_000;
  jest.spyOn(Date, 'now').mockReturnValue(t0);
  resetIdle();
  markActive();
  expect(isIdleExpired(t0 + 29 * 60_000)).toBe(false);
  expect(isIdleExpired(t0 + 31 * 60_000)).toBe(true);
});
