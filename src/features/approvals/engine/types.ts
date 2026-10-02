/** @author Lokesh */
import type { ComponentType } from 'react';

import type { DocumentRequest } from '@/core/api';
import type { PermissionCode, Session } from '@/core/auth';
import type { ModuleTint, Tone } from '@/core/theme';
import type { IconName } from '@/ui';

export type ApprovalType = 'po' | 'invoice' | 'oa' | 'grn' | 'icd' | 'rate';

export type ApprovalSummary = {
  code: string;
  party: string;
  amount?: number | null;
  currency?: string | null;
  date?: string | null;
  status: { label: string; tone: Tone };
  meta?: { icon: IconName; text: string }[];
};

export type LineItem = { key: string; title: string; subtitle?: string; qty?: string; amount?: number | null; currency?: string | null };

export type ApprovalCtx = { session: Session };

export type ApprovalAction<T> = {
  id: string;
  label: string;
  icon: IconName;
  tone: 'primary' | 'ghost' | 'danger' | 'success';
  remarks: 'none' | 'optional' | 'required';
  visible: (item: T, ctx: ApprovalCtx) => boolean;
  /** Server-side "can I?" check (e.g. po/checkpogrn) — runs before the undo window. */
  precheck?: (item: T) => Promise<void>;
  run: (item: T, remarks: string, ctx: ApprovalCtx) => Promise<void>;
  /** Past-tense toast text, e.g. "PO approved". */
  done: string;
};

export type ApprovalSection<T, D> = {
  key: string;
  title: string;
  Component: ComponentType<{ item: T; detail: D | undefined }>;
  visible?: (item: T, ctx: ApprovalCtx) => boolean;
};

export type ApprovalConfig<T, D = undefined> = {
  type: ApprovalType;
  title: string;
  noun: string;
  permission: PermissionCode;
  tint: ModuleTint;
  queueKey: readonly unknown[];
  queue: () => Promise<T[]>;
  id: (item: T) => string;
  summary: (item: T) => ApprovalSummary;
  search?: (item: T) => (string | null | undefined)[];
  detailKey?: (item: T) => readonly unknown[];
  detail?: (item: T) => Promise<D>;
  lines?: (item: T, detail: D | undefined) => LineItem[];
  sections?: ApprovalSection<T, D>[];
  document?: (item: T) => DocumentRequest;
  actions: ApprovalAction<T>[];
  invalidate?: readonly (readonly unknown[])[];
};

/** Identity helper that fixes T/D inference at the definition site. */
export const defineApproval = <T, D = undefined>(c: ApprovalConfig<T, D>) => c;

/** Heterogeneous registries hold configs with erased item types; only the engine handles items. */
export type AnyApproval = ApprovalConfig<unknown, unknown>;
export const erase = <T, D>(c: ApprovalConfig<T, D>) => c as unknown as AnyApproval;

export const visibleActions = <T, D>(c: ApprovalConfig<T, D>, item: T, ctx: ApprovalCtx) => c.actions.filter((a) => a.visible(item, ctx));
