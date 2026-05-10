/**
 * MockModelRouter
 * Returns deterministic stub responses and realistic-ish cost numbers so the
 * cost-transparency UI can render without a real LLM connected.
 *
 * ONLY usable when USE_MOCKS=true or NODE_ENV !== 'production'.
 * Stub responses are clearly labeled with [MOCK] prefix.
 *
 * Real adapters: lib/llm.anthropic.ts, lib/llm.openai.ts  (PR#5)
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
    '[deallenz] MockModelRouter must not be used in production. ' +
    'Set USE_MOCKS=true to override (only for staging).'
  );
}

// ---------------------------------------------------------------------------
// Stub responses (deterministic, clearly labeled)
// ---------------------------------------------------------------------------

/** Each stub clearly states it is mock output and what real integration is needed. */
const STUB_RESPONSES: Record<TaskType, string> = {
  extract:
    '[MOCK] Extracted fields from document. ' +
    'Real extraction requires a connected LLM with PDF/text input.',
  classify:
    '[MOCK] Classification result: seed-stage fintech. ' +
    'Real classification requires a connected LLM.',
  research:
    '[MOCK] Research complete. 0 live sources found. ' +
    'Real web research requires Tavily or Firecrawl integration (PR#5).',
  analyze:
    '[MOCK] Financial analysis stub. ' +
    'CAC, LTV, payback, and burn multiple cannot be computed without real inputs.',
  write:
    '[MOCK] Memo chapter drafted. ' +
    'Real memo writing requires a connected LLM with full deal context (PR#5).',
  critique:
    '[MOCK] QA pass complete. 0 rubric items evaluated. ' +
    'Real critique requires a connected LLM (PR#5).',
};

// Realistic token counts per task type (to produce plausible cost numbers)
const STUB_TOKEN_COUNTS: Record<TaskType, [tokensIn: number, tokensOut: number]> = {
  extract:  [1_200,  400],
  classify: [  400,  100],
  research: [3_500,  800],
  analyze:  [2_800,  700],
  write:    [5_000, 2_000],
  critique: [4_000,  500],
};

// Simulated latency per tier (ms)
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

    const model = TIER_MODELS[tier].anthropic; // default to Anthropic naming convention
    const [tokensIn, tokensOut] = STUB_TOKEN_COUNTS[params.task_type];
    const usd_cost = estimateUsd(tier, tokensIn, tokensOut);
    const latency = TIER_LATENCY[tier];

    // Simulate async latency so the UI can show progress realistically
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

    // Accumulate into ledger
    this.ledger.entries.push(entry);
    this.ledger.total_usd += usd_cost;
    this.ledger.total_tokens_in += tokensIn;
    this.ledger.total_tokens_out += tokensOut;

    const content = STUB_RESPONSES[params.task_type];

    return { content, cost_entry: entry };
  }

  getCostLedger(): CostLedger {
    // Return a shallow copy so callers cannot mutate internal state
    return {
      ...this.ledger,
      entries: [...this.ledger.entries],
    };
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
