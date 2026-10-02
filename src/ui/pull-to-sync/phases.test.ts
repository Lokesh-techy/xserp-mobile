/** @author Lokesh */
import { HOLD, rubberBand, spreadFor, SYNC_LABELS, TRIGGER } from './phases';

test('labels read as the spec describes', () => {
  expect(SYNC_LABELS).toEqual(['PULL TO REFRESH', 'RELEASE TO SYNC', 'SYNCING…', 'UP TO DATE']);
});

test('rubber band slows past the trigger', () => {
  expect(rubberBand(100)).toBeCloseTo(55);
  expect(rubberBand(400)).toBeLessThan(400 * 0.55);
  expect(rubberBand(400)).toBeGreaterThan(TRIGGER);
});

test('petals spread with the pull, then snap together once armed or syncing', () => {
  expect(spreadFor(0, 0)).toBe(0);
  expect(spreadFor(TRIGGER / 2, 0)).toBeCloseTo(0.5);
  expect(spreadFor(TRIGGER * 2, 0)).toBe(1);
  expect(spreadFor(TRIGGER, 1)).toBe(0);
  expect(spreadFor(HOLD, 2)).toBe(0);
});
