/** @author Lokesh */
import { encodeForm } from './form';

test('encodes scalars, skips nullish and JSON-encodes objects', () => {
  const body = encodeForm({ a: 'x y', b: 2, c: true, d: null, e: undefined, f: { k: [1] } });
  expect(body).toBe('a=x%20y&b=2&c=true&f=%7B%22k%22%3A%5B1%5D%7D');
});
