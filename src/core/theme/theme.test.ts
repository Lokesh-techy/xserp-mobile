/** @author Lokesh */
import { resolveScheme, themes, toneColors } from './theme';

describe('resolveScheme', () => {
  it('follows the system when preference is system', () => {
    expect(resolveScheme('system', 'dark')).toBe('dark');
    expect(resolveScheme('system', 'light')).toBe('light');
    expect(resolveScheme('system', null)).toBe('light');
  });
  it('honours an explicit preference over the system', () => {
    expect(resolveScheme('dark', 'light')).toBe('dark');
    expect(resolveScheme('light', 'dark')).toBe('light');
  });
});

describe('themes', () => {
  it('keeps Despack brand colours identical in both schemes', () => {
    expect(themes.light.colors.primary).toBe('#004195');
    expect(themes.dark.colors.primary).toBe('#004195');
    expect(themes.light.gradients.header).toEqual(themes.dark.gradients.header);
  });
  it('switches neutrals per scheme', () => {
    expect(themes.light.colors.bg).toBe('#F2F4F8');
    expect(themes.dark.colors.bg).toBe('#070B12');
    expect(themes.dark.dark).toBe(true);
  });
  it('maps tones to palette colours', () => {
    expect(toneColors(themes.light, 'success')).toEqual({ bg: '#E8F5EF', fg: '#12775A' });
    expect(toneColors(themes.dark, 'warning')).toEqual({ bg: '#2A2010', fg: '#F2B84B' });
  });
});
