/** @author Lokesh */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { createRef } from 'react';
import type { TextInput } from 'react-native';

import { ThemeProvider } from '@/core/theme';

import { Input } from './input';

test('a tap anywhere on the field (here, its label) puts the cursor in it; the caller still gets the ref', async () => {
  const ref = createRef<TextInput>();
  await render(
    <ThemeProvider initialPreference="light">
      <Input
        ref={ref}
        label="Email"
        icon="mail-outline"
        placeholder="name@company.com"
        value=""
        onChangeText={() => {}}
      />
    </ThemeProvider>,
  );
  expect(ref.current).toBeTruthy();
  const focus = jest.spyOn(ref.current!, 'focus');
  fireEvent.press(screen.getByText('Email'));
  expect(focus).toHaveBeenCalledTimes(1);
});
