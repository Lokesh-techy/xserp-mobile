/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { Pressable, TextInput, View } from 'react-native';

import { makeStyles, useTheme } from '@/core/theme';

type Props = { value: string; onChangeText: (s: string) => void; placeholder?: string; autoFocus?: boolean };

export function SearchField({ value, onChangeText, placeholder = 'Search', autoFocus }: Props) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.box}>
      <Ionicons name="search-outline" size={18} color={t.colors.textFaint} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.colors.textFaint}
        autoFocus={autoFocus}
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
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  box: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 50, paddingHorizontal: 16, borderRadius: t.radius.md, backgroundColor: t.colors.surface, ...t.shadow.card },
  input: { flex: 1, fontFamily: t.fonts.medium, fontSize: 14, color: t.colors.text },
}));
