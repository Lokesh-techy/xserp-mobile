/** @author Lokesh */
// Brand values come from xserp's erp_default.css via Despack (despack-rn/src/theme/index.ts). Do not edit casually.
export const brand = {
  navy900: '#001A3D',
  navy800: '#00265A',
  navy700: '#003378',
  primary: '#004195',
  accent: '#209BE1',
  success: '#1D9D74',
  warning: '#E59A1A',
  danger: '#D9534F',
  violet: '#6A5ACD',
  white: '#FFFFFF',
} as const;

// Neutrals follow Apple's layering: a quiet grouped background, white (or lifted) surfaces,
// hairline separators and three text levels. Every pair meets WCAG AA (faint: 3:1, decorative).
export const light = {
  ...brand,
  accentSoft: '#EAF5FC',
  primarySoft: '#EBF0F8',
  successSoft: '#E8F5EF',
  warningSoft: '#FCF4E5',
  dangerSoft: '#FCEDEC',
  violetSoft: '#F0EEFB',
  bg: '#F2F4F8',
  surface: '#FFFFFF',
  /** Floating layers (sheets, menus, bars) — one step above `surface`. */
  surfaceRaised: '#FFFFFF',
  /** Hairline that defines an edge: a whisper of shadow on light, of light on dark. */
  edgeLight: 'rgba(10,22,40,0.07)',
  border: '#E3E7EE',
  divider: '#EDF0F4',
  fill: '#EFF2F6',
  fillSubtle: '#F7F8FA',
  chipBorder: '#D6DEEA',
  bone: '#E8ECF2',
  shimmer: 'rgba(255,255,255,0.8)',
  handle: '#D3D9E2',
  text: '#0A1628',
  textMuted: '#556274',
  textFaint: '#87919F',
  onPrimarySoft: '#004195',
  warningText: '#9E6305',
  infoText: '#126FA8',
  successText: '#12775A',
  dangerText: '#C23F3B',
};

export type Palette = { [K in keyof typeof light]: string };

// Near-black with a navy undertone; depth comes from lighter surfaces, not shadows.
export const dark: Palette = {
  ...brand,
  accentSoft: '#0D2332',
  primarySoft: '#14213A',
  successSoft: '#0E2620',
  warningSoft: '#2A2010',
  dangerSoft: '#2E1719',
  violetSoft: '#1D1933',
  bg: '#070B12',
  surface: '#111823',
  surfaceRaised: '#19212E',
  edgeLight: 'rgba(255,255,255,0.08)',
  border: '#212A37',
  divider: '#19212C',
  fill: '#19212D',
  fillSubtle: '#141B26',
  chipBorder: '#2A3546',
  bone: '#1A222E',
  shimmer: 'rgba(255,255,255,0.06)',
  handle: '#3A4556',
  text: '#F2F5FA',
  textMuted: '#A1ABBB',
  textFaint: '#717D8F',
  onPrimarySoft: '#93BBFF',
  warningText: '#F2B84B',
  infoText: '#6CC4F5',
  successText: '#45C99D',
  dangerText: '#F07E7A',
};
