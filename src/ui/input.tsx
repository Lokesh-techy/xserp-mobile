/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useState } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { markActive } from '@/core/auth/idle-timeout';
import { makeStyles, useTheme } from '@/core/theme';
import { tapFeedback } from '@/core/utils';

import type { IconName } from './button';
import { Text } from './text';

type Props = TextInputProps & {
  label: string;
  icon: IconName;
  secure?: boolean;
  error?: string | null;
  required?: boolean;
};

export const Input = forwardRef<TextInput, Props>(function Input(
  { label, icon, secure, error, required, onFocus, onBlur, onChangeText, ...rest },
  ref,
) {
  const t = useTheme();
  const styles = useStyles();
  const focus = useSharedValue(0);
  const [hidden, setHidden] = useState(true);
  const [focused, setFocused] = useState(false);
  const rest0 = error ? t.colors.danger : t.colors.border;
  const { accent, fillSubtle, surface } = t.colors;

  const boxStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.get(), [0, 1], [rest0, accent]),
    backgroundColor: interpolateColor(focus.get(), [0, 1], [fillSubtle, surface]),
    shadowOpacity: focus.get() * 0.16,
  }));

  return (
    <View style={styles.root}>
      <Text variant="label" color={t.colors.textMuted}>
        {label}
        {required && (
          <Text variant="label" color={t.colors.danger}>
            {' '}
            ✱
          </Text>
        )}
      </Text>
      <Animated.View style={[styles.box, boxStyle]}>
        <Ionicons name={icon} size={18} color={focused ? t.colors.onPrimarySoft : t.colors.textFaint} />
        <TextInput
          ref={ref}
          {...rest}
          accessibilityLabel={label}
          onChangeText={(text) => {
            // Typing is activity too (the root touch handler never sees the keyboard).
            markActive();
            onChangeText?.(text);
          }}
          secureTextEntry={secure && hidden}
          placeholderTextColor={t.colors.textFaint}
          style={styles.input}
          onFocus={(e) => {
            setFocused(true);
            focus.set(withTiming(1, { duration: 220 }));
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            focus.set(withTiming(0, { duration: 220 }));
            onBlur?.(e);
          }}
        />
        {secure && (
          <Pressable
            hitSlop={12}
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            onPress={() => {
              tapFeedback();
              setHidden((h) => !h);
            }}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={19} color={t.colors.textMuted} />
          </Pressable>
        )}
      </Animated.View>
      {!!error && (
        <Text variant="caption" color={t.colors.danger}>
          {error}
        </Text>
      )}
    </View>
  );
});

const useStyles = makeStyles((t) => ({
  root: { gap: 8 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 54,
    paddingHorizontal: 16,
    borderRadius: t.radius.md,
    borderWidth: 1.5,
    shadowColor: t.colors.accent,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  input: {
    flex: 1,
    fontFamily: t.fonts.semibold,
    fontSize: 15,
    color: t.colors.text,
    paddingVertical: 6,
    minHeight: 54,
  },
}));
