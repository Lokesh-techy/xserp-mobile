/** @author Lokesh */
/**
 * The document the pager acts on is chosen by id, never by a stored position: if the selected
 * document leaves the list (approved, or the queue refreshed), the one now at the same position wins.
 */
export function pickCurrent<T>(
  items: T[],
  selectedId: string | null,
  lastIndex: number,
  idOf: (t: T) => string,
): { index: number; id: string } | null {
  if (items.length === 0) return null;
  const found = selectedId ? items.findIndex((i) => idOf(i) === selectedId) : -1;
  const index = found >= 0 ? found : Math.min(Math.max(0, lastIndex), items.length - 1);
  return { index, id: idOf(items[index] as T) };
}
