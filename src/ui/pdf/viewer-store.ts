/** @author Lokesh */
import { create } from 'zustand';

import type { DocumentRequest } from '@/core/api';

/** What the in-app viewer should open; it fetches the file itself so it can appear instantly. */
export const useDocumentViewer = create<{ request: DocumentRequest | null; regenerate: boolean }>(() => ({
  request: null,
  regenerate: false,
}));
