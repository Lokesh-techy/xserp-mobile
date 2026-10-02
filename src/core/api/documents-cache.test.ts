/** @author Lokesh */
const mockFiles = new Map<string, Uint8Array>();
jest.mock('expo-file-system', () => {
  class File {
    name: string;
    constructor(...parts: string[]) {
      this.name = parts.join('/');
    }
    get exists() {
      return mockFiles.has(this.name);
    }
    get uri() {
      return this.name;
    }
    create() {
      mockFiles.set(this.name, new Uint8Array());
    }
    write(b: Uint8Array) {
      mockFiles.set(this.name, b);
    }
    delete() {
      mockFiles.delete(this.name);
    }
  }
  class Directory {
    uri: string;
    constructor(...parts: string[]) {
      this.uri = parts.join('/');
    }
    get exists() {
      return [...mockFiles.keys()].some((k) => k.startsWith(this.uri));
    }
    create() {}
    delete() {
      for (const k of [...mockFiles.keys()]) if (k.startsWith(this.uri)) mockFiles.delete(k);
    }
  }
  return { File, Directory, Paths: { cache: 'cache' } };
});

import * as client from './client';
import { clearDocumentCache, openDocument } from './documents';

beforeEach(() => {
  mockFiles.clear();
  client.configureApi({ getAuth: () => ({ token: 't', userId: 7, enterpriseId: 102 }) });
});

test('always fetches a fresh copy and scopes the file by company', async () => {
  const spy = jest.spyOn(client, 'post').mockResolvedValue({ data: 'SGk=' } as never);
  await openDocument({ path: 'sales/json/inv_doc/', params: { invoice_id: 1 }, filename: 'INV-0001.pdf' });
  await openDocument({ path: 'sales/json/inv_doc/', params: { invoice_id: 1 }, filename: 'INV-0001.pdf' });
  expect(spy).toHaveBeenCalledTimes(2);
  expect([...mockFiles.keys()]).toEqual(['cache/xserp-docs/102/INV-0001.pdf']);
});

test('clearDocumentCache removes every downloaded document', async () => {
  jest.spyOn(client, 'post').mockResolvedValue({ data: 'SGk=' } as never);
  await openDocument({ path: 'x/', params: {}, filename: 'a.pdf' });
  clearDocumentCache();
  expect(mockFiles.size).toBe(0);
});
