import type { Env } from '@/config/env';
import { PostbackService } from './postback.service';

export interface PostbackRetrySummary {
  inspected: number;
  claimed: number;
  sent: number;
  retried: number;
  deadLettered: number;
  skipped: number;
}

export interface PostbackRetryConsumerOptions {
  service?: Pick<PostbackService, 'retryDuePostbacks'>;
  limit?: number;
}

export async function handlePostbackRetryCron(
  env: Env,
  options: PostbackRetryConsumerOptions = {},
): Promise<PostbackRetrySummary> {
  const service = options.service ?? new PostbackService(env);
  const limit = Math.max(1, Math.min(500, options.limit ?? 100));
  return service.retryDuePostbacks(limit);
}
