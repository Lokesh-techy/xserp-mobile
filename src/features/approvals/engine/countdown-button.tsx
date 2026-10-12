/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { makeStyles } from '@/core/theme';
import { PressableScale, Text } from '@/ui';

/** `Approve` → `Approving`, `Reject` → `Rejecting`, `Return GRN` → `Returning GRN`. */
export function progressive(label: string): string {
  const [verb = '', ...rest] = label.trim().split(' ');
  const stem = /[^e]e$/i.test(verb) ? verb.slice(0, -1) : verb;
  return [`${stem}ing`, ...rest].join(' ');
}

type Props = {
  /** The action's label, e.g. "Approve": once the time is up the button reads "Approving…". */
  label: string;
  /** The countdown length — the action is sent when it runs out. */
  ms: number;
  tone: { bg: string; fg: string };
  size: 'pill' | 'block';
  onCancel: () => void;
  a11y: string;
};

/**
 * A scheduled action shown as a timer: the button fills with its colour over `ms` and reads "Cancel" —
 * a tap stops it. Once the time is up it reads "Approving…" (from `label`) until the caller unmounts it.
 */
export function CountdownButton({ label, ms, tone, size, onCancel, a11y }: Props) {
  const styles = useStyles();
  const progress = useSharedValue(0);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    progress.set(withTiming(1, { duration: ms, easing: Easing.linear }));
    const timer = setTimeout(() => setSending(true), ms);
    return () => {
      clearTimeout(timer);
      cancelAnimation(progress);
    };
  }, [ms, progress]);

  const fill = useAnimatedStyle(() => ({ width: `${progress.get() * 100}%` }));
  const pill = size === 'pill';

  return (
    <PressableScale
      onPress={onCancel}
      disabled={sending}
      haptic
      scaleTo={0.96}
      style={[pill ? styles.pill : styles.block, { backgroundColor: tone.bg }]}
      accessibilityRole="button"
      accessibilityLabel={sending ? `${progressive(label)} ${a11y.slice(label.length).trim()}` : `Cancel ${a11y}`}
      accessibilityLiveRegion="polite">
      <View style={[StyleSheet.absoluteFill, pill ? styles.clipPill : styles.clipBlock]} pointerEvents="none">
        <Animated.View style={[styles.fill, { backgroundColor: `${tone.fg}33` }, fill]} />
      </View>
      <Ionicons name={sending ? 'paper-plane-outline' : 'close'} size={pill ? 16 : 18} color={tone.fg} />
      <Text variant={pill ? 'label' : 'heading'} weight="bold" color={tone.fg} numberOfLines={1}>
        {sending ? `${progressive(label)}…` : 'Cancel'}
      </Text>
    </PressableScale>
  );
}

const useStyles = makeStyles((t) => ({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingLeft: 14,
    paddingRight: 16,
    borderRadius: t.radius.pill,
    minWidth: 104,
    justifyContent: 'center',
  },
  block: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: t.radius.md,
  },
  clipPill: { borderRadius: t.radius.pill, overflow: 'hidden' },
  clipBlock: { borderRadius: t.radius.md, overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
}));
