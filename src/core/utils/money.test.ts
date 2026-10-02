/** @author Lokesh */
import { formatCompact, formatMoney, formatQty } from './money';

test('formatMoney uses Indian grouping', () => {
  expect(formatMoney(1234567.5)).toBe('₹12,34,567.50');
  expect(formatMoney(0, '$')).toBe('$0.00');
  expect(formatMoney(-50)).toBe('-₹50.00');
});

test('formatCompact uses lakh/crore', () => {
  expect(formatCompact(25_000_000)).toBe('₹2.5 Cr');
  expect(formatCompact(350_000)).toBe('₹3.5 L');
  expect(formatCompact(12_500)).toBe('₹12.5 K');
  expect(formatCompact(999)).toBe('₹999');
});

test('formatQty', () => {
  expect(formatQty(12, 'Nos')).toBe('12 Nos');
  expect(formatQty(2.5)).toBe('2.5');
});
