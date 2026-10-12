/** @author Lokesh */
import { SESSION_FRESH_MS, syncSession } from './session-refresh';

const mockRefresh = jest.fn();
jest.mock('./auth-api', () => ({ refreshSession: (s: unknown) => mockRefresh(s) }));

const mockState: { session: { token: string; refreshedAt: number } | null; update: jest.Mock } = {
  session: null,
  update: jest.fn(() => Promise.resolve()),
};
jest.mock('./session-store', () => ({ useSessionStore: { getState: () => mockState } }));

describe('syncSession', () => {
  beforeEach(() => {
    mockRefresh.mockReset().mockImplementation((s: { token: string }) => Promise.resolve({ ...s, refreshedAt: Date.now() }));
    mockState.update.mockClear();
  });

  it('skips a fresh session unless forced', async () => {
    mockState.session = { token: 't', refreshedAt: Date.now() };
    await syncSession();
    expect(mockRefresh).not.toHaveBeenCalled();
    await syncSession({ force: true });
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('shares one request between concurrent callers', async () => {
    mockState.session = { token: 't', refreshedAt: Date.now() - SESSION_FRESH_MS - 1 };
    await Promise.all([syncSession(), syncSession(), syncSession({ force: true })]);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(mockState.update).toHaveBeenCalledTimes(1);
  });

  it('drops the result if the session changed meanwhile', async () => {
    mockState.session = { token: 'old', refreshedAt: 0 };
    const run = syncSession();
    mockState.session = { token: 'new', refreshedAt: Date.now() };
    await run;
    expect(mockState.update).not.toHaveBeenCalled();
  });
});
