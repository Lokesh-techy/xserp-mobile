/** @author Lokesh */
import { FEEL_MS, withPressFeel } from './press-feel';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('runs the action after the morph has had time to play', async () => {
  const action = jest.fn();
  const p = withPressFeel(action)();
  expect(action).not.toHaveBeenCalled();
  jest.advanceTimersByTime(FEEL_MS);
  await p;
  expect(action).toHaveBeenCalledTimes(1);
});
