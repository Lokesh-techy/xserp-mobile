/** @author Lokesh */
import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/theme';

// Porcelain base: a long, even fall from near-white to a soft cool grey — no pattern, nothing to band or shimmer.
const BASE = {
  light: ['#FCFDFE', '#F5F7FA', '#EEF1F6'] as const,
  dark: ['#0E1626', '#0A111D', '#070C16'] as const,
};
// A satin sheen across the top-left, the way light sits on lacquer. Barely there.
const SHEEN = {
  light: ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0)'] as const,
  dark: ['rgba(120,160,230,0.06)', 'rgba(120,160,230,0)'] as const,
};

/** Calm, even page background for the dashboard. Static, and touches pass straight through. */
export const SatinBackground = memo(function SatinBackground() {
  const t = useTheme();
  const scheme = t.dark ? 'dark' : 'light';
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={BASE[scheme]} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={SHEEN[scheme]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.9, y: 0.6 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
});
