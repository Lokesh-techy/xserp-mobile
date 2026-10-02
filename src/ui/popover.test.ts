/** @author Lokesh */
import { placePopover } from './popover';

const screen = { width: 400, height: 800 };
const insets = { top: 40, bottom: 20 };

describe('placePopover', () => {
  it('right-aligns under the trigger', () => {
    const p = placePopover({ x: 280, y: 50, width: 100, height: 32 }, 260, screen, insets, 300);
    expect(p).toMatchObject({ origin: 'top', top: 88, left: 120 });
  });
  it('keeps clear of the left edge for a wide menu', () => {
    expect(placePopover({ x: 20, y: 50, width: 60, height: 32 }, 380, screen, insets, 300).left).toBe(12);
  });
  it('opens upward when it cannot fit below', () => {
    const p = placePopover({ x: 280, y: 700, width: 100, height: 32 }, 260, screen, insets, 300);
    expect(p).toMatchObject({ origin: 'bottom', bottom: 106 });
  });
});
