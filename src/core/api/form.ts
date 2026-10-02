/** @author Lokesh */
export type FormValue = string | number | boolean | null | undefined | object;
export type FormParams = Record<string, FormValue>;

/** x-www-form-urlencoded body. Objects/arrays are JSON strings (xserp reads e.g. `invoice_data` that way). */
export function encodeForm(params: FormParams): string {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => {
      const value = typeof v === 'object' ? JSON.stringify(v) : String(v);
      return `${encodeURIComponent(k)}=${encodeURIComponent(value)}`;
    })
    .join('&');
}
