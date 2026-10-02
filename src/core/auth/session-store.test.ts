/** @author Lokesh */
import fixture from '../../../__fixtures__/login_api.json';
import { toSession, userPayloadSchema } from './session-mapper';
import { useSessionStore } from './session-store';

const session = () => toSession(userPayloadSchema.parse(fixture));

test('signIn persists and hydrate restores', async () => {
  await useSessionStore.getState().signIn(session());
  useSessionStore.setState({ status: 'loading', session: null });
  await useSessionStore.getState().hydrate();
  expect(useSessionStore.getState().status).toBe('signedIn');
  expect(useSessionStore.getState().session?.token).toBe('FIXTURE_TOKEN');
});

test('signOut clears storage and keeps the notice; repeated signOut is harmless', async () => {
  await useSessionStore.getState().signIn(session());
  await Promise.all([useSessionStore.getState().signOut('Expired'), useSessionStore.getState().signOut('Expired')]);
  expect(useSessionStore.getState()).toMatchObject({ status: 'signedOut', session: null, notice: 'Expired' });
  await useSessionStore.getState().hydrate();
  expect(useSessionStore.getState().status).toBe('signedOut');
});
