/**
 * ModelRouter — MVI (Mixture of Verified Inferences) routing layer.
 *
 * Selects between cheap / mid / deep model tiers based on task type and
 * an optional per-call cost budget. Tracks every LLM call in a CostLedger
 * for the cost-transparency UI.
 *
 * Real adapters: lib/llm.anthropic.ts, lib/llm.openai.ts  (PR#5)
 * Mock:          lib/llm.mock.ts
 *
 * MVI downgrade ladder:  deep → mid → cheap
 * (Upgrade is never automatic; use tier_override to go up intentionally.)
 */

// ---------------------------------------------------------------------------
// Task taxonomy
// ---------------------------------------------------------------------------

/**
 * TaskType drives the default model tier selection.
 * cheap  → Haiku / GPT-4o-mini   (fast, low cost, good for extraction/classification)
 * mid    → Sonnet / GPT-4o       (best value for research + analysis)
 * deep   → Opus / o1             (reserved for long-form writing only)
 */
export type TaskType =
  | 'extract'    // Parse a PDF/doc and pull structured fields
  | 'classify'   // Short classification or routing decision
  | 'research'   // Multi-hop web + doc retrieval synthesis
  | 'analyze'    // Financial/market analysis with reasoning
  | 'write'      // Long-form memo chapter composition
  | 'critique';  // QA rubric pass against a full draft

export type ModelTier = 'cheap' | 'mid' | 'deep';

// ---------------------------------------------------------------------------
// Model catalogue (provider-agnostic symbolic names)
// ---------------------------------------------------------------------------

/** Canonical model IDs per tier, per provider. Updated here when models change. */
export const TIER_MODELS: Record<ModelTier, { anthropic: string; openai: string }> = {
  cheap: { anthropic: 'claude-haiku-4-5',  openai: 'gpt-4o-mini' },
  mid:   { anthropic: 'claude-sonnet-4-5', openai: 'gpt-4o'      },
  deep:  { anthropic: 'claude-opus-4-5',   openai: 'o1'          },
};

/** Default tier assigned to each task type. */
export const DEFAULT_TASK_TIERS: Record<TaskType, ModelTier> = {
  extract:  'cheap',
  classify: 'cheap',
  research: 'mid',
  analyze:  'mid',
  write:    'deep',
  critique: 'mid',
};

// ---------------------------------------------------------------------------
// Cost ledger
// ---------------------------------------------------------------------------

export interface CostEntry {
  call_id: string;       // UUID
  deal_id: string;
  agent: string;         // e.g. "researcher", "writer"
  task_type: TaskType;
  model: string;         // Resolved model string e.g. "claude-haiku-4-5"
  tokens_in: number;
  tokens_out: number;
  usd_cost: number;      // Calculated at call-time from known pricing
  duration_ms: number;
  timestamp: string;     // ISO-8601
}

export interface CostLedger {
  deal_id: string;
  entries: CostEntry[];
  total_usd: number;
  total_tokens_in: number;
  total_tokens_out: number;
}

// ---------------------------------------------------------------------------
// Router interface
// ---------------------------------------------------------------------------

export interface RouteParams {
  deal_id: string;
  agent: string;
  task_type: TaskType;
  /** Force a specific tier, overriding the default task-to-tier mapping. */
  tier_override?: ModelTier;
  /**
   * Maximum USD to spend on this single call.
   * If the estimated cost at the chosen tier exceeds this budget, the router
   * automatically downgrades to the next cheaper tier.
   */
  cost_budget_usd?: number;
  prompt: string;
  system?: string;
  max_tokens?: number;
}

export interface LLMResponse {
  content: string;
  cost_entry: CostEntry;
}

export interface ModelRouter {
  /**
   * Route the call to the appropriate model, execute it, record cost, and
   * return the response with a cost_entry.
   */
  route(params: RouteParams): Promise<LLMResponse>;

  /** Return the accumulated CostLedger for all calls routed through this instance. */
  getCostLedger(): CostLedger;

  /** Reset the ledger (e.g. between deals in tests). */
  resetLedger(deal_id: string): void;
}

// ---------------------------------------------------------------------------
// MVI routing helpers (pure, model-agnostic)
// ---------------------------------------------------------------------------

/**
 * Resolve the appropriate model tier for a task, respecting budget constraints.
 *
 * Algorithm:
 *  1. Start from tier_override if supplied, else DEFAULT_TASK_TIERS[taskType].
 *  2. If cost_budget_usd and tokens_estimate are both provided, estimate cost
 *     at the chosen tier. While cost > budget and tier > cheap, downgrade one step.
 */
export function resolveTier(
  taskType: TaskType,
  options: {
    tier_override?: ModelTier;
    cost_budget_usd?: number;
    tokens_estimate?: number;
  } = {}
): ModelTier {
  let tier: ModelTier = options.tier_override ?? DEFAULT_TASK_TIERS[taskType];

  if (
    options.cost_budget_usd !== undefined &&
    options.tokens_estimate !== undefined
  ) {
    const ladderDown = (t: ModelTier): ModelTier =>
      t === 'deep' ? 'mid' : 'cheap';

    let estimated = estimateUsd(
      tier,
      options.tokens_estimate,
      Math.round(options.tokens_estimate * 0.3)
    );
    while (estimated > options.cost_budget_usd && tier !== 'cheap') {
      tier = ladderDown(tier);
      estimated = estimateUsd(
        tier,
        options.tokens_estimate,
        Math.round(options.tokens_estimate * 0.3)
      );
    }
  }

  return tier;
}

/**
 * Estimate USD cost using Anthropic public pricing (May 2025).
 * OpenAI adapter uses the same function with a pricing override.
 *
 * Haiku:  $0.80 / $4.00  per million tokens (in / out)
 * Sonnet: $3.00 / $15.00 per million tokens
 * Opus:   $15.00 / $75.00 per million tokens
 */
export function estimateUsd(
  tier: ModelTier,
  tokensIn: number,
  tokensOut: number
): number {
  const pricing: Record<ModelTier, [number, number]> = {
    cheap: [0.80,  4.00],
    mid:   [3.00,  15.00],
    deep:  [15.00, 75.00],
  };
  const [inRate, outRate] = pricing[tier];
  return (tokensIn / 1_000_000) * inRate + (tokensOut / 1_000_000) * outRate;
}
