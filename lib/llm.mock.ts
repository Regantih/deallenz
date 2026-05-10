/**
 * MockModelRouter
 * Returns deterministic stub responses and realistic-ish cost numbers so the
 * cost-transparency UI can render without a real LLM connected.
 *
 * ONLY usable when NODE_ENV !== 'production', OR USE_MOCKS=true (staging).
 * In production without USE_MOCKS, the import throws immediately — no
 * [MOCK] data ever reaches a production user.
 *
 * Real adapter: lib/llm.anthropic.ts (WIRED — PR7)
 */

import * as crypto from 'node:crypto';
import type {
  ModelRouter,
  RouteParams,
  LLMResponse,
  CostLedger,
  CostEntry,
  TaskType,
  ModelTier,
} from './llm';
import { resolveTier, estimateUsd, TIER_MODELS } from './llm';

if (
  typeof process !== 'undefined' &&
  process.env?.NODE_ENV === 'production' &&
  process.env?.USE_MOCKS !== 'true'
) {
  throw new Error(
    '[deallenz] MockModelRouter must NOT be used in production. ' +
      'Real LLM calls require ANTHROPIC_API_KEY (see ENV.md). ' +
      'Set USE_MOCKS=true only on staging environments.'
  );
}

// ---------------------------------------------------------------------------
// Stub responses (deterministic, clearly labeled)
// ---------------------------------------------------------------------------

const STUB_RESPONSES: Record<TaskType, string> = {
  extract:
    '[MOCK] Extracted fields from document. ' +
    'Real extraction requires AnthropicModelRouter with ANTHROPIC_API_KEY set.',
  classify:
    '[MOCK] Classification result: seed-stage fintech. ' +
    'Real classification requires AnthropicModelRouter with ANTHROPIC_API_KEY set.',
  research:
    '[MOCK] Research complete. 0 live sources found. ' +
    'Real web research requires Perplexity/Firecrawl (future PR) + ANTHROPIC_API_KEY.',
  analyze:
    '[MOCK] Financial analysis stub. ' +
    'CAC, LTV, payback, and burn multiple cannot be computed without ANTHROPIC_API_KEY.',
  write:
    '[MOCK] Memo chapter drafted. ' +
    'Real memo writing requires ANTHROPIC_API_KEY set in Vercel env vars.',
  critique:
    '[MOCK] QA pass complete. 0 rubric items evaluated. ' +
    'Real critique requires ANTHROPIC_API_KEY set in Vercel env vars.',
};

const STUB_TOKEN_COUNTS: Record<TaskType, [tokensIn: number, tokensOut: number]> = {
  extract:  [1_200,  400],
  classify: [  400,  100],
  research: [3_500,  800],
  analyze:  [2_800,  700],
  write:    [5_000, 2_000],
  critique: [4_000,  500],
};

const TIER_LATENCY: Record<ModelTier, number> = {
  cheap:   400,
  mid:   1_200,
  deep:  3_500,
};

// ---------------------------------------------------------------------------
// MockModelRouter
// ---------------------------------------------------------------------------

export class MockModelRouter implements ModelRouter {
  private ledger: CostLedger;

  constructor(deal_id: string) {
    this.ledger = {
      deal_id,
      entries: [],
      total_usd: 0,
      total_tokens_in: 0,
      total_tokens_out: 0,
    };
  }

  async route(params: RouteParams): Promise<LLMResponse> {
    const tier: ModelTier = resolveTier(params.task_type, {
      tier_override: params.tier_override,
      cost_budget_usd: params.cost_budget_usd,
    });

    const model = TIER_MODELS[tier].anthropic;
    const [tokensIn, tokensOut] = STUB_TOKEN_COUNTS[params.task_type];
    const usd_cost = estimateUsd(tier, tokensIn, tokensOut);
    const latency = TIER_LATENCY[tier];

    await new Promise(r => setTimeout(r, latency));

    const entry: CostEntry = {
      call_id: crypto.randomUUID(),
      deal_id: params.deal_id,
      agent: params.agent,
      task_type: params.task_type,
      model,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      usd_cost,
      duration_ms: latency,
      timestamp: new Date().toISOString(),
    };

    this.ledger.entries.push(entry);
    this.ledger.total_usd += usd_cost;
    this.ledger.total_tokens_in += tokensIn;
    this.ledger.total_tokens_out += tokensOut;

    return { content: STUB_RESPONSES[params.task_type], cost_entry: entry };
  }

  getCostLedger(): CostLedger {
    return { ...this.ledger, entries: [...this.ledger.entries] };
  }

  resetLedger(deal_id: string): void {
    this.ledger = {
      deal_id,
      entries: [],
      total_usd: 0,
      total_tokens_in: 0,
      total_tokens_out: 0,
    };
  }
}
