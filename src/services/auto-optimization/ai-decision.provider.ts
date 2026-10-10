/**
 * @fileoverview AI decision provider for auto optimization
 * @description Wraps Workers AI calls, optional AI Gateway routing, and heuristic fallback metadata.
 * @module services/auto-optimization/ai-decision.provider
 */

import type { Env } from '@/config/env';
import type {
  AiOptimizationAnalysis,
  AiOptimizationCandidate,
} from './ai-orchestrator.service';
import type { AiDecisionProviderType } from '@/types/auto-optimization';

interface AiBindingLike {
  run: (
    model: string,
    input: Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => Promise<unknown>;
}

export interface AiDecisionProviderRuntimeInfo {
  aiBindingAvailable: boolean;
  provider: AiDecisionProviderType;
  gatewayEnabled: boolean;
  gatewayId?: string;
  model: string;
  fallbackProvider: 'heuristic-fallback';
}

export interface AnalyzeDecisionInput {
  candidate: AiOptimizationCandidate;
  prompt: string;
  model: string;
  fallback: AiOptimizationAnalysis;
  parseResponse: (rawResponse: string, candidate: AiOptimizationCandidate) => AiOptimizationAnalysis;
}

export class AiDecisionProvider {
  constructor(private env: Env) {}

  private get envMap(): Record<string, unknown> {
    return this.env as unknown as Record<string, unknown>;
  }

  getRuntimeInfo(): AiDecisionProviderRuntimeInfo {
    const gatewayId = this.getGatewayId();
    const aiBindingAvailable = Boolean(this.envMap.AI);

    if (!aiBindingAvailable) {
      return {
        aiBindingAvailable: false,
        provider: 'heuristic-fallback',
        gatewayEnabled: false,
        model: 'heuristic-fallback',
        fallbackProvider: 'heuristic-fallback',
      };
    }

    return {
      aiBindingAvailable,
      provider: gatewayId ? 'workers-ai-gateway' : 'workers-ai-direct',
      gatewayEnabled: Boolean(gatewayId),
      gatewayId: gatewayId || undefined,
      model: this.getModelName(),
      fallbackProvider: 'heuristic-fallback',
    };
  }

  async analyzeDecision(input: AnalyzeDecisionInput): Promise<AiOptimizationAnalysis> {
    const ai = this.envMap.AI as AiBindingLike | undefined;
    const runtimeInfo = this.getRuntimeInfo();

    if (!ai?.run) {
      return this.withFallback(input.fallback, 'Workers AI binding unavailable');
    }

    try {
      const response = await ai.run(
        input.model,
        {
          messages: [
            {
              role: 'system',
              content:
                'You are an optimization agent. Return only JSON with keys: actionType, confidence, reason, evidence, expectedImpact, rollbackHint, actionParameters.',
            },
            { role: 'user', content: input.prompt },
          ],
        },
        runtimeInfo.gatewayId
          ? {
              gateway: {
                id: runtimeInfo.gatewayId,
              },
            }
          : undefined,
      );

      const rawResponse = this.extractTextResponse(response);
      const parsed = input.parseResponse(rawResponse, input.candidate);
      return {
        ...parsed,
        provider: runtimeInfo.provider,
        gatewayId: runtimeInfo.gatewayId,
        fallbackUsed: false,
        fallbackReason: undefined,
        model: input.model,
        rawResponse,
      };
    } catch (error) {
      return this.withFallback(input.fallback, this.stringifyError(error), {
        rawResponse: `fallback:${this.stringifyError(error)}`,
      });
    }
  }

  getModelName(): string {
    const value = this.envMap.AI_OPTIMIZATION_MODEL;
    return typeof value === 'string' && value.trim().length > 0
      ? value.trim()
      : '@cf/meta/llama-3.1-8b-instruct';
  }

  private getGatewayId(): string | null {
    const value = this.envMap.AI_OPTIMIZATION_GATEWAY_ID;
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private withFallback(
    fallback: AiOptimizationAnalysis,
    fallbackReason: string,
    overrides?: Partial<AiOptimizationAnalysis>,
  ): AiOptimizationAnalysis {
    return {
      ...fallback,
      ...overrides,
      provider: 'heuristic-fallback',
      gatewayId: undefined,
      fallbackUsed: true,
      fallbackReason,
      model: 'heuristic-fallback',
    };
  }

  private extractTextResponse(response: unknown): string {
    if (typeof response === 'string') {
      return response;
    }

    const record = response as Record<string, unknown>;
    if (typeof record.response === 'string') {
      return record.response;
    }

    if (typeof record.result === 'string') {
      return record.result;
    }

    if (Array.isArray(record.result)) {
      const textParts = record.result
        .map((item) => {
          if (typeof item === 'string') {
            return item;
          }

          const nested = item as Record<string, unknown>;
          if (typeof nested.text === 'string') {
            return nested.text;
          }
          if (typeof nested.response === 'string') {
            return nested.response;
          }
          return null;
        })
        .filter((item): item is string => typeof item === 'string' && item.length > 0);

      if (textParts.length > 0) {
        return textParts.join('\n');
      }
    }

    return JSON.stringify(response);
  }

  private stringifyError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
