/** @author Lokesh */
import { z } from 'zod';

import { zBool, zId, zList, zNum, zStr } from '@/core/api';

export const partyNamesSchema = z.looseObject({ party_names: zList(z.looseObject({ id: zId, code: zStr, name: zStr })) });
export const materialNamesSchema = z.looseObject({
  material_names: zList(
    z.looseObject({ item_id: zId, drawing_no: zStr, name: zStr, make_id: zId, make_name: zStr, primary_unit: zStr, hsn_code: zStr, is_stocked: zBool, is_faulty: zBool }),
  ),
});
export const ledgerNamesSchema = z.looseObject({ ledgers: zList(z.looseObject({ id: zId, name: zStr, group_name: zStr })) });
export const projectsSchema = z.looseObject({ projects: zList(z.looseObject({ id: zId, code: zStr, name: zStr })) });
export const taxListSchema = z.looseObject({ tax_list: zList(z.looseObject({ tax_code: zStr, name: zStr, net_rate: zNum })) });
