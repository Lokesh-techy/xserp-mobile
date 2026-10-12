/** @author Lokesh */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '@/core/theme';

import { CountdownButton, progressive } from './countdown-button';

const tone = { bg: '#E8F5EF', fg: '#12775A' };

test('reads Cancel while counting, cancels on tap, then reads Approving once time is up', async () => {
  jest.useFakeTimers();
  const onCancel = jest.fn();
  await render(
    <ThemeProvider initialPreference="light">
      <CountdownButton label="Approve" ms={3000} tone={tone} size="pill" onCancel={onCancel} a11y="Approve PO 1" />
    </ThemeProvider>,
  );
  expect(screen.getByText('Cancel')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Cancel Approve PO 1'));
  expect(onCancel).toHaveBeenCalledTimes(1);
  await act(() => jest.advanceTimersByTime(3000));
  expect(screen.getByText('Approving…')).toBeTruthy();
  jest.useRealTimers();
});

test('turns an action label into what it is doing', () => {
  expect(progressive('Approve')).toBe('Approving');
  expect(progressive('Reject')).toBe('Rejecting');
  expect(progressive('Review')).toBe('Reviewing');
  expect(progressive('Verify')).toBe('Verifying');
  expect(progressive('Return GRN')).toBe('Returning GRN');
});
