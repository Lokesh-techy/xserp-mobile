/** @author Lokesh */
import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { makeStyles, useTheme } from '@/core/theme';

// Where the aurora's glows sit (in % of the card) and how far each reaches: the largest top-right behind the
// headline, the others low in the corners so whatever sits below stays calm.
const GLOWS = [
  { cx: '92%', cy: '6%', r: '62%' },
  { cx: '4%', cy: '100%', r: '48%' },
  { cx: '70%', cy: '108%', r: '38%' },
] as const;

/** How many colours the aurora uses. */
export const AURORA_TINT_COUNT = GLOWS.length;

/**
 * A card's quiet backdrop, clipped to its corners: a faint wash of light across the top, and an aurora of up
 * to three colours (largest first) so the card takes on the hue of what it shows. Touches pass through.
 */
export function AuroraBackdrop({ tints }: { tints: string[] }) {
  const t = useTheme();
  const styles = useStyles();
  const strength = t.dark ? 0.2 : 0.26;
  return (
    <View pointerEvents="none" style={styles.backdrop}>
      <Svg width="100%" height="100%">
        <Defs>
          {GLOWS.map((_, i) => (
            <RadialGradient key={i} id={`aurora-${i}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={tints[i] ?? t.colors.accent} stopOpacity={strength * (1 - i * 0.2)} />
              <Stop offset="1" stopColor={tints[i] ?? t.colors.accent} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        {GLOWS.map((g, i) => (
          <Circle key={i} cx={g.cx} cy={g.cy} r={g.r} fill={`url(#aurora-${i})`} />
        ))}
      </Svg>
      <LinearGradient
        colors={t.dark ? ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0)'] : ['rgba(255,255,255,0.3)', 'rgba(255,255,255,0)']}
        style={styles.topLight}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: t.radius.lg, overflow: 'hidden' },
  topLight: { position: 'absolute', top: 0, left: 0, right: 0, height: 56 },
}));
