/** @author Lokesh */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '@/core/theme';

import { HOLD_MS, HoldButton } from './hold-button';

const wrap = (ui: React.ReactNode) => render(<ThemeProvider initialPreference="light">{ui}</ThemeProvider>);

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('completes only after a full hold', async () => {
  const onComplete = jest.fn();
  await wrap(<HoldButton title="Hold to approve" onComplete={onComplete} />);
  const btn = screen.getByLabelText('Hold to approve');
  await fireEvent(btn, 'pressIn');
  await act(async () => {
    jest.advanceTimersByTime(HOLD_MS - 50);
  });
  expect(onComplete).not.toHaveBeenCalled();
  await act(async () => {
    jest.advanceTimersByTime(60);
  });
  expect(onComplete).toHaveBeenCalledTimes(1);
});

test('releasing early cancels', async () => {
  const onComplete = jest.fn();
  await wrap(<HoldButton title="Hold to approve" onComplete={onComplete} />);
  const btn = screen.getByLabelText('Hold to approve');
  await fireEvent(btn, 'pressIn');
  await act(async () => {
    jest.advanceTimersByTime(HOLD_MS / 2);
  });
  await fireEvent(btn, 'pressOut');
  await act(async () => {
    jest.advanceTimersByTime(HOLD_MS);
  });
  expect(onComplete).not.toHaveBeenCalled();
});

test('disabled never completes', async () => {
  const onComplete = jest.fn();
  await wrap(<HoldButton title="Hold to approve" disabled onComplete={onComplete} />);
  await fireEvent(screen.getByLabelText('Hold to approve'), 'pressIn');
  await act(async () => {
    jest.advanceTimersByTime(HOLD_MS * 2);
  });
  expect(onComplete).not.toHaveBeenCalled();
});
