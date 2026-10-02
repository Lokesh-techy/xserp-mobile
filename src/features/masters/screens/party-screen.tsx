/** @author Lokesh */
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { useCallback } from 'react';
import { Linking, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { makeStyles, useTheme } from '@/core/theme';
import { Card, KeyValue, ModuleScreen, PressableScale, QueryState, Section, StatusPill, Text, toast, useHostRefresh, type IconName, type ScrollHost } from '@/ui';
import { Ionicons } from '@expo/vector-icons';

import { fetchPartyDetail } from '../api';
import { mastersKeys } from '../keys';

export function PartyScreen({ id }: { id: string }) {
  return <ModuleScreen title="Party">{(host) => <Body host={host} id={id} />}</ModuleScreen>;
}

function ActionRow({ icon, label, value, onPress }: { icon: IconName; label: string; value: string; onPress: () => void }) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <PressableScale onPress={onPress} style={styles.action}>
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={18} color={t.colors.onPrimarySoft} />
      </View>
      <View style={styles.flex}>
        <Text variant="caption" color={t.colors.textMuted}>
          {label}
        </Text>
        <Text variant="label" selectable>
          {value}
        </Text>
      </View>
    </PressableScale>
  );
}

function Body({ host, id }: { host: ScrollHost; id: string }) {
  const styles = useStyles();
  const query = useQuery({ queryKey: mastersKeys.party(id), queryFn: () => fetchPartyDetail(id) });
  useHostRefresh(host, useCallback(() => query.refetch(), [query]));
  const copy = (label: string, value: string) => {
    void Clipboard.setStringAsync(value);
    toast.show({ message: `${label} copied`, tone: 'success', durationMs: 1800 });
  };
  return host.attach(
    <Animated.ScrollView {...host.scrollProps} contentContainerStyle={styles.pad}>
      <QueryState query={query}>
        {(p) => (
          <>
            <Card style={styles.hero}>
              <Text variant="title">{p.name}</Text>
              <Text variant="label">{p.code}</Text>
              <View style={styles.pills}>
                {p.is_supplier && <StatusPill label="Supplier" tone="info" />}
                {p.is_customer && <StatusPill label="Customer" tone="success" />}
              </View>
            </Card>
            <Section title="Contact">
              <Card style={styles.list}>
                {!!p.contact && <KeyValue label="Contact person" value={p.contact} />}
                {!!p.phone && <ActionRow icon="call-outline" label="Phone" value={p.phone} onPress={() => void Linking.openURL(`tel:${p.phone.replace(/\s/g, '')}`)} />}
                {!!p.email && <ActionRow icon="mail-outline" label="Email" value={p.email} onPress={() => void Linking.openURL(`mailto:${p.email}`)} />}
                <KeyValue label="Address" value={[p.address_1, p.address_2, p.city, p.state, p.country].filter(Boolean).join(', ')} />
              </Card>
            </Section>
            <Section title="Tax & registration">
              <Card style={styles.list}>
                {!!p.gst_no && <ActionRow icon="copy-outline" label="GSTIN" value={p.gst_no} onPress={() => copy('GSTIN', p.gst_no)} />}
                {!!p.pan_no && <ActionRow icon="copy-outline" label="PAN" value={p.pan_no} onPress={() => copy('PAN', p.pan_no)} />}
                {!!p.cin_no && <KeyValue label="CIN" value={p.cin_no} />}
                {!!p.tan_no && <KeyValue label="TAN" value={p.tan_no} />}
              </Card>
            </Section>
            {p.party_details && (
              <Section title="Defaults">
                <Card>
                  <KeyValue label="Payment terms" value={p.party_details.payment_term} />
                  <KeyValue label="Transport" value={p.party_details.trans_mode} />
                  <KeyValue label="Delivery address" value={p.party_details.delivery_address} />
                </Card>
              </Section>
            )}
          </>
        )}
      </QueryState>
    </Animated.ScrollView>,
  );
}

const useStyles = makeStyles((t) => ({
  pad: { padding: t.space.gutter, paddingBottom: 48 },
  hero: { gap: 6 },
  pills: { flexDirection: 'row', gap: 8, marginTop: 4 },
  list: { gap: 4 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  actionIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: t.colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
}));
