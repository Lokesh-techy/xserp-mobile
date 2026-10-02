/** @author Lokesh */
import * as Haptics from 'expo-haptics';

/** Long enough for a button's label-to-line morph to read before the next page appears. */
export const FEEL_MS = 420;

/**
 * Wraps a navigation so a Button shows its morph, then a crisp haptic, then the page opens.
 * Return value is a promise, which is what makes Button play its loading morph.
 */
export const withPressFeel = (action: () => void) => () =>
  new Promise<void>((resolve) =>
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      action();
      resolve();
    }, FEEL_MS),
  );
