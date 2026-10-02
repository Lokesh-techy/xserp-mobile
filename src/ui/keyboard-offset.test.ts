/** @author Lokesh */
import { keyboardOffset } from './keyboard-offset';

test('lifts the sheet by the keyboard height when the window did not resize', () => {
  expect(keyboardOffset({ keyboard: 300, windowShrink: 0 })).toBe(300);
});

test('does not double-lift when the OS already resized the window', () => {
  expect(keyboardOffset({ keyboard: 300, windowShrink: 300 })).toBe(0);
  expect(keyboardOffset({ keyboard: 300, windowShrink: 120 })).toBe(180);
});

test('no keyboard, no offset', () => {
  expect(keyboardOffset({ keyboard: 0, windowShrink: 0 })).toBe(0);
});
