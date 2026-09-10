import type { CloudBillingSummary, CloudUser } from '../share/types';
import type { MultiPlatformId } from './types';

export const MULTI_PUBLISH_LOGIN_PROMPT = '请先登录 WeSight 后再同步平台。';
export const MULTI_PUBLISH_FREE_LIMIT_NOTICE = '非会员仅支持一个平台';

export type MultiPublishAccessState = 'login-required' | 'single-platform' | 'multi-platform';

export interface MultiPublishAccess {
  state: MultiPublishAccessState;
  maxTargets: 0 | 1 | null;
}

export function resolveMultiPublishAccess(
  user: CloudUser | null,
  billing: CloudBillingSummary | null,
): MultiPublishAccess {
  if (!user) return { state: 'login-required', maxTargets: 0 };
  if (billing?.membership.active) return { state: 'multi-platform', maxTargets: null };
  return { state: 'single-platform', maxTargets: 1 };
}

export function validateMultiPublishTargetCount(
  access: MultiPublishAccess,
  targetCount: number,
): string | null {
  if (access.state === 'login-required') return MULTI_PUBLISH_LOGIN_PROMPT;
  if (access.maxTargets !== null && targetCount > access.maxTargets) {
    return MULTI_PUBLISH_FREE_LIMIT_NOTICE;
  }
  return null;
}

export function normalizeMultiPublishSelection(
  access: MultiPublishAccess,
  platforms: MultiPlatformId[],
): { platforms: MultiPlatformId[]; limited: boolean } {
  const unique = Array.from(new Set(platforms));
  if (access.maxTargets === null || unique.length <= access.maxTargets) {
    return { platforms: unique, limited: false };
  }
  return { platforms: unique.slice(0, access.maxTargets), limited: true };
}
