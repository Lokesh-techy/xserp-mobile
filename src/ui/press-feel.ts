/** @author Lokesh */
import * as Haptics from 'expo-haptics';

/**
 * For buttons that open a page: a crisp haptic and the page opens on the same frame (it shows its
 * skeleton until data arrives). Snappy first — never wait on an animation to navigate.
 */
export const withPressFeel = (action: () => void) => () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  action();
};
