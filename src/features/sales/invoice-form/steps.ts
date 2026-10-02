/** @author Lokesh */
import type { FieldPath } from 'react-hook-form';

import type { InvoiceForm } from './schema';

export type StepDef = { key: string; title: string; fields: FieldPath<InvoiceForm>[] };

export const STEPS: StepDef[] = [
  { key: 'party', title: 'Party', fields: ['type', 'partyId', 'projectId', 'saleAccountId', 'poNo', 'poDate', 'gstin', 'deliverTo'] },
  { key: 'items', title: 'Items', fields: ['items'] },
  { key: 'charges', title: 'Charges', fields: ['packingCharges', 'transportCharges', 'paymentTerms'] },
  { key: 'transport', title: 'Transport', fields: ['transportMode', 'lrNo', 'roadPermitNo', 'packingSlipNo', 'packingDescription', 'specialInstruction', 'notes'] },
  { key: 'review', title: 'Review', fields: [] },
];

export type StepState = 'done' | 'error' | 'current' | 'upcoming';

/** Visual state of each step; any step up to the furthest one visited can be jumped to. */
export function stepStates({ current, visited, errors }: { current: number; visited: number; errors: string[] }) {
  const hasError = (i: number) => STEPS[i]!.fields.some((f) => errors.some((e) => e === f || e.startsWith(`${f}.`)));
  return STEPS.map((step, i) => {
    const state: StepState = hasError(i) && i !== current ? 'error' : i === current ? 'current' : i < visited || i < current ? 'done' : 'upcoming';
    return { ...step, index: i, state, reachable: i <= Math.max(visited, current) };
  });
}
