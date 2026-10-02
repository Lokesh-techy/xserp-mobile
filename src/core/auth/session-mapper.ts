/** @author Lokesh */
import { z } from 'zod';

import { zBool, zNum, zRecordOf, zStr, zStrOrNull } from '../api/schema';
import type { Session, SessionUser } from './types';

const permissionSchema = z.looseObject({ view: zBool, edit: zBool, delete: zBool, approve: zBool, alert: zBool });

/** Shared by user/json/login_api/ and auth/json/user_settings/. */
export const userPayloadSchema = z.looseObject({
  id: zNum,
  username: zStr,
  user_email: zStr,
  first_name: zStr,
  last_name: zStr,
  is_super: zBool,
  enterprise_id: zNum,
  enterprise_name: zStr,
  token: zStrOrNull.optional(),
  permissions: zRecordOf(permissionSchema),
  fy_start_day: zStrOrNull.optional(),
  icd_enabled: zBool.optional(),
  icd_ignore_credit_note: zBool.optional(),
  icd_auto_gen_voucher: zBool.optional(),
  pending_po_count_notification: zNum.optional(),
  invoice_pending_count: zNum.optional(),
  oa_pending_count: zNum.optional(),
  receipt_save_count: zNum.optional(),
  icd_checked_count: zNum.optional(),
  master_material_price: zNum.optional(),
  pending_voucher_count: zNum.optional(),
  plan: zStrOrNull.optional(),
  expired_on: zStrOrNull.optional(),
  is_expired: zBool.optional(),
  shall_enable_expiry_timer: zBool.optional(),
  shall_enable_request_extension: zBool.optional(),
  extension_requested_on: zStrOrNull.optional(),
  is_enterprise_active: zBool.optional(),
  server_date: zStrOrNull.optional(),
});
export type UserPayload = z.infer<typeof userPayloadSchema>;

export function toSession(p: UserPayload, previous?: Session | null): Session {
  const token = p.token ?? previous?.token;
  if (!token) throw new Error('Login response did not include a token');
  const pick = <K extends keyof UserPayload>(k: K, fallback: NonNullable<UserPayload[K]>) =>
    (p[k] ?? fallback) as NonNullable<UserPayload[K]>;
  return {
    token,
    userId: p.id,
    enterpriseId: p.enterprise_id,
    user: {
      id: p.id,
      username: p.username,
      email: p.user_email,
      firstName: p.first_name,
      lastName: p.last_name,
      isSuper: p.is_super,
      enterpriseName: p.enterprise_name,
    },
    permissions: Object.fromEntries(
      Object.entries(p.permissions).map(([k, v]) => [k, { view: v.view, edit: v.edit, delete: v.delete, approve: v.approve, alert: v.alert }]),
    ),
    fyStartDay: p.fy_start_day ?? previous?.fyStartDay ?? null,
    icd: {
      enabled: p.icd_enabled ?? previous?.icd.enabled ?? false,
      ignoreCreditNote: p.icd_ignore_credit_note ?? previous?.icd.ignoreCreditNote ?? false,
      autoGenVoucher: p.icd_auto_gen_voucher ?? previous?.icd.autoGenVoucher ?? false,
    },
    counts: {
      po: pick('pending_po_count_notification', 0),
      invoice: pick('invoice_pending_count', 0),
      oa: pick('oa_pending_count', 0),
      grn: pick('receipt_save_count', 0),
      icd: pick('icd_checked_count', 0),
      rate: pick('master_material_price', 0),
      voucher: pick('pending_voucher_count', 0),
    },
    subscription: {
      plan: p.plan ?? null,
      expiredOn: p.expired_on ?? null,
      isExpired: p.is_expired ?? false,
      showExpiry: p.shall_enable_expiry_timer ?? false,
      canRequestExtension: p.shall_enable_request_extension ?? false,
      extensionRequestedOn: p.extension_requested_on ?? null,
      enterpriseActive: p.is_enterprise_active ?? true,
    },
    serverDate: p.server_date ?? null,
    refreshedAt: Date.now(),
  };
}

export function displayName(user: SessionUser | null | undefined): string {
  if (!user) return '';
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || user.email;
}

export function initials(user: SessionUser | null | undefined): string {
  return displayName(user)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
