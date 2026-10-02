/** @author Lokesh */
import { render, screen } from '@testing-library/react-native';
import { Platform, StyleSheet } from 'react-native';

import { ThemeProvider } from '@/core/theme';

import { Text } from './text';

const renderText = (ui: React.ReactNode) => render(<ThemeProvider initialPreference="light">{ui}</ThemeProvider>);

describe('Android letter-spacing clipping guard', () => {
  beforeEach(() => jest.replaceProperty(Platform, 'OS', 'android'));
  afterEach(() => jest.restoreAllMocks());

  it('gives spaced text trailing room so the last glyphs are not cut off', async () => {
    await renderText(<Text variant="overline">by schnell energy</Text>);
    const style = StyleSheet.flatten(screen.getByText('BY SCHNELL ENERGY').props.style);
    expect(style.paddingRight).toBeGreaterThanOrEqual(2);
  });

  it('honours letter-spacing passed in style (e.g. the XSERP wordmark)', async () => {
    await renderText(<Text style={{ letterSpacing: 6 }}>XSERP</Text>);
    const style = StyleSheet.flatten(screen.getByText('XSERP').props.style);
    expect(style.paddingRight).toBeGreaterThanOrEqual(6);
  });

  it('leaves unspaced text alone', async () => {
    await renderText(<Text>Plain</Text>);
    expect(StyleSheet.flatten(screen.getByText('Plain').props.style).paddingRight).toBeUndefined();
  });
});
