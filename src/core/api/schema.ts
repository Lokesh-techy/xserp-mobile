/** @author Lokesh */
import { z } from 'zod';

// xserp serialises loosely: numbers as "1,234.50", "", null; ids as ints or strings; booleans as 1/"true"/"True".
// Every response schema builds on these so screens can trust the types.

const toNumber = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const n = Number(String(v).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : null;
};

export const zNum = z.preprocess((v) => toNumber(v) ?? 0, z.number());
export const zNumOrNull = z.preprocess((v) => toNumber(v), z.number().nullable());
export const zStr = z.preprocess((v) => (v === null || v === undefined ? '' : String(v)), z.string());
export const zStrOrNull = z.preprocess((v) => (v === null || v === undefined || v === '' ? null : String(v)), z.string().nullable());
export const zId = zStr;
export const zBool = z.preprocess((v) => v === true || v === 1 || v === '1' || v === 'true' || v === 'True', z.boolean());

export const zList = <T extends z.ZodType>(item: T) => z.preprocess((v) => (Array.isArray(v) ? v : []), z.array(item));

export const zRecordOf = <T extends z.ZodType>(item: T) =>
  z.preprocess((v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {}), z.record(z.string(), item));

/** xserp list searches treat "-1" as "any"; an empty string would filter for empty values instead. */
export const anyOr = (v: string | null | undefined) => (v === null || v === undefined || v.trim() === '' ? '-1' : v.trim());
