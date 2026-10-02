/** @author Lokesh */
const all = ['masters'] as const;
export const mastersKeys = {
  all,
  party: (id: string) => [...all, 'party', id] as const,
  material: (itemId: string, makeId: string) => [...all, 'material', itemId, makeId] as const,
  stock: (itemId: string) => ['stores', 'material-stock', itemId] as const,
  rates: () => [...all, 'rates'] as const,
};
