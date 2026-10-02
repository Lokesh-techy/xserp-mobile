/** @author Lokesh */
/** Multi-select toggle that keeps the order in which items were picked. */
export const togglePick = (selected: string[], id: string) => (selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
