/** @author Lokesh */
import { useEffect, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { makeStyles } from '@/core/theme';

/** Where the trigger sits on screen (from `measureInWindow`). */
export type Anchor = { x: number; y: number; width: number; height: number };

type Props = { anchor: Anchor | null; onClose: () => void; width?: number; children: ReactNode };

const GAP = 6;
const EDGE = 12;

/** Clamp a popover of `width` under (or, if it can't fit, above) the anchor, right-aligned to it. */
export function placePopover(
  anchor: Anchor,
  width: number,
  screen: { width: number; height: number },
  insets: { top: number; bottom: number },
  estHeight: number,
) {
  const right = Math.max(EDGE, screen.width - (anchor.x + anchor.width));
  const left = Math.max(EDGE, screen.width - right - width);
  const below = anchor.y + anchor.height + GAP;
  const fitsBelow = below + estHeight <= screen.height - insets.bottom - EDGE;
  return fitsBelow
    ? { left, top: below, origin: 'top' as const, maxHeight: screen.height - insets.bottom - EDGE - below }
    : {
        left,
        bottom: screen.height - anchor.y + GAP,
        origin: 'bottom' as const,
        maxHeight: anchor.y - GAP - insets.top - EDGE,
      };
}

/**
 * A small menu that grows out of the control that opened it (like a native context menu) instead of a
 * sheet from the bottom. Tap anywhere outside to dismiss.
 */
export function Popover({ anchor, onClose, width = 264, children }: Props) {
  const styles = useStyles();
  const screen = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const shown = useSharedValue(0);

  useEffect(() => {
    if (anchor) shown.set(withTiming(1, { duration: 190, easing: Easing.bezier(0.2, 0.9, 0.3, 1) }));
    else shown.set(0);
  }, [anchor, shown]);

  const place = anchor ? placePopover(anchor, width, screen, insets, 320) : null;
  const style = useAnimatedStyle(() => ({ opacity: shown.get(), transform: [{ scale: 0.9 + 0.1 * shown.get() }] }));

  if (!anchor || !place) return null;
  return (
    <Modal
      transparent
      visible
      statusBarTranslucent
      navigationBarTranslucent
      animationType="none"
      onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close menu" />
      <Animated.View
        style={[
          styles.card,
          {
            width,
            left: place.left,
            maxHeight: place.maxHeight,
            transformOrigin: place.origin === 'top' ? 'top right' : 'bottom right',
          },
          place.origin === 'top' ? { top: place.top } : { bottom: place.bottom },
          style,
        ]}>
        <Animated.ScrollView bounces={false} contentContainerStyle={styles.content}>
          {children}
        </Animated.ScrollView>
      </Animated.View>
    </Modal>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    position: 'absolute',
    backgroundColor: t.colors.surface,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.divider,
    ...t.shadow.lifted,
  },
  content: { paddingVertical: 6 },
}));
