/** @author Lokesh */
import { formatDistanceToNow } from 'date-fns';
import { ActivityIndicator, View } from 'react-native';

import { makeStyles, useTheme } from '@/core/theme';
import { MASTER_KINDS, MASTER_LABELS, syncAllMasters, useMasterStore } from '@/features/master-data';
import { Button, Card, Text } from '@/ui';

/** Count, last-sync time and errors for each cached master list, with "Sync now". */
export function SyncStatus() {
  const t = useTheme();
  const styles = useStyles();
  const st = useMasterStore();
  return (
    <Card style={styles.card}>
      {MASTER_KINDS.map((k) => (
        <View key={k} style={styles.row}>
          <View style={styles.flex}>
            <Text variant="label">{MASTER_LABELS[k]}</Text>
            <Text variant="caption" color={st.error[k] ? t.colors.danger : t.colors.textMuted}>
              {st.error[k] ?? (st.syncedAt[k] ? `${st.data[k].length} · synced ${formatDistanceToNow(st.syncedAt[k]!, { addSuffix: true })}` : 'Not synced yet')}
            </Text>
          </View>
          {st.syncing[k] && <ActivityIndicator color={t.colors.accent} />}
        </View>
      ))}
      <Button title="Sync now" icon="sync-outline" variant="ghost" size="sm" onPress={() => syncAllMasters({ force: true })} />
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  card: { gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: t.colors.divider },
  flex: { flex: 1, gap: 2 },
}));
