/** @author Lokesh */
import { useLocalSearchParams } from 'expo-router';

import { ApprovalPagerScreen, type ApprovalType } from '@/features/approvals/engine';
import { StateView } from '@/ui';
import { APPROVALS } from '@/modules/approval-registry';

export default function ApprovalPager() {
  const { type } = useLocalSearchParams<{ type: ApprovalType }>();
  const config = APPROVALS[type];
  if (!config) return <StateView icon="help-circle-outline" title="Unknown approval type" />;
  return <ApprovalPagerScreen config={config} />;
}
