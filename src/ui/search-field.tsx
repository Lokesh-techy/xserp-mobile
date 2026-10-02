/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { markActive } from '@/core/auth/idle-timeout';
import { makeStyles, useTheme } from '@/core/theme';

type Props = {
  value: string;
  onChangeText: (s: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  /** `filled` for use inside sheets: a tinted well with an accent ring while typing, so it stands out. */
  variant?: 'card' | 'filled';
};

export function SearchField({ value, onChangeText, placeholder = 'Search', autoFocus, variant = 'card' }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const [focused, setFocused] = useState(false);
  const filled = variant === 'filled';
  return (
    <View style={[styles.box, filled && styles.filled, filled && focused && styles.focused]}>
      <Ionicons name="search" size={filled ? 20 : 18} color={focused ? t.colors.accent : t.colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={(text) => {
          markActive();
          onChangeText(text);
        }}
        placeholder={placeholder}
        placeholderTextColor={t.colors.textFaint}
        autoFocus={autoFocus}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.input, filled && styles.inputFilled]}
      />
      {!!value && (
        <Pressable hitSlop={10} onPress={() => onChangeText('')} accessibilityLabel="Clear search">
          <Ionicons name="close-circle" size={18} color={t.colors.textFaint} />
        </Pressable>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
    paddingHorizontal: 16,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.surface,
    ...t.shadow.card,
  },
  filled: {
    height: 52,
    backgroundColor: t.colors.fill,
    borderWidth: 1.5,
    borderColor: t.colors.fill,
    shadowOpacity: 0,
    elevation: 0,
  },
  focused: { borderColor: t.colors.accent, backgroundColor: t.colors.surface },
  input: { flex: 1, fontFamily: t.fonts.medium, fontSize: 14, color: t.colors.text },
  inputFilled: { fontSize: 16, fontFamily: t.fonts.semibold },
}));
