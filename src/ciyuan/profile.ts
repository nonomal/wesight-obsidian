import type { ProviderProfile } from '../types';
import { CIYUAN_API } from './constants';

type ProviderIdentity = Pick<ProviderProfile, 'providerKey' | 'name'>;

/** Old exports and shared provider files can still carry the original identity. */
export function isCiyuanProfile(profile: ProviderIdentity | null): boolean {
  if (!profile) return false;
  if (profile.providerKey) {
    return [CIYUAN_API.key, 'openlux'].includes(profile.providerKey.trim().toLowerCase());
  }
  return [CIYUAN_API.key, CIYUAN_API.name.toLowerCase(), 'openlux'].includes(profile.name.trim().toLowerCase());
}

export function normalizeCiyuanBaseUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return CIYUAN_API.baseUrl;
  try {
    const url = new URL(trimmed);
    const path = url.pathname.replace(/\/+$/, '');
    if (['http:', 'https:'].includes(url.protocol)
      && ['api.openlux.ai', 'openlux.ai'].includes(url.hostname.toLowerCase())
      && !url.port && !url.username && !url.password && !url.search && !url.hash
      && (path === '' || path === '/v1')) {
      return CIYUAN_API.baseUrl;
    }
  } catch {
    // Leave validation and custom endpoint errors to the connection UI/service.
  }
  return trimmed;
}

export function normalizeCiyuanProfile(profile: ProviderProfile): ProviderProfile {
  if (!isCiyuanProfile(profile)) return profile;
  return {
    ...profile,
    providerKey: CIYUAN_API.key,
    name: CIYUAN_API.name,
    baseUrl: normalizeCiyuanBaseUrl(profile.baseUrl ?? ''),
  };
}
