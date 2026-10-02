/** @author Lokesh */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ApiError } from '@/core/api';
import { login, useSessionStore, type Session } from '@/core/auth';
import { ThemeProvider } from '@/core/theme';

import { LoginScreen } from './screens/login-screen';

jest.mock('@/core/auth', () => ({ ...jest.requireActual('@/core/auth'), login: jest.fn() }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const loginMock = login as jest.MockedFunction<typeof login>;
const renderLogin = () =>
  render(
    <ThemeProvider initialPreference="light">
      <LoginScreen />
    </ThemeProvider>,
  );

beforeEach(() => loginMock.mockReset());

test('requires email and password before calling the server', async () => {
  await renderLogin();
  await fireEvent.press(screen.getByText('Sign in'));
  expect(await screen.findByText('Enter your email and password.')).toBeTruthy();
  expect(loginMock).not.toHaveBeenCalled();
});

test('shows the server message on failure', async () => {
  loginMock.mockRejectedValueOnce(new ApiError('server', 'Incorrect Username/Password', { code: 400 }));
  await renderLogin();
  await fireEvent.changeText(screen.getByLabelText('Email'), 'a@b.c');
  await fireEvent.changeText(screen.getByLabelText('Password'), 'x');
  await fireEvent.press(screen.getByText('Sign in'));
  expect(await screen.findByText('Incorrect Username/Password')).toBeTruthy();
});

test('signs in on success', async () => {
  const fake = { token: 't' } as Session;
  loginMock.mockResolvedValueOnce(fake);
  const signIn = jest.spyOn(useSessionStore.getState(), 'signIn').mockResolvedValueOnce();
  await renderLogin();
  await fireEvent.changeText(screen.getByLabelText('Email'), 'a@b.c');
  await fireEvent.changeText(screen.getByLabelText('Password'), 'pw');
  await fireEvent.press(screen.getByText('Sign in'));
  await waitFor(() => expect(signIn).toHaveBeenCalledWith(fake));
});
