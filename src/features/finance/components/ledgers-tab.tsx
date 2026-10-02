/** @author Lokesh */
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { makeStyles, useTheme } from '@/core/theme';
import { filterItems } from '@/core/utils';
import { syncMaster, useLedgers, useMasterStore } from '@/features/master-data';
import { Card, SearchField, StateView, Text, useHostRefresh, type ScrollHost } from '@/ui';

export function LedgersTab({ host }: { host: ScrollHost }) {
  const t = useTheme();
  const styles = useStyles();
  const ledgers = useLedgers();
  const syncing = useMasterStore((s) => s.syncing.ledgers);
  const [search, setSearch] = useState('');
  useHostRefresh(host, useCallback(() => syncMaster('ledgers', { force: true }), []));
  const rows = useMemo(() => filterItems(ledgers, search, (l) => [l.name, l.group]), [ledgers, search]);
  return host.attach(
    <Animated.FlatList
      {...host.scrollProps}
      data={rows}
      keyExtractor={(l) => l.id}
      contentContainerStyle={styles.pad}
      initialNumToRender={15}
      ListHeaderComponent={
        <View style={styles.head}>
          <SearchField value={search} onChangeText={setSearch} placeholder="Search ledgers" />
          <Text variant="caption" color={t.colors.textMuted}>
            {rows.length} ledgers
          </Text>
        </View>
      }
      ListEmptyComponent={<StateView icon="book-outline" title={syncing ? 'Syncing ledgers…' : 'No ledgers'} message={syncing ? undefined : 'Pull down to sync the ledger list.'} />}
      renderItem={({ item }) => (
        <Card style={styles.card} onPress={() => router.push({ pathname: '/finance/ledger/[id]', params: { id: item.id, name: item.name, group: item.group } })}>
          <Text variant="label">{item.name}</Text>
          <Text variant="caption" color={t.colors.textMuted}>
            {item.group}
          </Text>
        </Card>
      )}
    />,
  );
}

const useStyles = makeStyles((t) => ({ pad: { padding: t.space.gutter, paddingTop: 8, paddingBottom: 48 }, head: { gap: 8, marginBottom: 12 }, card: { marginBottom: 10, gap: 2, padding: 14 } }));
