/** @author Lokesh */
import { Easing, FadeIn, FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';

export const easeOut = Easing.bezier(0.2, 0.8, 0.2, 1);
export const ease = Easing.bezier(0.25, 0.1, 0.25, 1);

// Near-critical damping: things arrive and settle without a visible wobble, the way iOS moves.
export const springs = {
  gentle: { dampingRatio: 0.9, duration: 460 },
  snappy: { dampingRatio: 0.88, duration: 280 },
};

export const enter = (delay = 0) =>
  FadeInDown.springify(520)
    .dampingRatio(0.9)
    .delay(delay)
    .withInitialValues({ opacity: 0, transform: [{ translateY: 10 }] });

export const fadeIn = (delay = 0) => FadeIn.duration(220).easing(ease).delay(delay);
export const fadeOut = FadeOut.duration(140).easing(ease);
export const layout = LinearTransition.springify(400).dampingRatio(0.92);
