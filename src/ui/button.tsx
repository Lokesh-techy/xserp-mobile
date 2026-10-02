/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { makeStyles, useTheme } from '@/core/theme';

import { MorphLoaderLabel } from './morph-loader-label';
import { PressableScale } from './pressable-scale';

export type IconName = keyof typeof Ionicons.glyphMap;

type Props = {
  title: string;
  /** Return a promise to show a spinner and stay disabled until it settles. */
  onPress: () => void | Promise<unknown>;
  variant?: 'primary' | 'ghost' | 'danger' | 'success';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  size?: 'md' | 'sm';
  style?: StyleProp<ViewStyle>;
  onLongPress?: () => void;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading: loadingProp,
  disabled,
  size = 'md',
  style,
  onLongPress,
}: Props) {
  const t = useTheme();
  const styles = useStyles();
  const [running, setRunning] = useState(false);
  const loading = loadingProp || running;
  const inactive = disabled || loading;
  const filled = variant === 'primary' || variant === 'success';
  const fg = filled ? t.colors.white : variant === 'danger' ? t.colors.danger : t.colors.onPrimarySoft;

  const handlePress = () => {
    const result = onPress();
    if (result instanceof Promise) {
      setRunning(true);
      return result.finally(() => setRunning(false));
    }
  };

  // While working, the label's own letters gather into a spinning ring (MorphLoaderLabel).
  const content = (
    <View style={styles.row}>
      {icon && !loading && <Ionicons name={icon} size={size === 'sm' ? 16 : 18} color={fg} />}
      <MorphLoaderLabel title={title} loading={loading} color={fg} variant={size === 'sm' ? 'label' : 'heading'} />
    </View>
  );

  return (
    <PressableScale
      onPress={handlePress}
      onLongPress={onLongPress}
      disabled={inactive}
      scaleTo={0.98}
      style={[
        styles.base,
        size === 'sm' && styles.sm,
        !filled && styles[variant === 'danger' ? 'danger' : 'ghost'],
        inactive && styles.inactive,
        style,
      ]}>
      {filled ? (
        <LinearGradient
          colors={variant === 'success' ? t.gradients.success : t.gradients.accent}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fill}>
          {content}
        </LinearGradient>
      ) : (
        <View style={styles.fill}>{content}</View>
      )}
    </PressableScale>
  );
}

const useStyles = makeStyles((t) => ({
  base: { height: 56, borderRadius: t.radius.md, overflow: 'hidden', ...t.shadow.button },
  sm: { height: 42, borderRadius: t.radius.sm },
  ghost: { backgroundColor: t.colors.primarySoft, shadowOpacity: 0, elevation: 0 },
  danger: { backgroundColor: t.colors.dangerSoft, shadowOpacity: 0, elevation: 0 },
  inactive: { opacity: 0.7 },
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
}));
