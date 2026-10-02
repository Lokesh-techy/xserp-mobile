/** @author Lokesh */
import { PETALS, XMARK_VIEWBOX } from './xmark-paths';

// The icon generator (Node, CommonJS) keeps its own copy; both must stay identical to xs-logo.svg.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const script = require('../../../assets/brand/xmark.js') as { PETALS: typeof PETALS; VIEWBOX: string };

test('app and icon generator share identical petal geometry', () => {
  expect(script.VIEWBOX).toBe(XMARK_VIEWBOX);
  for (const key of Object.keys(PETALS) as (keyof typeof PETALS)[]) {
    expect(script.PETALS[key].d).toBe(PETALS[key].d);
  }
});

test('geometry is the original xs-logo.svg paths', () => {
  expect(PETALS.bottomRight.d.startsWith('m 384.4736,390.3069')).toBe(true);
  expect(PETALS.topRight.d.startsWith('m 384.474,282.7259')).toBe(true);
});
