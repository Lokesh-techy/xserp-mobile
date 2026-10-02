/** @author Lokesh */
import { create } from 'zustand';

import type { FetchedDocument } from '@/core/api';

/** The document currently open in the in-app viewer (too large for route params). */
export const useDocumentViewer = create<{ doc: FetchedDocument | null }>(() => ({ doc: null }));
