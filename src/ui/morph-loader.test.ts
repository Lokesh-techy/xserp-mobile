/** @author Lokesh */
import { humanSpin, ringPoint, ringRadius } from './morph-loader';

test('letters spread evenly on a ring sized to the word', () => {
  const r = ringRadius(8);
  const a = ringPoint(0, 8, r);
  const b = ringPoint(4, 8, r);
  expect(Math.hypot(a.x, a.y)).toBeCloseTo(r);
  expect(a.x).toBeCloseTo(-b.x);
  expect(a.y).toBeCloseTo(-b.y);
  expect(ringRadius(20)).toBeGreaterThan(ringRadius(4));
});

test('human spin eases in and out each turn and never runs backwards', () => {
  expect(humanSpin(0)).toBeCloseTo(0);
  expect(humanSpin(1)).toBeCloseTo(360);
  const early = humanSpin(0.1) - humanSpin(0);
  const middle = humanSpin(0.55) - humanSpin(0.45);
  expect(middle).toBeGreaterThan(early); // slow start, fast middle
  for (let i = 0; i < 10; i++) expect(humanSpin((i + 1) / 10)).toBeGreaterThanOrEqual(humanSpin(i / 10));
});
