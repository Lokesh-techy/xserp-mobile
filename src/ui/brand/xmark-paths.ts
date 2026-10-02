/** @author Lokesh */
// Petal paths copied unchanged from xserp-schnell/site_media/images/xs-logo.svg (the XSERP "X").
// The source applies translate(-273.45,-277.60); the viewBox below absorbs that offset.
export const XMARK_VIEWBOX = '273.45 277.6 116.02 117.82';
export const XMARK_CENTER = { x: 331.46, y: 336.5 };

export type PetalKey = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

export const PETALS: Record<PetalKey, { d: string; tone: 'navy' | 'blue'; dir: [number, number] }> = {
  topLeft: {
    d: 'm 278.4523,282.7115 29.7011,-0.111 c 1.5216,23.404 10.00147,42.34152 29.2991,51.3797 -25.2476,4.8123 -43.1696,-8.2678 -59.0002,-51.2687 z',
    tone: 'navy',
    dir: [-1, -1],
  },
  topRight: {
    d: 'm 384.474,282.7259 -33.5056,-0.1254 c -1.5216,23.404 -8.80539,49.429 -29.2991,51.8033 25.2476,4.8123 46.9741,-8.677 62.8047,-51.6779 z',
    tone: 'blue',
    dir: [1, -1],
  },
  bottomLeft: {
    d: 'm 278.4519,390.2925 33.5056,0.1254 c 1.5216,-23.404 6.67301,-48.57465 28.8754,-51.8033 -25.2476,-4.8123 -46.5505,8.6769 -62.381,51.6779 z',
    tone: 'blue',
    dir: [-1, 1],
  },
  bottomRight: {
    d: 'm 384.4736,390.3069 -29.7011,0.111 c -1.5217,-23.404 -11.36842,-42.17065 -29.2991,-51.3797 25.2476,-4.8123 43.1696,8.2677 59.0002,51.2687 z',
    tone: 'navy',
    dir: [1, 1],
  },
};

/** Enhanced two-tone petal gradients (spec §4.2). `onDark` is for navy/gradient backgrounds. */
export const PETAL_GRADIENTS = {
  color: { navy: ['#00265A', '#09459D'], blue: ['#1C75ED', '#209BE1'] },
  onDark: { navy: ['#FFFFFF', '#D6E9FF'], blue: ['#5CC3FF', '#1C75ED'] },
} as const;
