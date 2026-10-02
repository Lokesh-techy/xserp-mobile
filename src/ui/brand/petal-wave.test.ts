/** @author Lokesh */
import { petalPulse } from './petal-wave';

test('each petal peaks a quarter-cycle after the previous one', () => {
  const peaks = [0, 1, 2, 3].map((i) => {
    let best = 0;
    let at = 0;
    for (let k = 0; k < 100; k++) {
      const v = petalPulse(k / 100, i);
      if (v > best) [best, at] = [v, k / 100];
    }
    return at;
  });
  for (let i = 1; i < 4; i++) expect(((peaks[i]! - peaks[i - 1]! + 1) % 1)).toBeCloseTo(0.25, 1);
  expect(petalPulse(0.3, 2)).toBeGreaterThanOrEqual(0);
  expect(petalPulse(0.3, 2)).toBeLessThanOrEqual(1);
});
