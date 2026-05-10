/**
 * lib/llm.anthropic.ts
 *
 * AnthropicModelRouter — REAL implementation of ModelRouter.
 *
 * Uses @anthropic-ai/sdk. Server-only.
 *
 * Required env var:
 *   ANTHROPIC_API_KEY — Anthropic API key.
 *   Throws 'ANTHROPIC_API_KEY missing - configure in Vercel env vars
 *   before deploying' if absent.
 *
 * Cost tracking:
 *   Reads real response.usage.input_tokens / output_tokens and computes USD
 *   via estimateUsd() from lib/llm.ts. Every call is appended to the
 *   in-memory CostLedger returned by getCostLedger().
 */

import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import * as crypto from 'node:crypto';
import type { ModelRouter, RouteParams, LLMResponse, CostLedger, CostEntry } from './llm';
import { resolveTier, estimateUsd, TIER_MODELS } from './llm';

// ---------------------------------------------------------------------------
// AnthropicModelRouter
// ---------------------------------------------------------------------------

export class AnthropicModelRouter implements ModelRouter {
  private readonly client: Anthropic;
  private ledger: CostLedger;

  constructor(deal_id: string) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) {
      throw new Error(
        'ANTHROPIC_API_KEY missing - configure in Vercel env vars before deploying'
      );
    }

    this.client = new Anthropic({ apiKey: key });
    this.ledger = {
      deal_id,
      entries: [],
      total_usd: 0,
      total_tokens_in: 0,
      total_tokens_out: 0,
    };
  }

  // -------------------------------------------------------------------------
  // route
  // -------------------------------------------------------------------------

  async route(params: RouteParams): Promise<LLMResponse> {
    const tier = resolveTier(params.task_type, {
      tier_override: params.tier_override,
      cost_budget_usd: params.cost_budget_usd,
    });

    const model = TIER_MODELS[tier].anthropic;
    const startMs = Date.now();

    const requestParams: Anthropic.MessageCreateParamsNonStreaming = {
      model,
      max_tokens: params.max_tokens ?? 4096,
      messages: [{ role: 'user', content: params.prompt }],
    };

    if (params.system) {
      requestParams.system = params.system;
    }

    let response: Anthropic.Message;
    try {
      response = await this.client.messages.create(requestParams);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(
        `[deallenz] Anthropic API error (agent=${params.agent}, model=${model}): ${msg}`
      );
    }

    const durationMs = Date.now() - startMs;
    const tokensIn = response.usage.input_tokens;
    const tokensOut = response.usage.output_tokens;
    const usdCost = estimateUsd(tier, tokensIn, tokensOut);

    // Extract text content (filter out tool_use blocks if any)
    const content = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('');

    const entry: CostEntry = {
      call_id: crypto.randomUUID(),
      deal_id: params.deal_id,
      agent: params.agent,
      task_type: params.task_type,
      model,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      usd_cost: usdCost,
      duration_ms: durationMs,
      timestamp: new Date().toISOString(),
    };

    this.ledger.entries.push(entry);
    this.ledger.total_usd += usdCost;
    this.ledger.total_tokens_in += tokensIn;
    this.ledger.total_tokens_out += tokensOut;

    return { content, cost_entry: entry };
  }

  // -------------------------------------------------------------------------
  // getCostLedger / resetLedger
  // -------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * createModelRouter(deal_id)
 *
 * Returns a real AnthropicModelRouter.
 * Throws immediately if ANTHROPIC_API_KEY is absent.
 */
export function createModelRouter(deal_id: string): ModelRouter {
  return new AnthropicModelRouter(deal_id);
}
