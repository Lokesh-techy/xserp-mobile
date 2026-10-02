/** @author Lokesh */
import { withPressFeel } from './press-feel';

test('navigates immediately on press (the next page shows its skeleton at once)', () => {
  const action = jest.fn();
  withPressFeel(action)();
  expect(action).toHaveBeenCalledTimes(1);
});
