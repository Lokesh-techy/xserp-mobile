/** @author Lokesh */
import { createActionRunner } from './action-runner';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

const setup = () => {
  const events: string[] = [];
  let undo: (() => void) | null = null;
  const runner = createActionRunner({
    delayMs: 4000,
    onScheduled: (_k, u) => {
      undo = u;
      events.push('scheduled');
    },
    onDone: () => events.push('done'),
    onError: (_k, e) => events.push(`error:${(e as Error).message}`),
  });
  return { runner, events, undo: () => undo?.() };
};

test('runs the task once after the undo window', async () => {
  const { runner, events } = setup();
  const task = jest.fn(async () => {});
  expect(runner.run('po:1:approve', task)).toBe(true);
  await Promise.resolve();
  expect(task).not.toHaveBeenCalled();
  jest.advanceTimersByTime(4000);
  await Promise.resolve();
  await Promise.resolve();
  expect(task).toHaveBeenCalledTimes(1);
  expect(events).toEqual(['scheduled', 'done']);
});

test('a double tap schedules only one request', async () => {
  const { runner } = setup();
  const task = jest.fn(async () => {});
  expect(runner.run('po:1:approve', task)).toBe(true);
  expect(runner.run('po:1:approve', task)).toBe(false);
  jest.advanceTimersByTime(4000);
  await Promise.resolve();
  await Promise.resolve();
  expect(task).toHaveBeenCalledTimes(1);
});

test('undo cancels before the request is sent', async () => {
  const { runner, undo } = setup();
  const task = jest.fn(async () => {});
  runner.run('po:1:approve', task);
  await Promise.resolve();
  undo();
  jest.advanceTimersByTime(5000);
  await Promise.resolve();
  expect(task).not.toHaveBeenCalled();
  expect(runner.isPending('po:1:approve')).toBe(false);
});

test('a failing precheck reports an error and never schedules', async () => {
  const { runner, events } = setup();
  const task = jest.fn(async () => {});
  runner.run('po:1:reject', task, async () => {
    throw new Error('GRN exists');
  });
  await Promise.resolve();
  await Promise.resolve();
  expect(events).toEqual(['error:GRN exists']);
  expect(task).not.toHaveBeenCalled();
});
