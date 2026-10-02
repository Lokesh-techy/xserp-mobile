/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { memo, useMemo, useState } from 'react';
import { FlatList, Pressable, TextInput, View } from 'react-native';

import { makeStyles, useTheme } from '@/core/theme';
import { filterItems, formatQty } from '@/core/utils';
import { BottomSheet, Button, PressableScale, SearchField, Text, type PickerItem } from '@/ui';

import { parseQty, picksSummary, setPickQty, type Picks } from './material-picks';

type Props = { visible: boolean; items: PickerItem[]; onConfirm: (picks: { id: string; quantity: number }[]) => void; onClose: () => void };

/** Pick materials and their quantities in one place: ＋ to add, an inline stepper to adjust. */
export function MaterialPickerSheet({ visible, items, onConfirm, onClose }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const [query, setQuery] = useState('');
  const [picks, setPicks] = useState<Picks>({});
  const shown = useMemo(() => filterItems(items, query, (i) => [i.label, i.sublabel]), [items, query]);
  const sum = picksSummary(picks);

  const close = () => {
    setQuery('');
    onClose();
  };
  const confirm = () => {
    onConfirm(Object.entries(picks).map(([id, quantity]) => ({ id, quantity })));
    setPicks({});
    close();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={close}
      title="Add materials"
      maxHeightRatio={0.92}
      footer={
        <Button
          title={sum.items ? `Add ${sum.items} item${sum.items === 1 ? '' : 's'} · ${formatQty(sum.units)} units` : 'Tap ＋ to pick materials'}
          icon="add-circle-outline"
          disabled={sum.items === 0}
          onPress={confirm}
        />
      }>
      <View style={styles.search}>
        <SearchField value={query} onChangeText={setQuery} placeholder="Search materials" />
        {sum.items > 0 && (
          <Pressable onPress={() => setPicks({})} hitSlop={8} style={styles.clear}>
            <Text variant="caption" weight="bold" color={t.colors.accent}>
              Clear {sum.items} picked
            </Text>
          </Pressable>
        )}
      </View>
      <FlatList
        data={shown}
        keyExtractor={(i) => i.id}
        initialNumToRender={18}
        windowSize={11}
        keyboardShouldPersistTaps="handled"
        style={styles.list}
        extraData={picks}
        renderItem={({ item }) => <Row item={item} qty={picks[item.id]} onQty={(q) => setPicks((p) => setPickQty(p, item.id, q))} />}
        ListEmptyComponent={
          <Text variant="body" color={t.colors.textMuted} style={styles.empty}>
            No materials match “{query}”
          </Text>
        }
      />
    </BottomSheet>
  );
}

const Row = memo(function Row({ item, qty, onQty }: { item: PickerItem; qty: number | undefined; onQty: (q: number) => void }) {
  const t = useTheme();
  const styles = useStyles();
  const picked = qty !== undefined;
  const [text, setText] = useState<string | null>(null);
  return (
    <View style={styles.row}>
      {picked && <View style={[styles.accent, { backgroundColor: t.colors.accent }]} />}
      <View style={styles.text}>
        <Text variant="label" weight={picked ? 'bold' : 'semibold'} numberOfLines={1}>
          {item.label}
        </Text>
        {!!item.sublabel && (
          <Text variant="caption" color={t.colors.textMuted} numberOfLines={1}>
            {item.sublabel}
          </Text>
        )}
      </View>
      {picked ? (
        <View style={styles.stepper}>
          <PressableScale onPress={() => onQty(Math.round((qty - 1) * 1000) / 1000)} style={styles.stepBtn} accessibilityLabel={qty <= 1 ? `Remove ${item.label}` : `Decrease ${item.label}`}>
            <Ionicons name={qty <= 1 ? 'trash-outline' : 'remove'} size={16} color={qty <= 1 ? t.colors.danger : t.colors.text} />
          </PressableScale>
          <TextInput
            value={text ?? String(qty)}
            onChangeText={setText}
            onFocus={() => setText(String(qty))}
            onBlur={() => {
              const n = text === null ? qty : parseQty(text);
              if (n !== null) onQty(n);
              setText(null);
            }}
            keyboardType="decimal-pad"
            selectTextOnFocus
            style={[styles.qty, { color: t.colors.text, fontFamily: t.fonts.bold }]}
            accessibilityLabel={`${item.label} quantity`}
          />
          <PressableScale onPress={() => onQty(qty + 1)} style={styles.stepBtn} accessibilityLabel={`Increase ${item.label}`}>
            <Ionicons name="add" size={16} color={t.colors.text} />
          </PressableScale>
        </View>
      ) : (
        <PressableScale onPress={() => onQty(1)} style={styles.add} accessibilityLabel={`Add ${item.label}`}>
          <Ionicons name="add" size={18} color={t.colors.accent} />
        </PressableScale>
      )}
    </View>
  );
});

const useStyles = makeStyles((t) => ({
  search: { paddingHorizontal: 18, paddingBottom: 6, gap: 6 },
  clear: { alignSelf: 'flex-end', paddingHorizontal: 2 },
  list: { paddingHorizontal: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: t.colors.divider },
  accent: { position: 'absolute', left: -18, top: 10, bottom: 10, width: 3, borderRadius: 2 },
  text: { flex: 1, gap: 2 },
  add: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: t.colors.chipBorder, alignItems: 'center', justifyContent: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: t.colors.fill, borderRadius: t.radius.pill, height: 34 },
  stepBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  qty: { minWidth: 38, textAlign: 'center', fontSize: 14, paddingVertical: 0 },
  empty: { textAlign: 'center', paddingVertical: 32 },
}));
