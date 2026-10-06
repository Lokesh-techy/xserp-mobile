/** @author Lokesh */
import { z } from 'zod';

import { post, postOk, ERP } from '@/core/api';
import { grnListSchema, toReceipt, type Receipt, type ReceiptMaterial } from '@/features/stores';

import { grnMaterialsSchema } from './schemas';

/** ICD queue; xserp answers 109 ("Database error") when nothing is pending. */
export const fetchPendingGrnNotes = async (): Promise<Receipt[]> =>
  (await post(ERP.auditing.pendingGrn, {}, { schema: grnListSchema, emptyCodes: [109] })).grn_list.map(toReceipt);

export const toGrnMaterials = (res: z.infer<typeof grnMaterialsSchema>): ReceiptMaterial[] =>
  res.materials.map((m) => ({
    key: `${m.item_id}:${m.make_id}`,
    itemId: m.item_id,
    makeId: m.make_id,
    name: m.name,
    drawingNo: m.drawing_no,
    receivedQty: m.received_qty || m.quantity,
    acceptedQty: m.accepted_qty,
    rate: m.rate || m.price,
    unit: m.unit,
  }));

export const fetchGrnMaterials = async (r: Receipt) =>
  toGrnMaterials(
    await post(
      ERP.auditing.grnMaterials,
      { receipt_no: r.receiptNo, grn_number: r.receiptNo },
      { schema: grnMaterialsSchema },
    ),
  );

type NoteRef = Pick<Receipt, 'receiptNo' | 'noteId' | 'projectCode' | 'projectId'>;

export async function verifyNote(r: NoteRef, remarks: string) {
  await postOk(ERP.auditing.verifyNote, {
    receipt_no: r.receiptNo,
    grn_number: r.receiptNo,
    note_id: r.noteId,
    project_code: r.projectCode,
    project_id: r.projectId,
    icd_remarks: remarks,
  });
}

export async function returnGrn(r: NoteRef, remarks: string) {
  await postOk(ERP.auditing.returnGrn, {
    grn_number: r.receiptNo,
    receipt_no: r.receiptNo,
    note_id: r.noteId,
    audit_remarks: remarks,
  });
}

export type AuditDocType = 'receipt' | 'invoice' | 'note';
export const auditDocument = (r: Receipt, docType: AuditDocType) => ({
  path: ERP.auditing.downloadDoc,
  params: { receipt_no: r.receiptNo, grn_code: r.code, note_id: r.noteId, doc_type: docType },
  filename: `${(r.code || `GRN-${r.receiptNo}`).replace(/\//g, '_')}-${docType}.pdf`,
});
