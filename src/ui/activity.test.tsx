/** @author Lokesh */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { isIdleExpired } from '@/core/auth';
import { resetIdle } from '@/core/auth/idle-timeout';
import { ThemeProvider } from '@/core/theme';

import { Input } from './input';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

test('typing in a field counts as activity for the idle sign-out', async () => {
  const t0 = 5_000_000_000;
  const now = jest.spyOn(Date, 'now').mockReturnValue(t0);
  resetIdle();
  await render(
    <ThemeProvider initialPreference="light">
      <Input label="Amount" icon="cash-outline" onChangeText={() => undefined} />
    </ThemeProvider>,
  );
  now.mockReturnValue(t0 + 29 * 60_000);
  await fireEvent.changeText(screen.getByLabelText('Amount'), '12');
  expect(isIdleExpired(t0 + 40 * 60_000)).toBe(false);
  now.mockRestore();
});
