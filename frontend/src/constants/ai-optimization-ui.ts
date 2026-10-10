export interface AiEngineStatusLike {
  provider?: string;
  gatewayEnabled?: boolean;
  gatewayId?: string;
  model?: string;
  fallbackProvider?: string;
}

export interface AiDecisionSourceLike {
  provider?: string;
  gatewayId?: string;
  fallbackUsed?: boolean;
  fallbackReason?: string;
  model?: string;
}

export function formatAiEngineRoute(config?: AiEngineStatusLike | null): string {
  if (!config) {
    return 'Unavailable';
  }

  if (config.provider === 'workers-ai-gateway') {
    return `Workers AI via Gateway${config.gatewayId ? ` (${config.gatewayId})` : ''}`;
  }

  if (config.provider === 'workers-ai-direct') {
    return 'Workers AI direct';
  }

  return 'Heuristic fallback only';
}

export function formatAiFallbackLabel(decision: AiDecisionSourceLike): string {
  if (!decision.fallbackUsed) {
    return 'Primary AI path';
  }

  if (decision.fallbackReason && decision.fallbackReason.trim().length > 0) {
    return `Fallback: ${decision.fallbackReason}`;
  }

  return 'Fallback: heuristic';
}

export function formatAiDecisionSourceLabel(decision: AiDecisionSourceLike): string {
  if (decision.provider === 'workers-ai-gateway') {
    return `Gateway${decision.gatewayId ? `:${decision.gatewayId}` : ''}`;
  }

  if (decision.provider === 'workers-ai-direct') {
    return 'Workers AI';
  }

  return 'Heuristic';
}
