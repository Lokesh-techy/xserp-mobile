/** @author Lokesh */
import { View } from 'react-native';

import { makeStyles } from '@/core/theme';
import { ScreenHeader, StateView } from '@/ui';

/** Temporary body for module routes whose feature task has not landed yet. */
export function PendingModuleScreen({ title }: { title: string }) {
  const styles = useStyles();
  return (
    <View style={styles.root}>
      <ScreenHeader title={title} />
      <View style={styles.body}>
        <StateView icon="construct-outline" title={`${title} is being built`} message="This screen arrives in the next update." />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({ root: { flex: 1, backgroundColor: t.colors.bg }, body: { padding: t.space.gutter } }));
