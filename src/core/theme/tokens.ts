/** @author Lokesh */
export const gradients = {
  brand: ['#001A3D', '#004195', '#1579C8'] as const,
  header: ['#00265A', '#004195'] as const,
  accent: ['#004195', '#209BE1'] as const,
  success: ['#178463', '#1D9D74'] as const,
  danger: ['#B8403C', '#D9534F'] as const,
};
export type Gradients = typeof gradients;

export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;
export type Fonts = typeof fonts;

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;
export type Radius = typeof radius;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, gutter: 18 } as const;
export type Space = typeof space;

export const shadow = {
  card: { shadowColor: '#0B2A5B', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  lifted: { shadowColor: '#001A3D', shadowOpacity: 0.18, shadowRadius: 28, shadowOffset: { width: 0, height: 14 }, elevation: 8 },
  button: { shadowColor: '#004195', shadowOpacity: 0.28, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
} as const;
export type Shadows = typeof shadow;

/** Colours used on top of the dark gradients — identical in both schemes. */
export const alpha = {
  onGradient: '#FFFFFF',
  onGradientMuted: 'rgba(255,255,255,0.72)',
  onGradientFaint: 'rgba(255,255,255,0.55)',
  glassFill: 'rgba(255,255,255,0.14)',
  glassBorder: 'rgba(255,255,255,0.18)',
  glassButton: 'rgba(255,255,255,0.16)',
  orb: 'rgba(32,155,225,0.25)',
  orbSoft: 'rgba(255,255,255,0.07)',
  orbGreen: 'rgba(29,157,116,0.14)',
  backdrop: 'rgba(0,18,45,0.55)',
  liveDot: '#35D39A',
  successOnGradient: '#7FE0B8',
} as const;
export type Alpha = typeof alpha;

export const moduleTints = {
  finance: '#004195',
  audit: '#6A5ACD',
  purchase: '#E59A1A',
  sales: '#1D9D74',
  stores: '#209BE1',
  masters: '#0E7C86',
  expenses: '#D9534F',
  approvals: '#1C75ED',
  production: '#94A3B8',
  hr: '#94A3B8',
  reports: '#94A3B8',
  settings: '#5B6B82',
} as const;
export type ModuleTints = typeof moduleTints;
export type ModuleTint = keyof ModuleTints;

export const chartSeries = {
  light: ['#004195', '#209BE1', '#1D9D74', '#E59A1A', '#6A5ACD', '#D9534F', '#0E7C86'],
  dark: ['#5B9BFF', '#6CC4F5', '#3CC79A', '#F2B84B', '#9B8CFF', '#F07B77', '#3FB8C2'],
} as const;
