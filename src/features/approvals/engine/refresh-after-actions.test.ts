/** @author Lokesh */
import { QueryClient } from '@tanstack/react-query';

import { REFRESH_SETTLE_MS, refreshAfterActions } from './use-approval-action';

const mockSyncSession = jest.fn((_opts: unknown) => Promise.resolve());
jest.mock('@/core/auth', () => ({
  ...jest.requireActual('@/core/auth'),
  syncSession: (opts: unknown) => mockSyncSession(opts),
}));

describe('refreshAfterActions', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockSyncSession.mockClear();
  });
  afterEach(() => jest.useRealTimers());

  it('coalesces a run of actions into one refresh per query and one session read', async () => {
    const qc = new QueryClient();
    const invalidate = jest.spyOn(qc, 'invalidateQueries');
    const done = [
      refreshAfterActions(qc, [['po'], ['purchase', 'dashboard']]),
      refreshAfterActions(qc, [['po']]),
      refreshAfterActions(qc, [['invoice']]),
    ];
    jest.advanceTimersByTime(REFRESH_SETTLE_MS - 1);
    expect(invalidate).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    await Promise.all(done);
    expect(invalidate.mock.calls.map(([f]) => f?.queryKey)).toEqual([['po'], ['purchase', 'dashboard'], ['invoice']]);
    expect(mockSyncSession).toHaveBeenCalledTimes(1);
    expect(mockSyncSession).toHaveBeenCalledWith({ force: true });
  });

  it('restarts the quiet period while actions keep arriving', async () => {
    const qc = new QueryClient();
    const invalidate = jest.spyOn(qc, 'invalidateQueries');
    void refreshAfterActions(qc, [['po']]);
    jest.advanceTimersByTime(REFRESH_SETTLE_MS - 100);
    const last = refreshAfterActions(qc, [['po']]);
    jest.advanceTimersByTime(REFRESH_SETTLE_MS - 100);
    expect(invalidate).not.toHaveBeenCalled();
    jest.advanceTimersByTime(100);
    await last;
    expect(invalidate).toHaveBeenCalledTimes(1);
  });
});
