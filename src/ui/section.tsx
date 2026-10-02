/** @author Lokesh */
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { makeStyles, useTheme } from '@/core/theme';

import { Text } from './text';

export function Section({ title, action, children }: { title: string; action?: { label: string; onPress: () => void }; children: ReactNode }) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <Text variant="overline" color={t.colors.textMuted}>
          {title}
        </Text>
        {action && (
          <Pressable hitSlop={10} onPress={action.onPress}>
            <Text variant="label" color={t.colors.accent}>
              {action.label}
            </Text>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

const useStyles = makeStyles(() => ({
  root: { gap: 10, marginTop: 18 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
}));
