/** @author Lokesh */
import { z } from 'zod';

import { post, postOk } from '../api/client';
import { ApiError } from '../api/errors';
import { zBool, zStr } from '../api/schema';
import { toSession, userPayloadSchema } from './session-mapper';
import type { Session } from './types';

export async function login(email: string, password: string): Promise<Session> {
  const payload = await post('user/json/login_api/', { user_email: email.trim(), password, fcm_id: '' }, { schema: userPayloadSchema, auth: false });
  return toSession(payload);
}

/** Re-reads permissions, ICD flags, counts and subscription. Keeps the existing token. */
export async function refreshSession(current: Session): Promise<Session> {
  const payload = await post('auth/json/user_settings/', {}, { schema: userPayloadSchema });
  return toSession(payload, current);
}

export async function logout(session: Session): Promise<void> {
  // Best effort: the server only unregisters the push id.
  await postOk(
    'user/json/logout_api/',
    { user_email: session.user.email, user_id: session.userId, enterprise_id: session.enterpriseId, token: session.token, fcm_id: '' },
    { auth: false, timeoutMs: 8_000 },
  ).catch(() => undefined);
}

export async function forgotPassword(email: string): Promise<string> {
  const res = await postOk('auth/json/forget_password/', { user_email: email.trim() }, { auth: false });
  return res.custom_message ?? 'We have emailed you a link to reset your password.';
}

export async function changePassword(input: { email: string; oldPassword?: string; newPassword: string; cpToken?: string }): Promise<void> {
  try {
    await postOk(
      'auth/json/change_password/',
      { user_email: input.email, old_password: input.oldPassword ?? '', new_password: input.newPassword, cp_token: input.cpToken ?? '' },
      { auth: false },
    );
  } catch (e) {
    if (e instanceof ApiError && /old password was wrong/i.test(e.message)) throw new ApiError('server', 'Your current password is incorrect.');
    throw e;
  }
}

const versionSchema = z.looseObject({ version: zStr, force_update: zBool });

export async function fetchVersionInfo(): Promise<{ version: string; forceUpdate: boolean }> {
  const v = await post('commons/version_info/', {}, { schema: versionSchema, auth: false, timeoutMs: 8_000 });
  return { version: v.version, forceUpdate: v.force_update };
}

export async function requestExtension(reason: string): Promise<void> {
  await postOk('admin/mail_request/', { reason });
}
