/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { Pressable, TextInput } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { markActive } from '@/core/auth/idle-timeout';
import { makeStyles, useTheme } from '@/core/theme';

const RANGE = 72; // scroll distance over which the bar slims down

type Props = { value: string; onChangeText: (s: string) => void; placeholder: string; scrollY: SharedValue<number> };

/** Search pinned under the header: full size at the top, a slim bar once you scroll — always there to type. */
export function CollapsingSearch({ value, onChangeText, placeholder, scrollY }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const wrap = useAnimatedStyle(() => {
    const p = interpolate(scrollY.get(), [0, RANGE], [0, 1], Extrapolation.CLAMP);
    return { paddingTop: 10 - 4 * p, paddingBottom: 10 - 4 * p };
  });
  const box = useAnimatedStyle(() => {
    const p = interpolate(scrollY.get(), [0, RANGE], [0, 1], Extrapolation.CLAMP);
    return { height: 48 - 12 * p, borderRadius: 14 - 2 * p, shadowOpacity: 0.08 * (1 - p) };
  });
  return (
    <Animated.View style={[styles.wrap, wrap]}>
      <Animated.View style={[styles.box, box]}>
        <Ionicons name="search-outline" size={17} color={t.colors.textFaint} />
        <TextInput
          value={value}
          onChangeText={(s) => {
            markActive();
            onChangeText(s);
          }}
          placeholder={placeholder}
          placeholderTextColor={t.colors.textFaint}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          style={styles.input}
        />
        {!!value && (
          <Pressable hitSlop={10} onPress={() => onChangeText('')} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={t.colors.textFaint} />
          </Pressable>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: { paddingHorizontal: t.space.gutter, backgroundColor: t.colors.bg, zIndex: 2 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    backgroundColor: t.colors.surface,
    ...t.shadow.card,
  },
  input: { flex: 1, fontFamily: t.fonts.medium, fontSize: 14, color: t.colors.text, paddingVertical: 0 },
}));
