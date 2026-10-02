/** @author Lokesh */
import { z } from 'zod';

import { configureApi, post, postOk } from './client';
import { ApiError } from './errors';
import { zList, zNum } from './schema';

const fetchMock = jest.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

const respond = (body: string, status = 200) =>
  fetchMock.mockResolvedValueOnce({ status, text: async () => body } as Response);

const onSessionExpired = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  onSessionExpired.mockReset();
  configureApi({ getAuth: () => ({ token: 'jwt', userId: 7, enterpriseId: 102 }), onSessionExpired });
});

const listSchema = z.looseObject({ po_list: zList(z.looseObject({ po_value: zNum })) });

test('posts form-encoded body with auth, CSRF and referer to /erp/<path>', async () => {
  respond(JSON.stringify({ response_code: 200, po_list: [] }));
  await post('purchase/json/po_draft/', { status: 0 }, { schema: listSchema });
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  expect(url).toBe('https://dev.xserp.in/erp/purchase/json/po_draft/');
  expect(init.method).toBe('POST');
  expect(init.credentials).toBe('omit');
  const headers = init.headers as Record<string, string>;
  expect(headers['Content-Type']).toBe('application/x-www-form-urlencoded');
  expect(headers.Referer).toBe('https://dev.xserp.in/');
  const csrf = headers['X-CSRFToken'];
  expect(csrf).toMatch(/^[0-9a-f]{32}$/);
  expect(headers.Cookie).toBe(`csrftoken=${csrf}`);
  const body = String(init.body);
  expect(body).toContain('status=0');
  expect(body).toContain('token=jwt');
  expect(body).toContain('user_id=7');
  expect(body).toContain('enterprise_id=102');
  expect(body).toContain(`csrfmiddlewaretoken=${csrf}`);
});

test('omits auth fields when auth is false', async () => {
  respond(JSON.stringify({ response_code: 200 }));
  await postOk('user/json/login_api/', { user_email: 'a@b.c' }, { auth: false });
  expect(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body)).not.toMatch(/(^|&)token=/);
});

test('coerces string numbers through the schema', async () => {
  respond(JSON.stringify({ response_code: 200, po_list: [{ po_value: '1,200.5' }] }));
  const res = await post('purchase/json/po_draft/', {}, { schema: listSchema });
  expect(res.po_list[0]?.po_value).toBe(1200.5);
});

test('non-200 response_code becomes a server error with the custom message', async () => {
  respond(JSON.stringify({ response_code: 400, response_message: 'Failure', custom_message: 'PO already approved' }));
  await expect(postOk('purchase/json/po/approve/', {})).rejects.toMatchObject({ kind: 'server', code: 400, message: 'PO already approved' });
});

test('emptyCodes map to an empty, schema-defaulted result', async () => {
  respond(JSON.stringify({ response_code: 109, response_message: 'Database error' }));
  const s = z.looseObject({ grn_list: zList(z.looseObject({})) });
  await expect(post('auditing/json/pendingGrn/', {}, { schema: s, emptyCodes: [109] })).resolves.toMatchObject({ grn_list: [] });
});

test('Session Timeout envelope calls the expiry handler once and throws a session error', async () => {
  respond(JSON.stringify({ response_code: 400, response_message: 'Session Timeout', custom_message: 'Session Timeout. Please login again!' }));
  await expect(postOk('sales/json/draft_oa/', {})).rejects.toMatchObject({ kind: 'session' });
  expect(onSessionExpired).toHaveBeenCalledTimes(1);
});

test('HTML session page is a session error', async () => {
  respond('<html><body>Your session has expired</body></html>');
  await expect(postOk('sales/json/draft_oa/', {})).rejects.toMatchObject({ kind: 'session' });
  expect(onSessionExpired).toHaveBeenCalledTimes(1);
});

test('HTML 403 is a CSRF error', async () => {
  respond('<html>CSRF verification failed</html>', 403);
  await expect(postOk('x/', {})).rejects.toMatchObject({ kind: 'csrf' });
});

test('network failure is a network error', async () => {
  fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));
  await expect(postOk('x/', {})).rejects.toMatchObject({ kind: 'network' });
});

test('abort is a timeout error', async () => {
  fetchMock.mockRejectedValueOnce(Object.assign(new Error('aborted'), { name: 'AbortError' }));
  await expect(postOk('x/', {})).rejects.toMatchObject({ kind: 'timeout' });
});

test('schema mismatch is a validation error that names the path', async () => {
  respond(JSON.stringify({ response_code: 200, po_list: 'nope' }));
  const strict = z.object({ po_list: z.array(z.object({ id: z.number() })) });
  const err = await post('purchase/json/po_draft/', {}, { schema: strict }).catch((e: unknown) => e);
  expect(err).toBeInstanceOf(ApiError);
  expect(err).toMatchObject({ kind: 'validation', path: 'purchase/json/po_draft/' });
});

test('signed-out authed request fails fast without calling fetch', async () => {
  configureApi({ getAuth: () => null });
  await expect(postOk('x/', {})).rejects.toMatchObject({ kind: 'session' });
  expect(fetchMock).not.toHaveBeenCalled();
  expect(onSessionExpired).not.toHaveBeenCalled();
});
