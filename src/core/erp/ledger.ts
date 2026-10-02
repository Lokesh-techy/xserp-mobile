/** @author Lokesh */
import { z } from 'zod';

import { zId, zList, zNum, zStr } from '../api/schema';

// Accounting shapes shared by several ERP endpoints (ageing buckets, party outstanding, stock).
export const agingSchema = z.looseObject({
  age1: zNum,
  age2: zNum,
  age3: zNum,
  age4: zNum,
  overdue: zNum,
  total: zNum,
  advance: zNum,
  billable: zNum,
  excess: zNum,
  outstanding: zNum,
});
export type Aging = z.infer<typeof agingSchema>;

export const outstandingSchema = z.looseObject({
  outstanding: zList(z.looseObject({ id: zId, name: zStr, due: zNum, total: zNum, overdue: zNum, aging: agingSchema.nullish() })),
});
export type OutstandingLedger = z.infer<typeof outstandingSchema>['outstanding'][number];

export const materialStockSchema = z.looseObject({
  material_stock: zList(z.looseObject({ closing_stock: zNum, opening_stock: zNum, location: zStr.optional(), name: zStr.optional() })),
  closing_stock: zNum.optional(),
});

export const financeYearsSchema = z.looseObject({ financial_years: zList(zStr) });
