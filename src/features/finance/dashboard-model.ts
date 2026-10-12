/** @author Lokesh */
import type { z } from 'zod';

import type { financeDashboardSchema } from './schemas';

export type FinanceDashboard = z.infer<typeof financeDashboardSchema>;
export type IncomeExpenseMonth = { month: string; income: number; expense: number };
export type FinanceSide = 'receivable' | 'payable';

export type SideGroup = {
  key: FinanceSide;
  label: string;
  total: number;
  trade: number;
  others: number;
  /** The biggest single party on this side, with its share of the trade figure. */
  top: { name: string; value: number; pct: number } | null;
};

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : null);

function side(key: FinanceSide, label: string, trade: number, others: number, rows: FinanceDashboard['receivables']): SideGroup {
  const lead = [...rows].sort((a, b) => Math.abs(b.value) - Math.abs(a.value))[0];
  return {
    key,
    label,
    total: trade + others,
    trade,
    others,
    top: lead ? { name: lead.name, value: lead.value, pct: pct(Math.abs(lead.value), Math.abs(trade)) ?? 0 } : null,
  };
}

/** What the Finance header card shows, worked out once from the dashboard payload and the monthly trend. */
export function financeSummary(d: FinanceDashboard, months: IncomeExpenseMonth[] = []) {
  const liquid = d.bank + d.cash;
  const receivable = side('receivable', 'Receivables', d.receivable, d.receivable_others, d.receivables);
  const payable = side('payable', 'Payables', d.payable, d.payable_others, d.payables);
  // Months with neither income nor expense say nothing about the trend, so it skips them.
  const active = months.filter((m) => m.income || m.expense);
  const net = (m: IncomeExpenseMonth) => m.income - m.expense;
  const last = active.at(-1);
  const prev = active.at(-2);
  return {
    liquid,
    bank: d.bank,
    cash: d.cash,
    bankAccounts: d.bank_balance.length,
    cashLedgers: d.cash_in_hand.length,
    /** How much of what is owed out cash and bank could settle today, capped at 100. */
    coverPct: payable.total > 0 ? Math.min(100, Math.max(0, pct(liquid, payable.total)!)) : null,
    /** Owed to us minus what we owe: positive means more is coming in than going out. */
    net: receivable.total - payable.total,
    sides: [receivable, payable] as const,
    period: { sales: d.sales_revenue, tax: d.tax_liability },
    latest: last ? { month: last.month, net: net(last), change: prev ? net(last) - net(prev) : null } : null,
  };
}

export type FinanceSummary = ReturnType<typeof financeSummary>;
export const isFinanceSide = (v: unknown): v is FinanceSide => v === 'receivable' || v === 'payable';
