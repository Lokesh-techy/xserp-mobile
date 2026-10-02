/** @author Lokesh */
import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { makeStyles, springs } from '@/core/theme';

import { Text } from './text';

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxHeightRatio?: number;
};

export function BottomSheet({ visible, onClose, title, children, maxHeightRatio = 0.88 }: Props) {
  const styles = useStyles();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const y = useSharedValue(height);
  const backdrop = useSharedValue(0);

  // Mount as soon as it becomes visible; unmount only after the exit animation finishes.
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      y.set(withSpring(0, springs.gentle));
      backdrop.set(withTiming(1, { duration: 260 }));
    } else {
      backdrop.set(withTiming(0, { duration: 220 }));
      y.set(
        withTiming(height, { duration: 260, easing: Easing.in(Easing.cubic) }, (done) => {
          if (done) scheduleOnRN(setMounted, false);
        }),
      );
    }
  }, [visible, height, y, backdrop]);

  const pan = Gesture.Pan()
    .activeOffsetY(8)
    .onChange((e) => {
      y.set(Math.max(0, y.get() + e.changeY));
    })
    .onEnd((e) => {
      if (y.get() > 140 || e.velocityY > 900) scheduleOnRN(onClose);
      else y.set(withSpring(0, springs.snappy));
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.get() }));

  if (!mounted) return null;

  return (
    <Modal transparent visible statusBarTranslucent navigationBarTranslucent animationType="none" onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.flex}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        </Animated.View>
        <Animated.View style={[styles.sheet, { maxHeight: height * maxHeightRatio, paddingBottom: Math.max(insets.bottom, 16) }, sheetStyle]}>
          <GestureDetector gesture={pan}>
            <View style={styles.handleArea}>
              <View style={styles.handle} />
              {!!title && (
                <Text variant="title" style={styles.title}>
                  {title}
                </Text>
              )}
            </View>
          </GestureDetector>
          {children}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  backdrop: { backgroundColor: t.alpha.backdrop },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: t.colors.surface,
    borderTopLeftRadius: t.radius.xl,
    borderTopRightRadius: t.radius.xl,
  },
  handleArea: { paddingTop: 10, paddingBottom: 8 },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: t.colors.handle },
  title: { paddingHorizontal: 20, paddingTop: 10 },
}));
