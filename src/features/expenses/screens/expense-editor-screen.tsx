/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { errorMessage } from '@/core/api';
import { useSession } from '@/core/auth';
import { can } from '@/core/permissions';
import { makeStyles, useTheme } from '@/core/theme';
import { formatDate, formatMoney, successFeedback } from '@/core/utils';
import { BottomSheet, Button, Card, Input, KeyValue, PickerSheet, PressableScale, QueryState, ScreenHeader, Section, StatusPill, Text, toast } from '@/ui';

import { fetchExpense, fetchHeads, NEW_EXPENSE, saveExpense, type Expense, type Particular } from '../api';
import { ParticularSheet } from '../components/particular-sheet';
import { expenseKeys } from '../keys';
import { expenseStatus, nextSteps, STATUS, type Step } from '../status';

export function ExpenseEditorScreen({ id }: { id: string }) {
  const isNew = id === 'new';
  const query = useQuery({ queryKey: expenseKeys.one(id), queryFn: () => fetchExpense(id), enabled: !isNew });
  const styles = useStyles();
  if (isNew) return <Editor initial={NEW_EXPENSE} />;
  return (
    <QueryState
      query={query}
      skeleton={
        <View style={styles.root}>
          <ScreenHeader title="Expense" />
        </View>
      }>
      {(e) => <Editor initial={e} />}
    </QueryState>
  );
}

