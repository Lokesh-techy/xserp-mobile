/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { makeStyles, useTheme } from '@/core/theme';

import { Button, type IconName } from './button';
import { Text } from './text';

type Props = { icon: IconName; title: string; message?: string; action?: { label: string; onPress: () => void } };

export function StateView({ icon, title, message, action }: Props) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.card}>
      <View style={styles.iconTile}>
        <Ionicons name={icon} size={28} color={t.colors.onPrimarySoft} />
      </View>
      <Text variant="heading" style={styles.center}>
        {title}
      </Text>
      {!!message && (
        <Text variant="body" color={t.colors.textMuted} style={styles.center}>
          {message}
        </Text>
      )}
      {action && <Button title={action.label} variant="ghost" size="sm" onPress={action.onPress} style={styles.action} />}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: { backgroundColor: t.colors.surface, borderRadius: t.radius.lg, padding: 24, alignItems: 'center', gap: 10, ...t.shadow.card },
  iconTile: { width: 60, height: 60, borderRadius: t.radius.lg, backgroundColor: t.colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  center: { textAlign: 'center' },
  action: { alignSelf: 'stretch', marginTop: 6 },
}));
