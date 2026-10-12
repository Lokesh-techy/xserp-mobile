/** @author Lokesh */
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { ThemeProvider } from '@/core/theme';

import { ReviewButton } from './review-button';

const wrap = (ui: ReactNode) => render(<ThemeProvider initialPreference="light">{ui}</ThemeProvider>);

test('is not a button until every queue has loaded', async () => {
  const onPress = jest.fn();
  await wrap(<ReviewButton label="Review all" ready={false} onPress={onPress} />);
  const button = screen.getByLabelText('Loading approvals');
  expect(button.props.accessibilityState).toMatchObject({ busy: true, disabled: true });
  fireEvent.press(button);
  expect(onPress).not.toHaveBeenCalled();
});

test('opens the review once ready', async () => {
  const onPress = jest.fn();
  await wrap(<ReviewButton label="Review all" ready onPress={onPress} />);
  fireEvent.press(screen.getByLabelText('Review all'));
  expect(onPress).toHaveBeenCalledTimes(1);
});
