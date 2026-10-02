/** @author Lokesh */
import { useMemo } from 'react';

import type { PickerItem } from '@/ui';

import type { LedgerName } from './api';
import { useMasterStore } from './store';

export const materialKey = (itemId: string, makeId: string) => `${itemId}:${makeId}`;

export const useParties = () => useMasterStore((s) => s.data.parties);
export const useMaterials = () => useMasterStore((s) => s.data.materials);
export const useLedgers = () => useMasterStore((s) => s.data.ledgers);
export const useProjects = () => useMasterStore((s) => s.data.projects);
export const useTaxes = () => useMasterStore((s) => s.data.taxes);

export function usePartyItems(): PickerItem[] {
  const rows = useParties();
  return useMemo(() => rows.map((p) => ({ id: p.id, label: p.name, sublabel: p.code })), [rows]);
}

export function useMaterialItems(): PickerItem[] {
  const rows = useMaterials();
  return useMemo(
    () =>
      rows.map((m) => ({
        id: materialKey(m.itemId, m.makeId),
        label: m.name,
        sublabel: [m.drawingNo, m.makeName !== '-NA-' ? m.makeName : null].filter(Boolean).join(' · ') || undefined,
        trailing: m.unit || undefined,
      })),
    [rows],
  );
}

export function useLedgerItems(filter?: (l: LedgerName) => boolean): PickerItem[] {
  const rows = useLedgers();
  return useMemo(
    () => (filter ? rows.filter(filter) : rows).map((l) => ({ id: l.id, label: l.name, sublabel: l.group })),
    [rows, filter],
  );
}

export function useProjectItems(): PickerItem[] {
  const rows = useProjects();
  return useMemo(() => rows.map((p) => ({ id: p.id, label: p.name, sublabel: p.code })), [rows]);
}
