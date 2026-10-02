/** @author Lokesh */
import { cancelAllApprovalActions, isActionPending, scheduleApprovalAction } from './action-queue';

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  cancelAllApprovalActions();
  jest.useRealTimers();
});

const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

test('a pending action blocks every other action on the same document, across screens', async () => {
  const approve = jest.fn(async () => {});
  const reject = jest.fn(async () => {});
  expect(scheduleApprovalAction({ type: 'po', id: '1', action: 'approve' }, approve, { onError: jest.fn() })).toBe(true);
  // the user leaves and reopens the pager: a new screen instance, same module-level queue
  expect(scheduleApprovalAction({ type: 'po', id: '1', action: 'reject' }, reject, { onError: jest.fn() })).toBe(false);
  expect(isActionPending('po', '1')).toBe(true);
  jest.advanceTimersByTime(4000);
  await flush();
  expect(approve).toHaveBeenCalledTimes(1);
  expect(reject).not.toHaveBeenCalled();
  expect(isActionPending('po', '1')).toBe(false);
});

test('sign-out cancels queued actions so they never run under the next user', async () => {
  const task = jest.fn(async () => {});
  scheduleApprovalAction({ type: 'invoice', id: '9', action: 'approve' }, task, { onError: jest.fn() });
  cancelAllApprovalActions();
  jest.advanceTimersByTime(5000);
  await flush();
  expect(task).not.toHaveBeenCalled();
});
