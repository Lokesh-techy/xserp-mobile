/** @author Lokesh */
import type { Tone } from '@/core/theme';

const MAP: Record<number, { label: string; tone: Tone }> = {
  0: { label: 'Draft', tone: 'warning' },
  1: { label: 'Reviewed', tone: 'info' },
  2: { label: 'Approved', tone: 'success' },
  3: { label: 'Rejected', tone: 'danger' },
};

export const poStatus = (status: number) => MAP[status] ?? { label: 'Cancelled', tone: 'neutral' as Tone };

export const PO_STATUS_OPTIONS = [
  { value: '100', label: 'All' },
  { value: '0', label: 'Draft' },
  { value: '1', label: 'Reviewed' },
  { value: '2', label: 'Approved' },
  { value: '3', label: 'Rejected' },
];
