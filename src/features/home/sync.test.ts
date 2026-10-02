/** @author Lokesh */
import { runSync, syncLabel, useLastSync } from './sync';

const now = new Date(2026, 9, 2, 12, 0, 0).getTime();

test('sync label', () => {
  expect(syncLabel(null, false, now)).toBe('Not synced yet');
  expect(syncLabel(now - 20_000, false, now)).toBe('Synced just now');
  expect(syncLabel(now - 5 * 60_000, false, now)).toBe('Synced 5 minutes ago');
  expect(syncLabel(now - 5 * 60_000, true, now)).toBe('Syncing…');
});

test('runSync records the time only when every task succeeds, and never runs twice at once', async () => {
  let release: () => void = () => {};
  const slow = jest.fn(() => new Promise<void>((r) => (release = r)));
  const first = runSync([slow]);
  const second = runSync([slow]);
  expect(useLastSync.getState().syncing).toBe(true);
  release();
  await Promise.all([first, second]);
  expect(slow).toHaveBeenCalledTimes(1);
  expect(useLastSync.getState()).toMatchObject({ syncing: false });
  expect(useLastSync.getState().at).not.toBeNull();

  const before = useLastSync.getState().at;
  await runSync([() => Promise.reject(new Error('offline'))]);
  expect(useLastSync.getState().at).toBe(before);
  expect(useLastSync.getState().failed).toBe(true);
});
