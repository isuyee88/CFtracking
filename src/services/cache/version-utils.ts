import type { Env } from '@/config/env';

export interface WorkerVersionInfo {
  id: string;
  tag: string | null;
  timestamp: string;
  namespace: string;
}

export function getWorkerVersionInfo(env: Env): WorkerVersionInfo {
  const id = env.CF_VERSION_METADATA?.id || 'unversioned';
  const tag = env.CF_VERSION_METADATA?.tag || null;
  const timestamp = env.CF_VERSION_METADATA?.timestamp || '';

  return {
    id,
    tag,
    timestamp,
    namespace: id,
  };
}
