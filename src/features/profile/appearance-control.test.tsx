/** @author Lokesh */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Appearance } from 'react-native';

import { ThemeProvider, useTheme } from '@/core/theme';
import { Text } from '@/ui';

import { AppearanceControl } from './components/appearance-control';

function SchemeProbe() {
  return <Text>{`scheme:${useTheme().scheme}`}</Text>;
}

test('offers System / Light / Dark and switches the theme live', async () => {
  jest.spyOn(Appearance, 'setColorScheme').mockImplementation(() => undefined);
  await render(
    <ThemeProvider initialPreference="light">
      <AppearanceControl />
      <SchemeProbe />
    </ThemeProvider>,
  );
  expect(screen.getByText('System')).toBeTruthy();
  expect(screen.getByText('Light')).toBeTruthy();
  expect(screen.getByText('scheme:light')).toBeTruthy();
  await fireEvent.press(screen.getByText('Dark'));
  expect(screen.getByText('scheme:dark')).toBeTruthy();
  expect(Appearance.setColorScheme).toHaveBeenCalledWith('dark');
});
