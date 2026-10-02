/** @author Lokesh */
import { togglePick } from './picker-selection';

test('multi-select toggles ids and keeps pick order', () => {
  let s: string[] = [];
  s = togglePick(s, 'b');
  s = togglePick(s, 'a');
  expect(s).toEqual(['b', 'a']);
  expect(togglePick(s, 'b')).toEqual(['a']);
});
