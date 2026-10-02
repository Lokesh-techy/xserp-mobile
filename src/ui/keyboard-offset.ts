/** @author Lokesh */
/**
 * How far to lift a bottom sheet for the keyboard. Edge-to-edge Android (and iOS) don't resize the
 * window, so the sheet must move itself; where the OS did shrink the window, only lift the remainder.
 */
export const keyboardOffset = ({ keyboard, windowShrink }: { keyboard: number; windowShrink: number }) => Math.max(0, keyboard - Math.max(0, windowShrink));
