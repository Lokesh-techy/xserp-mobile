/** @author Lokesh */
import { Easing, FadeIn, FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';

export const easeOut = Easing.bezier(0.2, 0.8, 0.2, 1);
export const ease = Easing.bezier(0.25, 0.1, 0.25, 1);

export const springs = {
  gentle: { dampingRatio: 0.82, duration: 480 },
  snappy: { dampingRatio: 0.8, duration: 300 },
};

export const enter = (delay = 0) =>
  FadeInDown.springify(520)
    .dampingRatio(0.8)
    .delay(delay)
    .withInitialValues({ opacity: 0, transform: [{ translateY: 12 }] });

export const fadeIn = (delay = 0) => FadeIn.duration(240).delay(delay);
export const fadeOut = FadeOut.duration(160);
export const layout = LinearTransition.springify(420).dampingRatio(0.85);
