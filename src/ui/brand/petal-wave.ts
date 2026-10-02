/** @author Lokesh */
/**
 * 0..1 outward pulse for petal `index` at wave phase `wave` (0..1, looping). Each petal peaks a quarter
 * cycle after the previous one, so a soft wave chases around the X while it loads.
 */
export const petalPulse = (wave: number, index: number) => {
  'worklet';
  const s = Math.sin(2 * Math.PI * (wave - index / 4));
  return s > 0 ? s * s : 0;
};
