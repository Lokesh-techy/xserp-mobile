/** @author Lokesh */
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  FadeIn,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { makeStyles, useTheme } from '@/core/theme';

import { Text } from '../text';

type Props = {
  /** `generating` while the server builds and sends the file; `rendering` once it's here and pages are being laid out. */
  phase: 'generating' | 'rendering';
  /** e.g. "248 KB", once known. */
  size?: string;
  /** An uploaded attachment is fetched, not generated. */
  attachment?: boolean;
};

const A4 = 1.414;

// The page's skeleton, top to bottom: [width as a fraction of the line, emphasis].
// Letterhead, title, a table of line items, then the total — the shape of an ERP document.
const LINES: { w: number; strong?: boolean; right?: boolean; gapAbove?: number }[] = [
  { w: 0.42, strong: true },
  { w: 0.28 },
  { w: 0.62, strong: true, gapAbove: 14 },
  { w: 0.9, gapAbove: 10 },
  { w: 0.84 },
  { w: 0.9 },
  { w: 0.78 },
  { w: 0.88 },
  { w: 0.36, strong: true, right: true, gapAbove: 10 },
];
const CYCLE = 2600;
const STEP = 0.075; // each line starts this much after the one before
const DRAW = 0.22; // and takes this long to draw

/**
 * "Your PDF is being composed": a sheet at the document's own proportions whose lines draw in, left to right,
 * one after another, with a slow sheen passing over it. Fades out as the real pages take its place.
 */
export function PdfComposing({ phase, size, attachment }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const { width } = useWindowDimensions();
  const paperW = Math.min(width * 0.6, 250);
  const p = useSharedValue(0);
  const sheen = useSharedValue(0);

  useEffect(() => {
    p.set(withRepeat(withTiming(1, { duration: CYCLE, easing: Easing.inOut(Easing.quad) }), -1, false));
    sheen.set(withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }), -1, false));
    return () => {
      cancelAnimation(p);
      cancelAnimation(sheen);
    };
  }, [p, sheen]);

  const sheenStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(sheen.get(), [0, 1], [-paperW, paperW * 1.6]) }, { rotate: '18deg' }],
  }));

  return (
    <Animated.View entering={FadeIn.duration(260)} style={styles.root} pointerEvents="none">
      <View style={[styles.paper, { width: paperW, height: paperW * A4 }]}>
        <View style={styles.head}>
          <View style={styles.logo} />
          <View style={styles.headLines}>
            <Line p={p} i={0} w={0.7} right strong />
            <Line p={p} i={1} w={0.5} right />
          </View>
        </View>
        {LINES.map((l, i) => (
          <Line key={i} p={p} i={i + 2} w={l.w} strong={l.strong} right={l.right} gapAbove={l.gapAbove} />
        ))}
        <Animated.View style={[styles.sheen, sheenStyle]}>
          <LinearGradient
            colors={['transparent', t.dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
      <View style={styles.caption}>
        <Text variant="heading">
          {phase === 'rendering' ? 'Opening document' : attachment ? 'Fetching attachment' : 'Generating PDF'}
        </Text>
        <Status phase={phase} size={size} attachment={attachment} />
      </View>
    </Animated.View>
  );
}

function Line({
  p,
  i,
  w,
  strong,
  right,
  gapAbove,
}: {
  p: SharedValue<number>;
  i: number;
  w: number;
  strong?: boolean;
  right?: boolean;
  gapAbove?: number;
}) {
  const styles = useStyles();
  const style = useAnimatedStyle(() => {
    const start = i * STEP;
    const drawn = interpolate(p.get(), [start, start + DRAW], [0, 1], Extrapolation.CLAMP);
    // The whole page fades out together at the end of a cycle, then composes again.
    const fade = interpolate(p.get(), [0.86, 1], [1, 0], Extrapolation.CLAMP);
    return { opacity: fade, transform: [{ scaleX: drawn }] };
  });
  return (
    <Animated.View
      style={[
        styles.line,
        strong && styles.strong,
        { width: `${w * 100}%`, alignSelf: right ? 'flex-end' : 'flex-start', marginTop: gapAbove ?? 7 },
        { transformOrigin: right ? 'right' : 'left' },
        style,
      ]}
    />
  );
}

/** One quiet line of status that changes as the work moves along. */
function Status({ phase, size, attachment }: Props) {
  const t = useTheme();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (phase !== 'generating') return;
    const id = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(id);
  }, [phase]);
  const text =
    phase === 'rendering'
      ? [size, 'laying out pages'].filter(Boolean).join(' · ')
      : slow
        ? 'Large documents take a few seconds'
        : attachment
          ? 'Downloading the uploaded file'
          : 'Preparing the latest copy';
  return (
    <Animated.View key={text} entering={FadeIn.duration(240)}>
      <Text variant="caption" color={t.colors.textMuted} style={{ textAlign: 'center' }}>
        {text}
      </Text>
    </Animated.View>
  );
}

const useStyles = makeStyles((t) => ({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
    backgroundColor: t.colors.bg,
  },
  paper: {
    backgroundColor: t.dark ? t.colors.surface : '#FFFFFF',
    borderRadius: 6,
    padding: 18,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
    ...t.shadow.lifted,
    shadowOpacity: t.dark ? 0.4 : 0.12,
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  logo: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: t.dark ? t.colors.accent : t.colors.primary,
    opacity: 0.85,
  },
  headLines: { flex: 1 },
  line: { height: 5, borderRadius: 3, backgroundColor: t.colors.bone },
  strong: { height: 7, backgroundColor: t.dark ? t.colors.chipBorder : '#D6DEEA' },
  sheen: { position: 'absolute', top: -40, bottom: -40, width: 70 },
  caption: { alignItems: 'center', gap: 4 },
}));
