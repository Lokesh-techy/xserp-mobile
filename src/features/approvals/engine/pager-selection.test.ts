/** @author Lokesh */
import { pickCurrent } from './pager-selection';

const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
const idOf = (i: { id: string }) => i.id;

test('selects the requested document, not position 0', () => {
  expect(pickCurrent(items, 'c', 0, idOf)).toEqual({ index: 2, id: 'c' });
});

test('when the selected document leaves the list, stays at the same position', () => {
  const after = [{ id: 'a' }, { id: 'c' }];
  expect(pickCurrent(after, 'b', 1, idOf)).toEqual({ index: 1, id: 'c' });
  expect(pickCurrent([{ id: 'a' }], 'c', 2, idOf)).toEqual({ index: 0, id: 'a' });
});

test('empty list has no current document', () => {
  expect(pickCurrent([], 'a', 0, idOf)).toBeNull();
});
