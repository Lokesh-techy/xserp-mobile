/** @author Lokesh */
import type { z } from 'zod';

import type { grnStatusSchema, indentStatusSchema, storeDashboardSchema } from './schemas';

type Dashboard = z.infer<typeof storeDashboardSchema>;
type IndentStatus = z.infer<typeof indentStatusSchema>;
type GrnStatus = z.infer<typeof grnStatusSchema>;

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : null);

/** How many stock-mix categories get their own row; the rest fold into "Others". */
export const MIX_ROWS = 5;

/** What the Stores header card shows, worked out once from the dashboard, indent and GRN payloads. */
export function storesSummary(d: Dashboard, indent?: IndentStatus, grn?: GrnStatus) {
  const st = d.stock_statement;
  const stock = st
    ? {
        opening: st.opening_stock,
        received: st.stock_receipt,
        issued: st.stock_issues,
        closing: st.closing_stock,
        change: st.closing_stock - st.opening_stock,
        changePct: st.opening_stock ? Math.round(((st.closing_stock - st.opening_stock) / Math.abs(st.opening_stock)) * 100) : null,
      }
    : null;
  const sorted = [...d.stock_mix].sort((a, b) => b.value - a.value);
  const rest = sorted.slice(MIX_ROWS).reduce((n, m) => n + m.value, 0);
  const mix = [...sorted.slice(0, MIX_ROWS).map((m) => ({ label: m.category, value: m.value })), ...(rest ? [{ label: 'Others', value: rest }] : [])];
  return {
    stock,
    indents: indent && {
      raised: indent.indent_raised,
      closed: indent.indent_closed,
      open: indent.indent_pending,
      duePo: indent.indent_due_po,
      dueMaterial: indent.indent_due_material,
      closedPct: pct(indent.indent_closed, indent.indent_raised),
    },
    grns: grn && {
      raised: grn.grn_raised,
      inProcess: grn.grn_inprocess,
      accounted: grn.grn_accounted,
      accountedPct: pct(grn.grn_accounted, grn.grn_raised),
    },
    mix,
    mixTotal: mix.reduce((n, m) => n + m.value, 0),
    monthly: d.monthly_closing_stock,
  };
}

export type StoresSummary = ReturnType<typeof storesSummary>;
