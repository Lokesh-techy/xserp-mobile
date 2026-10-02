/** @author Lokesh */
import { erase, type AnyApproval, type ApprovalType } from '@/features/approvals/engine';
import { poApproval } from '@/features/purchase';
import { invoiceApproval, oaApproval } from '@/features/sales';
import { grnApproval } from '@/features/stores';
import { icdApproval } from '@/features/audit';
import { rateApproval } from '@/features/masters';

// Each module task adds its config here, e.g. `po: erase(poApproval)`.
export const APPROVALS: Partial<Record<ApprovalType, AnyApproval>> = { po: erase(poApproval), invoice: erase(invoiceApproval), oa: erase(oaApproval), grn: erase(grnApproval), icd: erase(icdApproval), rate: erase(rateApproval) };

