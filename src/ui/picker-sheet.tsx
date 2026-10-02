/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';

import { makeStyles, useTheme } from '@/core/theme';
import { filterItems } from '@/core/utils';

import { BottomSheet } from './bottom-sheet';
import { PressableScale } from './pressable-scale';
import { SearchField } from './search-field';
import { Text } from './text';

export type PickerItem = { id: string; label: string; sublabel?: string };

type Props = {
  visible: boolean;
  title: string;
  items: PickerItem[];
  selectedId?: string | null;
  onSelect: (item: PickerItem | null) => void;
  onClose: () => void;
  allowClear?: boolean;
};

export function PickerSheet({ visible, title, items, selectedId, onSelect, onClose, allowClear = true }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const [query, setQuery] = useState('');
  const shown = useMemo(() => filterItems(items, query, (i) => [i.label, i.sublabel, i.id]), [items, query]);

  const choose = (item: PickerItem | null) => {
    onSelect(item);
    setQuery('');
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title} maxHeightRatio={0.9}>
      <View style={styles.search}>
        <SearchField value={query} onChangeText={setQuery} placeholder={`Search ${title.toLowerCase()}`} />
      </View>
      {allowClear && !!selectedId && (
        <PressableScale onPress={() => choose(null)} style={styles.row}>
          <Text variant="label" color={t.colors.danger}>
            Clear selection
          </Text>
        </PressableScale>
      )}
      <FlatList
        data={shown}
        keyExtractor={(i) => i.id}
        initialNumToRender={20}
        keyboardShouldPersistTaps="handled"
        style={styles.list}
        renderItem={({ item }) => (
          <PressableScale onPress={() => choose(item)} style={styles.row} scaleTo={0.99}>
            <View style={styles.text}>
              <Text variant="label" numberOfLines={1}>
                {item.label}
              </Text>
              {!!item.sublabel && (
                <Text variant="caption" color={t.colors.textMuted} numberOfLines={1}>
                  {item.sublabel}
                </Text>
              )}
            </View>
            {item.id === selectedId && <Ionicons name="checkmark-circle" size={20} color={t.colors.accent} />}
          </PressableScale>
        )}
        ListEmptyComponent={
          <Text variant="body" color={t.colors.textMuted} style={styles.empty}>
            No matches
          </Text>
        }
      />
    </BottomSheet>
  );
}

const useStyles = makeStyles((t) => ({
  search: { paddingHorizontal: 18, paddingBottom: 10 },
  list: { paddingHorizontal: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: t.colors.divider },
  text: { flex: 1, gap: 2 },
  empty: { textAlign: 'center', paddingVertical: 32 },
}));
