/** @author Lokesh */
import type { Tone } from '@/core/theme';

type Status = { label: string; tone: Tone };

const INVOICE: Record<number, Status> = { 0: { label: 'Pending', tone: 'warning' }, 1: { label: 'Approved', tone: 'success' }, [-1]: { label: 'Cancelled', tone: 'danger' } };
const OA: Record<number, Status> = { 0: { label: 'Draft', tone: 'warning' }, 1: { label: 'Approved', tone: 'success' }, 2: { label: 'Rejected', tone: 'danger' } };

export const invoiceStatus = (s: number): Status => INVOICE[s] ?? { label: 'Unknown', tone: 'neutral' };
export const oaStatus = (s: number): Status => OA[s] ?? { label: 'Unknown', tone: 'neutral' };

export const INVOICE_STATUS_OPTIONS = [
  { value: '100', label: 'All' },
  { value: '1', label: 'Approved' },
  { value: '0', label: 'Pending' },
  { value: '-1', label: 'Cancelled' },
];
export const OA_STATUS_OPTIONS = [
  { value: '100', label: 'All' },
  { value: '0', label: 'Draft' },
  { value: '1', label: 'Approved' },
  { value: '2', label: 'Rejected' },
];
