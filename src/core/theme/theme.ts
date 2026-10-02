/** @author Lokesh */
import { dark, light, type Palette } from './palettes';
import {
  alpha,
  chartSeries,
  fonts,
  gradients,
  moduleTints,
  radius,
  shadow,
  space,
  type Alpha,
  type Fonts,
  type Gradients,
  type ModuleTints,
  type Radius,
  type Shadows,
  type Space,
} from './tokens';

export type Scheme = 'light' | 'dark';
export type ThemePreference = 'system' | 'light' | 'dark';
export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'violet';

export type Theme = {
  scheme: Scheme;
  dark: boolean;
  colors: Palette;
  gradients: Gradients;
  fonts: Fonts;
  radius: Radius;
  space: Space;
  shadow: Shadows;
  tints: ModuleTints;
  chart: readonly string[];
  alpha: Alpha;
};

function build(scheme: Scheme): Theme {
  return {
    scheme,
    dark: scheme === 'dark',
    colors: scheme === 'dark' ? dark : light,
    gradients,
    fonts,
    radius,
    space,
    shadow,
    tints: moduleTints,
    chart: chartSeries[scheme],
    alpha,
  };
}

/** One object per scheme so styles can be memoised by identity. */
export const themes: Record<Scheme, Theme> = { light: build('light'), dark: build('dark') };

export function resolveScheme(preference: ThemePreference, system: string | null | undefined): Scheme {
  if (preference === 'light' || preference === 'dark') return preference;
  return system === 'dark' ? 'dark' : 'light';
}

export function toneColors(t: Theme, tone: Tone): { bg: string; fg: string } {
  const c = t.colors;
  switch (tone) {
    case 'info':
      return { bg: c.accentSoft, fg: c.infoText };
    case 'success':
      return { bg: c.successSoft, fg: c.success };
    case 'warning':
      return { bg: c.warningSoft, fg: c.warningText };
    case 'danger':
      return { bg: c.dangerSoft, fg: c.danger };
    case 'violet':
      return { bg: c.violetSoft, fg: c.violet };
    default:
      return { bg: c.divider, fg: c.textMuted };
  }
}
