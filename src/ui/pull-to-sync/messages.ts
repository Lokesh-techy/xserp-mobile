/** @author Lokesh */
/** What a generic screen says while it syncs — changes every beat so it never feels stuck. */
export const SYNC_PHRASES = ['REACHING THE SERVER…', 'FETCHING THE LATEST…', 'CHECKING FOR CHANGES…', 'UPDATING THIS SCREEN…', 'ALMOST THERE…'] as const;

export const phraseAt = (i: number) => SYNC_PHRASES[i % SYNC_PHRASES.length] as string;
