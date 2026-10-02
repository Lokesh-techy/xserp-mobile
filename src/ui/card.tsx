/** @author Lokesh */
import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { makeStyles } from '@/core/theme';

import { PressableScale } from './pressable-scale';

type Props = { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; tint?: string };

export function Card({ children, style, onPress, tint }: Props) {
  const styles = useStyles();
  const body = (
    <>
      {tint && <View style={[styles.bar, { backgroundColor: tint }]} />}
      {children}
    </>
  );
  if (onPress) {
    return (
      <PressableScale onPress={onPress} style={[styles.card, style]} scaleTo={0.985}>
        {body}
      </PressableScale>
    );
  }
  return <View style={[styles.card, style]}>{body}</View>;
}

const useStyles = makeStyles((t) => ({
  card: { backgroundColor: t.colors.surface, borderRadius: t.radius.lg, padding: t.space.lg, overflow: 'hidden', ...t.shadow.card },
  bar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
}));
