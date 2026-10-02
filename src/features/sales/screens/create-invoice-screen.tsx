/** @author Lokesh */
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { router, useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useState } from 'react';
import { FormProvider, useForm, type FieldErrors } from 'react-hook-form';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { errorMessage } from '@/core/api';
import { useCan } from '@/core/permissions';
import { makeStyles, useTheme } from '@/core/theme';
import { successFeedback } from '@/core/utils';
import { useSession } from '@/core/auth';
import { useProjects, useTaxes } from '@/features/master-data';
import { Button, ScreenHeader, Text, toast } from '@/ui';

import { saveInvoice } from '../invoice-form/api';
import { buildInvoicePayload } from '../invoice-form/build-payload';
import { ChargesStep, TransportStep } from '../invoice-form/details-step';
import { ItemsStep } from '../invoice-form/items-step';
import { PartyStep } from '../invoice-form/party-step';
import { ReviewStep } from '../invoice-form/review-step';
import { EMPTY_INVOICE, invoiceFormSchema, type InvoiceForm } from '../invoice-form/schema';
import { StepBar } from '../invoice-form/step-bar';
import { STEPS, stepStates } from '../invoice-form/steps';
import { salesKeys } from '../keys';

export function CreateInvoiceScreen() {
  const t = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const navigation = useNavigation();
  const projects = useProjects();
  const taxes = useTaxes();
  const session = useSession();
  const canApprove = useCan('SALES', 'approve');
  const [step, setStep] = useState(0);
  const [visited, setVisited] = useState(0);
  const [saved, setSaved] = useState(false);
  const methods = useForm<InvoiceForm>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: EMPTY_INVOICE,
    mode: 'onTouched',
  });
  const dirty = methods.formState.isDirty && !saved;

  usePreventRemove(dirty, ({ data }) => {
    Alert.alert('Discard this invoice?', 'Your changes will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  const errorPaths = flattenErrors(methods.formState.errors);
  const steps = stepStates({ current: step, visited, errors: errorPaths });
  const goTo = (i: number) => {
    setStep(i);
    setVisited((v) => Math.max(v, i));
  };
  const next = async () => {
    const fields = STEPS[step]?.fields ?? [];
    if (fields.length && !(await methods.trigger(fields))) {
      toast.show({ message: 'Fix the highlighted fields to continue.', tone: 'danger' });
      return;
    }
    goTo(Math.min(STEPS.length - 1, step + 1));
  };

  const save = (withApproval: boolean) =>
    methods.handleSubmit(
      async (form) => {
        try {
          await saveInvoice(
            buildInvoicePayload(form, { projects, taxes, withApproval, enterpriseId: session.enterpriseId }),
          );
          setSaved(true);
          successFeedback();
          toast.show({
            message: withApproval ? 'Invoice saved and approved' : 'Invoice saved as draft',
            tone: 'success',
          });
          await qc.invalidateQueries({ queryKey: salesKeys.all });
          router.back();
        } catch (e) {
          toast.show({ message: errorMessage(e), tone: 'danger', durationMs: 5000 });
        }
      },
      // Invalid: jump to the first step that needs attention.
      (errors) => {
        const paths = flattenErrors(errors);
        const first = STEPS.findIndex((st) =>
          st.fields.some((f) => paths.some((p) => p === f || p.startsWith(`${f}.`))),
        );
        if (first >= 0) goTo(first);
        toast.show({ message: 'Some details need attention before saving.', tone: 'danger' });
      },
    )();

  const body = [
    <PartyStep key="p" />,
    <ItemsStep key="i" />,
    <ChargesStep key="c" />,
    <TransportStep key="t" />,
    <ReviewStep key="r" goTo={goTo} />,
  ][step];
  const last = step === STEPS.length - 1;

  return (
    <FormProvider {...methods}>
      <View style={styles.root}>
        <ScreenHeader title="New invoice" subtitle={`Step ${step + 1} of ${STEPS.length} · ${STEPS[step]?.title}`} />
        <StepBar steps={steps} onJump={goTo} />
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <Text variant="caption" color={t.colors.textMuted}>
              <Text variant="caption" color={t.colors.danger}>
                ✱
              </Text>{' '}
              marks required fields
            </Text>
            {body}
          </ScrollView>
          <View style={[styles.bar, { paddingBottom: insets.bottom + 10 }]}>
            {step > 0 && (
              <Button
                title="Back"
                icon="arrow-back"
                variant="ghost"
                size="sm"
                onPress={() => goTo(step - 1)}
                style={styles.flex}
              />
            )}
            {!last && <Button title="Next" icon="arrow-forward" size="sm" onPress={next} style={styles.flex} />}
            {last && (
              <Button title="Save draft" variant="ghost" size="sm" onPress={() => save(false)} style={styles.flex} />
            )}
            {last && canApprove && (
              <Button
                title="Save & approve"
                variant="success"
                size="sm"
                onPress={() => save(true)}
                style={styles.flex}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </FormProvider>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.bg },
  flex: { flex: 1 },
  body: { padding: t.space.gutter, paddingBottom: 120, gap: 16 },
  bar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    backgroundColor: t.colors.surface,
    borderTopWidth: 1,
    borderTopColor: t.colors.divider,
  },
}));

/** "items.0.quantity"-style paths for every error in the form. */
function flattenErrors(errors: FieldErrors<InvoiceForm>, prefix = ''): string[] {
  return Object.entries(errors).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    if (!v || typeof v !== 'object') return [];
    const nested = Object.keys(v).filter((x) => !['message', 'type', 'ref', 'root', 'types'].includes(x));
    return 'message' in v && v.message
      ? [path]
      : nested.length
        ? flattenErrors(v as FieldErrors<InvoiceForm>, path)
        : [path];
  });
}
