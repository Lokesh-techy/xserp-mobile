/** @author Lokesh */
import { easeOutCubic, tweenValue } from './count-up';

test('tweens from the old count to the new one and lands exactly', () => {
  expect(tweenValue(100, 200, 0)).toBe(100);
  expect(tweenValue(100, 200, 1)).toBe(200);
  const mid = tweenValue(100, 200, 0.5);
  expect(mid).toBeGreaterThan(150); // ease-out: fast start, gentle landing
  expect(Number.isInteger(mid)).toBe(true);
  expect(tweenValue(10, 3, 1)).toBe(3);
});

test('easing is monotonic', () => {
  expect(easeOutCubic(0)).toBe(0);
  expect(easeOutCubic(1)).toBe(1);
  expect(easeOutCubic(0.3)).toBeLessThan(easeOutCubic(0.6));
});
