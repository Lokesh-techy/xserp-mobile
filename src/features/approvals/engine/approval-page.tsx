/** @author Lokesh */
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useSession } from '@/core/auth';
import { makeStyles, useTheme } from '@/core/theme';
import { formatDate, formatMoney } from '@/core/utils';
import { BottomSheet, Card, DocumentButton, Section, StatusPill, Text } from '@/ui';

import { LineItemsCard } from './line-items-card';
import type { ApprovalConfig } from './types';

/** One document in the pager: hero summary, line items, extra sections, document button. */
export function ApprovalPage<T, D>({
  config,
  item,
  active,
  width,
}: {
  config: ApprovalConfig<T, D>;
  item: T;
  active: boolean;
  width: number;
}) {
  const t = useTheme();
  const styles = useStyles();
  const session = useSession();
  const s = config.summary(item);
  const detail = useQuery({
    queryKey: config.detailKey?.(item) ?? [config.type, 'detail', config.id(item)],
    queryFn: () => config.detail!(item),
    enabled: !!config.detail && active,
  });
  const lines = config.lines?.(item, detail.data) ?? [];
  const [line, setLine] = useState<string | null>(null);
  const LineSheet = config.lineSheet;
  return (
    <ScrollView style={{ width }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Card tint={t.tints[config.tint]} style={styles.hero}>
        <View style={styles.row}>
          <Text variant="overline" color={t.tints[config.tint]}>
            {config.noun}
          </Text>
          <StatusPill label={s.status.label} tone={s.status.tone} />
        </View>
        <Text variant="title" selectable>
          {s.code}
        </Text>
        <Text variant="label" color={t.colors.textMuted}>
          {s.party || '—'}
        </Text>
        {typeof s.amount === 'number' && (
          <Text variant="display" style={styles.amount}>
            {formatMoney(s.amount, s.currency || '₹')}
          </Text>
        )}
        <View style={styles.metaRow}>
          <Text variant="caption" color={t.colors.textMuted}>
            {formatDate(s.date)}
          </Text>
          {s.meta?.map((m, i) => (
            <Text key={i} variant="caption" color={t.colors.textMuted}>
              · {m.text}
            </Text>
          ))}
        </View>
      </Card>
      {config.lines && (
        <LineItemsCard
          lines={lines}
          loading={detail.isPending && !!config.detail}
          onPress={LineSheet ? setLine : undefined}
        />
      )}
      {config.sections
        ?.filter((sec) => sec.visible?.(item, { session }) ?? true)
        .map((sec) => (
          <Section key={sec.key} title={sec.title}>
            <sec.Component item={item} detail={detail.data} />
          </Section>
        ))}
      {LineSheet && (
        <BottomSheet visible={!!line} onClose={() => setLine(null)} title="Material">
          {line && <LineSheet item={item} lineKey={line} detail={detail.data} />}
        </BottomSheet>
      )}
      {config.document && (
        <View style={styles.doc}>
          <DocumentButton request={config.document(item)} />
        </View>
      )}
    </ScrollView>
  );
}

const useStyles = makeStyles((t) => ({
  content: { padding: t.space.gutter, paddingBottom: 140 },
  hero: { gap: 6, paddingLeft: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amount: { marginTop: 6, fontSize: 26, lineHeight: 32 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  doc: { marginTop: 20 },
}));
