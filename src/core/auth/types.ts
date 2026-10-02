/** @author Lokesh */
export type PermissionAction = 'view' | 'edit' | 'delete' | 'approve' | 'alert';
export type Permission = Record<PermissionAction, boolean>;
export type PermissionCode = 'ACCOUNTS' | 'ICD' | 'PURCHASE' | 'SALES' | 'STORES' | 'MASTERS' | 'EXPENSES';

export type PendingCounts = { po: number; invoice: number; oa: number; grn: number; icd: number; rate: number; voucher: number };

export type SessionUser = {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  isSuper: boolean;
  enterpriseName: string;
};

export type Subscription = {
  plan: string | null;
  expiredOn: string | null;
  isExpired: boolean;
  showExpiry: boolean;
  canRequestExtension: boolean;
  extensionRequestedOn: string | null;
  enterpriseActive: boolean;
};

export type Session = {
  token: string;
  userId: number;
  enterpriseId: number;
  user: SessionUser;
  permissions: Record<string, Permission>;
  fyStartDay: string | null;
  icd: { enabled: boolean; ignoreCreditNote: boolean; autoGenVoucher: boolean };
  counts: PendingCounts;
  subscription: Subscription;
  serverDate: string | null;
  refreshedAt: number;
};
