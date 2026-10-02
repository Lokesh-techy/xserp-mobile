/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';

import { makeStyles, useTheme } from '@/core/theme';
import { filterItems } from '@/core/utils';

import { BottomSheet } from './bottom-sheet';
import { Button } from './button';
import { togglePick } from './picker-selection';
import { PressableScale } from './pressable-scale';
import { SearchField } from './search-field';
import { Text } from './text';

export type PickerItem = { id: string; label: string; sublabel?: string };

type Common = { visible: boolean; title: string; items: PickerItem[]; onClose: () => void };
type Single = Common & { multiple?: false; selectedId?: string | null; onSelect: (item: PickerItem | null) => void; allowClear?: boolean };
type Multi = Common & { multiple: true; initial?: string[]; confirmLabel?: (n: number) => string; onConfirm: (items: PickerItem[]) => void };

/**
 * The one dropdown used everywhere: searchable, virtualised, aligned rows (name over detail), clear
 * selection state. `multiple` lets the user tick several rows and confirm once (e.g. materials).
 */
export function PickerSheet(props: Single | Multi) {
  const t = useTheme();
  const styles = useStyles();
  const { visible, title, items, onClose } = props;
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string[]>(props.multiple ? (props.initial ?? []) : []);
  const shown = useMemo(() => filterItems(items, query, (i) => [i.label, i.sublabel, i.id]), [items, query]);
  const selectedId = props.multiple ? null : props.selectedId;

  const close = () => {
    setQuery('');
    onClose();
  };
  const choose = (item: PickerItem | null) => {
    if (props.multiple) return;
    props.onSelect(item);
    close();
  };
  const confirm = () => {
    if (!props.multiple) return;
    const byId = new Map(items.map((i) => [i.id, i]));
    props.onConfirm(picked.map((id) => byId.get(id)).filter((i): i is PickerItem => !!i));
    setPicked([]);
    close();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={close}
      title={title}
      maxHeightRatio={0.92}
      footer={props.multiple ? <Button title={props.confirmLabel ? props.confirmLabel(picked.length) : `Add ${picked.length}`} icon="add-circle-outline" disabled={picked.length === 0} onPress={confirm} /> : undefined}>
      <View style={styles.search}>
        <SearchField value={query} onChangeText={setQuery} placeholder={`Search ${title.toLowerCase()}`} />
        <View style={styles.meta}>
          <Text variant="caption" color={t.colors.textMuted}>
            {shown.length === items.length ? `${items.length} ${items.length === 1 ? 'option' : 'options'}` : `${shown.length} of ${items.length}`}
          </Text>
          {props.multiple && picked.length > 0 && (
            <PressableScale onPress={() => setPicked([])} hitSlop={8}>
              <Text variant="caption" weight="bold" color={t.colors.accent}>
                Clear {picked.length} selected
              </Text>
            </PressableScale>
          )}
          {!props.multiple && props.allowClear !== false && !!selectedId && (
            <PressableScale onPress={() => choose(null)} hitSlop={8}>
              <Text variant="caption" weight="bold" color={t.colors.danger}>
                Clear selection
              </Text>
            </PressableScale>
          )}
        </View>
      </View>
      <FlatList
        data={shown}
        keyExtractor={(i) => i.id}
        initialNumToRender={20}
        windowSize={11}
        keyboardShouldPersistTaps="handled"
        style={styles.list}
        renderItem={({ item }) => {
          const on = props.multiple ? picked.includes(item.id) : item.id === selectedId;
          return (
            <PressableScale onPress={() => (props.multiple ? setPicked((p) => togglePick(p, item.id)) : choose(item))} style={[styles.row, on && styles.rowOn]} scaleTo={0.99} accessibilityRole={props.multiple ? 'checkbox' : 'button'} accessibilityState={{ checked: on }}>
              <View style={styles.text}>
                <Text variant="label" weight={on ? 'bold' : 'semibold'} numberOfLines={1}>
                  {item.label}
                </Text>
                {!!item.sublabel && (
                  <Text variant="caption" color={t.colors.textMuted} numberOfLines={1}>
                    {item.sublabel}
                  </Text>
                )}
              </View>
              {props.multiple ? (
                <Ionicons name={on ? 'checkbox' : 'square-outline'} size={22} color={on ? t.colors.accent : t.colors.textFaint} />
              ) : (
                on && <Ionicons name="checkmark-circle" size={22} color={t.colors.accent} />
              )}
            </PressableScale>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={22} color={t.colors.textFaint} />
            <Text variant="body" color={t.colors.textMuted}>
              No matches for “{query}”
            </Text>
          </View>
        }
      />
    </BottomSheet>
  );
}

const useStyles = makeStyles((t) => ({
  search: { paddingHorizontal: 18, paddingBottom: 6, gap: 8 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 20, paddingHorizontal: 2 },
  list: { paddingHorizontal: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 10, paddingHorizontal: 10, borderRadius: t.radius.sm },
  rowOn: { backgroundColor: t.colors.primarySoft },
  text: { flex: 1, gap: 2 },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 36 },
}));
