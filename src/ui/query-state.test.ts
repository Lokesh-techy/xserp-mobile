/** @author Lokesh */
import { isSwitching } from './query-state';

test('skeleton only while loading results for new inputs, not on a same-input refresh', () => {
  expect(isSwitching({ isPlaceholderData: true, isFetching: true })).toBe(true);
  expect(isSwitching({ isPlaceholderData: false, isFetching: true })).toBe(false);
  expect(isSwitching({ isPlaceholderData: false, isFetching: false })).toBe(false);
});
