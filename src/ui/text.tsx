/** @author Lokesh */
import { Platform, Text as RNText, StyleSheet, type TextProps } from 'react-native';

import { useTheme, type Fonts } from '@/core/theme';

export type TextVariant = 'display' | 'title' | 'heading' | 'body' | 'label' | 'caption' | 'overline';

const variants: Record<
  TextVariant,
  { fontSize: number; lineHeight: number; weight: keyof Fonts; letterSpacing?: number }
> = {
  display: { fontSize: 30, lineHeight: 36, weight: 'extrabold', letterSpacing: -0.6 },
  title: { fontSize: 22, lineHeight: 28, weight: 'bold', letterSpacing: -0.3 },
  heading: { fontSize: 16, lineHeight: 22, weight: 'bold', letterSpacing: -0.1 },
  body: { fontSize: 14, lineHeight: 20, weight: 'medium' },
  label: { fontSize: 13, lineHeight: 18, weight: 'semibold' },
  caption: { fontSize: 12, lineHeight: 16, weight: 'medium' },
  overline: { fontSize: 11, lineHeight: 14, weight: 'bold', letterSpacing: 1.2 },
};

type Props = TextProps & { variant?: TextVariant; color?: string; weight?: keyof Fonts };

export function Text({ variant = 'body', color, weight, style, children, ...rest }: Props) {
  const t = useTheme();
  const v = variants[variant];
  const spacing = StyleSheet.flatten(style)?.letterSpacing ?? v.letterSpacing ?? 0;
  return (
    <RNText
      {...rest}
      style={[
        {
          fontSize: v.fontSize,
          lineHeight: v.lineHeight,
          letterSpacing: v.letterSpacing,
          color: color ?? t.colors.text,
          fontFamily: t.fonts[weight ?? v.weight],
        },
        style,
        // Android measures letter-spaced text (with custom fonts) too narrowly and clips the last glyphs
        // ("XSER", "SCHNELL ENERG"). Trailing room equal to the spacing keeps every character visible.
        Platform.OS === 'android' && spacing > 0 && { paddingRight: Math.ceil(spacing) + 2 },
      ]}>
      {variant === 'overline' ? upper(children) : children}
    </RNText>
  );
}

// Android measures `textTransform: 'uppercase'` at lowercase width and clips, so upper-case the string.
function upper(node: TextProps['children']): TextProps['children'] {
  if (typeof node === 'string') return node.toUpperCase();
  if (Array.isArray(node))
    return node.map((n: unknown) => (typeof n === 'string' ? n.toUpperCase() : n)) as TextProps['children'];
  return node;
}