function Editor({ initial }: { initial: Expense }) {
  const t = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const session = useSession();
  const qc = useQueryClient();
  const [e, setE] = useState<Expense>(initial);
  const [editing, setEditing] = useState<{ index: number | null } | null>(null);
  const [step, setStep] = useState<Step | null>(null);
  const [stepRemarks, setStepRemarks] = useState('');
  const [pickingClaim, setPickingClaim] = useState(false);
  const claimHeads = useQuery({ queryKey: expenseKeys.heads('claim_heads'), queryFn: () => fetchHeads('claim_heads') });
  const expenseHeads = useQuery({ queryKey: expenseKeys.heads('expense_heads'), queryFn: () => fetchHeads('expense_heads') });
  const claimItems = useMemo(() => (claimHeads.data?.claim_heads ?? []).map((h) => ({ id: h.id, label: h.name })), [claimHeads.data]);
  const headItems = useMemo(() => (expenseHeads.data?.expense_heads ?? []).map((h) => ({ id: h.id, label: h.name })), [expenseHeads.data]);

  const isDraft = e.status === STATUS.DRAFT;
  const mine = !e.createdBy || e.createdBy === String(session.userId);
  const editable = isDraft && mine && can(session, 'EXPENSES', 'edit');
  const steps = nextSteps(e, session);
  const totals = e.particulars.reduce((s, p) => ({ claimed: s.claimed + p.amount, approver: s.approver + p.approverDebit, audit: s.audit + p.auditDebit }), { claimed: 0, approver: 0, audit: 0 });
  const st = expenseStatus(e.status);

  const persist = async (status: number, remarks?: string) => {
    if (!e.claimHeadId) return toast.show({ message: 'Choose a claim head first.', tone: 'danger' });
    if (e.particulars.length === 0) return toast.show({ message: 'Add at least one expense line.', tone: 'danger' });
    try {
      await saveExpense(remarks ? { ...e, remarks } : e, status);
      successFeedback();
      toast.show({ message: status === e.status ? 'Expense saved' : `Expense ${expenseStatus(status).label.toLowerCase()}`, tone: 'success' });
      await qc.invalidateQueries({ queryKey: expenseKeys.all });
      router.back();
    } catch (err) {
      toast.show({ message: errorMessage(err), tone: 'danger', durationMs: 5000 });
    }
  };

  const upsert = (p: Particular, index: number | null) =>
    setE((x) => ({ ...x, particulars: index === null ? [...x.particulars, { ...p, itemNo: x.particulars.length + 1 }] : x.particulars.map((q, i) => (i === index ? p : q)) }));

  return (
    <View style={styles.root}>
      <ScreenHeader title={e.code || (e.id ? `Draft #${e.id}` : 'New expense')} subtitle={e.claimant || undefined} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.row}>
            <StatusPill label={st.label} tone={st.tone} />
            {!!e.date && (
              <Text variant="caption" color={t.colors.textMuted}>
                {formatDate(e.date)}
              </Text>
            )}
          </View>
          <PressableScale onPress={() => {
              if (editable) setPickingClaim(true);
            }} style={styles.picker}>
            <Text variant="caption" color={t.colors.textMuted}>
              Claim head
            </Text>
            <Text variant="label">{claimItems.find((c) => c.id === e.claimHeadId)?.label ?? (editable ? 'Choose claim head' : '—')}</Text>
          </PressableScale>
          <Input label="Description" icon="create-outline" value={e.description} editable={editable} onChangeText={(description) => setE({ ...e, description })} />
          <Section title={`Lines · ${e.particulars.length}`} action={editable ? { label: 'Add line', onPress: () => setEditing({ index: null }) } : undefined}>
            {e.particulars.map((p, i) => (
              <Card key={`${p.itemNo}-${i}`} style={styles.line} onPress={() => setEditing({ index: i })}>
                <View style={styles.flex}>
                  <Text variant="label">{headItems.find((h) => h.id === p.headId)?.label ?? 'Expense'}</Text>
                  <Text variant="caption" color={t.colors.textMuted} numberOfLines={1}>
                    {[formatDate(p.spentOn), p.description, p.billAvailable ? 'bill' : 'no bill'].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <View style={styles.right}>
                  <Text variant="label" weight="bold">
                    {formatMoney(p.amount)}
                  </Text>
                  {!!(p.approverDebit || p.auditDebit) && (
                    <Text variant="caption" color={t.colors.danger}>
                      −{formatMoney(p.approverDebit + p.auditDebit)}
                    </Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={16} color={t.colors.textFaint} />
              </Card>
            ))}
          </Section>
          <Card>
            <KeyValue label="Claimed" value={formatMoney(totals.claimed)} />
            <KeyValue label="Approver debit" value={formatMoney(totals.approver)} />
            <KeyValue label="Audit debit" value={formatMoney(totals.audit)} />
            <KeyValue label="Net payable" value={formatMoney(totals.claimed - totals.approver - totals.audit)} mono />
          </Card>
          <View style={styles.info}>
            <Ionicons name="information-circle-outline" size={16} color={t.colors.infoText} />
            <Text variant="caption" color={t.colors.infoText} style={styles.flex}>
              Bills can be attached on XSERP web.
            </Text>
          </View>
        </ScrollView>
        {(editable || steps.length > 0) && (
          <View style={[styles.bar, { paddingBottom: insets.bottom + 10 }]}>
            {editable && <Button title="Save draft" variant="ghost" size="sm" onPress={() => persist(STATUS.DRAFT)} style={styles.flex} />}
            {steps.map((s) => (
              <Button key={s.id} title={s.label} variant={s.tone} size="sm" onPress={() => setStep(s)} style={styles.flex} />
            ))}
          </View>
        )}
      </KeyboardAvoidingView>
      {editing && (
        <ParticularSheet
          initial={editing.index === null ? null : (e.particulars[editing.index] ?? null)}
          heads={headItems}
          canEditAmount={editable || editing.index === null}
          canApproverDebit={e.status === STATUS.CONFIRMED && can(session, 'EXPENSES', 'approve') && !mine}
          canAuditDebit={(e.status === STATUS.APPROVED || e.status === STATUS.CHECKED) && (session.user.isSuper || can(session, 'ICD', 'approve'))}
          onClose={() => setEditing(null)}
          onSave={(p) => upsert(p, editing.index)}
        />
      )}
      <PickerSheet visible={pickingClaim} title="Claim head" items={claimItems} selectedId={e.claimHeadId} allowClear={false} onSelect={(i) => i && setE({ ...e, claimHeadId: i.id })} onClose={() => setPickingClaim(false)} />
      <BottomSheet visible={!!step} onClose={() => setStep(null)} title={step?.label}>
        <View style={styles.sheet}>
          <Input label={step?.remarks === 'required' ? 'Remarks (required)' : 'Remarks (optional)'} icon="chatbox-ellipses-outline" value={stepRemarks} onChangeText={setStepRemarks} multiline />
          <Button
            title={step?.label ?? ''}
            variant={step?.tone ?? 'primary'}
            onPress={async () => {
              if (!step) return;
              if (step.remarks === 'required' && !stepRemarks.trim()) return toast.show({ message: 'Please add a reason.', tone: 'danger' });
              const s = step;
              setStep(null);
              await persist(s.to, stepRemarks.trim() || undefined);
            }}
          />
        </View>
      </BottomSheet>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.bg },
  flex: { flex: 1 },
  body: { padding: t.space.gutter, paddingBottom: 120, gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  picker: { borderRadius: t.radius.md, backgroundColor: t.colors.surface, padding: 14, gap: 2, ...t.shadow.card },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  right: { alignItems: 'flex-end', gap: 2 },
  info: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: t.radius.sm, backgroundColor: t.colors.accentSoft },
  bar: { flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingTop: 10, backgroundColor: t.colors.surface, borderTopWidth: 1, borderTopColor: t.colors.divider },
  sheet: { paddingHorizontal: 20, gap: 14 },
}));
