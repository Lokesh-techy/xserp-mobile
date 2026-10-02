/** @author Lokesh */
import { SYNC_PHRASES, phraseAt } from './messages';

test('rotates through distinct, friendly phrases', () => {
  expect(new Set(SYNC_PHRASES).size).toBe(SYNC_PHRASES.length);
  expect(phraseAt(0)).toBe(SYNC_PHRASES[0]);
  expect(phraseAt(SYNC_PHRASES.length)).toBe(SYNC_PHRASES[0]);
});
