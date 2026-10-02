/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { makeStyles, useTheme } from '@/core/theme';
import { PressableScale, Text, withPressFeel } from '@/ui';

/**
 * The app's signature action: one solid navy pill — label, then an arrow in a white disc.
 * No gradient or decoration; the shape and contrast carry it.
 */
export function ReviewButton({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <PressableScale onPress={withPressFeel(onPress)} haptic={false} scaleTo={0.96} style={styles.pill} accessibilityRole="button" accessibilityLabel={label}>
      <Animated.View layout={LinearTransition.duration(180)} style={styles.inner}>
        <Text variant="label" weight="bold" color={t.colors.white} numberOfLines={1}>
          {label}
        </Text>
        <Animated.View style={styles.disc}>
          <Ionicons name="arrow-forward" size={16} color={t.colors.primary} />
        </Animated.View>
      </Animated.View>
    </PressableScale>
  );
}

const useStyles = makeStyles((t) => ({
  pill: { borderRadius: t.radius.pill, backgroundColor: t.colors.primary, alignSelf: 'center' },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 40, paddingLeft: 16, paddingRight: 4 },
  disc: { width: 32, height: 32, borderRadius: 16, backgroundColor: t.colors.white, alignItems: 'center', justifyContent: 'center' },
}));
