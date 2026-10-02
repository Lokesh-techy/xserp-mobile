/** @author Lokesh */
import type { Session } from '@/core/auth';
import { can } from '@/core/permissions';
import type { Tone } from '@/core/theme';

export const STATUS = { DRAFT: 0, CONFIRMED: 1, APPROVED: 2, CHECKED: 3, VERIFIED: 4 } as const;
export type ExpenseStatus = (typeof STATUS)[keyof typeof STATUS];

/** Keys xserp uses for grouped lists and status-filtered responses. */
export const STATUS_NAME: Record<ExpenseStatus, 'Draft' | 'Confirmed' | 'Approved' | 'Checked' | 'Verified'> = { 0: 'Draft', 1: 'Confirmed', 2: 'Approved', 3: 'Checked', 4: 'Verified' };

const TONE: Record<ExpenseStatus, Tone> = { 0: 'neutral', 1: 'info', 2: 'success', 3: 'violet', 4: 'success' };
export const expenseStatus = (s: number) => ({ label: STATUS_NAME[s as ExpenseStatus] ?? 'Unknown', tone: TONE[s as ExpenseStatus] ?? ('neutral' as Tone) });

export type Step = { id: 'confirm' | 'approve' | 'check' | 'verify'; label: string; to: ExpenseStatus; remarks: 'optional' | 'required'; tone: 'primary' | 'success' | 'danger' };

/**
 * Who may move a claim forward (XSManager's workflow):
 * claimant confirms a draft → an approver (not the claimant) approves it →
 * an auditor (ICD approve or super user) checks, then verifies.
 */
export function nextSteps(e: { status: number; createdBy: string }, s: Session): Step[] {
  const mine = e.createdBy === '' || e.createdBy === String(s.userId);
  const auditor = s.user.isSuper || can(s, 'ICD', 'approve');
  switch (e.status) {
    case STATUS.DRAFT:
      return mine ? [{ id: 'confirm', label: 'Confirm', to: STATUS.CONFIRMED, remarks: 'optional', tone: 'primary' }] : [];
    case STATUS.CONFIRMED:
      // No "return to draft": xserp's save_expense only ever raises a claim's status.
      return !mine && can(s, 'EXPENSES', 'approve') ? [{ id: 'approve', label: 'Approve', to: STATUS.APPROVED, remarks: 'optional', tone: 'success' }] : [];
    case STATUS.APPROVED:
      return auditor ? [{ id: 'check', label: 'Check', to: STATUS.CHECKED, remarks: 'optional', tone: 'primary' }] : [];
    case STATUS.CHECKED:
      return auditor ? [{ id: 'verify', label: 'Verify', to: STATUS.VERIFIED, remarks: 'optional', tone: 'success' }] : [];
    default:
      return [];
  }
}
