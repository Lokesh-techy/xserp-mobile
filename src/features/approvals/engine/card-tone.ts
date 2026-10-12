/** @author Lokesh */
import type { Theme } from '@/core/theme';

import type { ApprovalAction } from './types';

export type ActionTone = ApprovalAction<unknown>['tone'];

/** Soft tinted fill + strong label, per action tone. */
export const actionTone = (t: Theme, tone: ActionTone) => {
  const c = t.colors;
  switch (tone) {
    case 'success':
      return { bg: c.successSoft, fg: c.successText };
    case 'danger':
      return { bg: c.dangerSoft, fg: c.dangerText };
    case 'primary':
      return { bg: c.primarySoft, fg: c.onPrimarySoft };
    default:
      return { bg: c.fill, fg: c.textMuted };
  }
};
