/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { Platform, View, type ColorValue, type StyleProp, type ViewStyle } from 'react-native';

import { alpha, useTheme } from '@/core/theme';

import { Badge } from './badge';
import type { IconName } from './button';
import { PressableScale } from './pressable-scale';

// iOS 26+ Liquid Glass. Everywhere else the fallback style keeps the translucent look.
export const liquidGlass = Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

type GlassProps = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Applied only when Liquid Glass is unavailable — usually a translucent background. */
  fallbackStyle?: StyleProp<ViewStyle>;
  tint?: ColorValue;
  variant?: 'regular' | 'clear';
  interactive?: boolean;
};

export function Glass({ children, style, fallbackStyle, tint, variant = 'regular', interactive }: GlassProps) {
  if (liquidGlass) {
    return (
      <GlassView style={style} glassEffectStyle={variant} tintColor={tint} isInteractive={interactive}>
        {children}
      </GlassView>
    );
  }
  return <View style={[style, fallbackStyle]}>{children}</View>;
}

type ButtonProps = {
  icon: IconName;
  onPress: () => void;
  size?: number;
  color?: string;
  tint?: ColorValue;
  fallbackColor?: string;
  active?: boolean;
  badge?: number;
  accessibilityLabel?: string;
};

/** Round floating icon button — glass on iOS 26, translucent circle elsewhere. */
export function GlassIconButton({
  icon,
  onPress,
  size = 42,
  color = '#FFFFFF',
  tint,
  fallbackColor = alpha.glassButton,
  active,
  badge,
  accessibilityLabel,
}: ButtonProps) {
  const t = useTheme();
  const shape = {
    width: size,
    height: size,
    borderRadius: size / 2,
    alignItems: 'center',
    justifyContent: 'center',
  } as const;
  return (
    <PressableScale
      onPress={onPress}
      style={{ borderRadius: size / 2 }}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button">
      <Glass style={shape} fallbackStyle={{ backgroundColor: fallbackColor }} tint={tint} interactive>
        <Ionicons name={icon} size={Math.round(size * 0.5)} color={active ? t.colors.primary : color} />
      </Glass>
      {!!badge && <Badge count={badge} tone="primary" style={{ position: 'absolute', top: -4, right: -4 }} />}
    </PressableScale>
  );
}
