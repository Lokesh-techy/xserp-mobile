/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { enter, fadeOut, makeStyles, useTheme } from '@/core/theme';

import { Text } from './text';

type ToastInput = { message: string; tone?: 'success' | 'danger' | 'info'; action?: { label: string; onPress: () => void }; durationMs?: number };
type ToastItem = ToastInput & { id: string };

const useToasts = create<{ items: ToastItem[] }>(() => ({ items: [] }));
let seq = 0;

export const toast = {
  show(input: ToastInput): string {
    const id = String(++seq);
    useToasts.setState((s) => ({ items: [...s.items.slice(-2), { ...input, id }] }));
    return id;
  },
  dismiss(id: string) {
    useToasts.setState((s) => ({ items: s.items.filter((i) => i.id !== id) }));
  },
};

function ToastRow({ item }: { item: ToastItem }) {
  const t = useTheme();
  const styles = useStyles();
  useEffect(() => {
    const timer = setTimeout(() => toast.dismiss(item.id), item.durationMs ?? 3500);
    return () => clearTimeout(timer);
  }, [item.id, item.durationMs]);
  const bg = item.tone === 'danger' ? t.colors.danger : item.tone === 'success' ? t.colors.success : t.colors.navy800;
  const icon = item.tone === 'danger' ? 'alert-circle' : item.tone === 'success' ? 'checkmark-circle' : 'information-circle';
  return (
    <Animated.View entering={enter()} exiting={fadeOut} style={[styles.toast, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={20} color={t.colors.white} />
      <Text variant="label" color={t.colors.white} style={styles.message}>
        {item.message}
      </Text>
      {item.action && (
        <Pressable
          hitSlop={10}
          onPress={() => {
            item.action?.onPress();
            toast.dismiss(item.id);
          }}>
          <Text variant="label" weight="extrabold" color={t.colors.white}>
            {item.action.label.toUpperCase()}
          </Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

/** Mount once at the root, above navigation. */
export function ToastHost() {
  const items = useToasts((s) => s.items);
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom: insets.bottom + 16 }]}>
      {items.map((i) => (
        <ToastRow key={i.id} item={i} />
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  host: { position: 'absolute', left: 16, right: 16, gap: 8 },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderRadius: t.radius.md, ...t.shadow.lifted },
  message: { flex: 1 },
}));
