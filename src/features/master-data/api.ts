/** @author Lokesh */
import { post } from '@/core/api';

import { ledgerNamesSchema, materialNamesSchema, partyNamesSchema, projectsSchema, taxListSchema } from './schemas';

export type Party = { id: string; code: string; name: string };
export type MaterialName = { itemId: string; drawingNo: string; name: string; makeId: string; makeName: string; unit: string; hsnCode: string; isStocked: boolean; isFaulty: boolean };
export type LedgerName = { id: string; name: string; group: string };
export type Project = { id: string; code: string; name: string };
export type TaxName = { code: string; name: string; rate: number };

export type MasterRows = { parties: Party[]; materials: MaterialName[]; ledgers: LedgerName[]; projects: Project[]; taxes: TaxName[] };
export type MasterKind = keyof MasterRows;

const LONG = { timeoutMs: 120_000 }; // material/ledger lists can be large

export const masterFetchers: { [K in MasterKind]: () => Promise<MasterRows[K]> } = {
  parties: async () => (await post('masters/json/partyNames/', {}, { schema: partyNamesSchema, ...LONG })).party_names,
  materials: async () =>
    (await post('masters/json/materialNames/', {}, { schema: materialNamesSchema, ...LONG })).material_names.map((m) => ({
      itemId: m.item_id,
      drawingNo: m.drawing_no,
      name: m.name,
      makeId: m.make_id,
      makeName: m.make_name,
      unit: m.primary_unit,
      hsnCode: m.hsn_code,
      isStocked: m.is_stocked,
      isFaulty: m.is_faulty,
    })),
  ledgers: async () => (await post('accounts/json/ledger_names/', {}, { schema: ledgerNamesSchema, ...LONG })).ledgers.map((l) => ({ id: l.id, name: l.name, group: l.group_name })),
  projects: async () => (await post('masters/json/projects/', {}, { schema: projectsSchema, ...LONG })).projects,
  taxes: async () => (await post('masters/json/loadTaxList/', {}, { schema: taxListSchema, ...LONG })).tax_list.map((x) => ({ code: x.tax_code, name: x.name, rate: x.net_rate })),
};
