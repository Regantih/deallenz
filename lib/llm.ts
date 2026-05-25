import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

/**
 * ModelRouter — MVI (Mixture of Verified Inferences) routing layer.
 *
 * Selects between cheap / mid / deep model tiers based on task type and
 * an optional per-call cost budget. Tracks every LLM call in a CostLedger
 * for the cost-transparency UI.
 *
 * Real adapter: lib/llm.anthropic.ts  (WIRED — ANTHROPIC_API_KEY required)
 * Mock:         lib/llm.mock.ts       (dev/staging only; throws in prod)
 *
 * MVI downgrade ladder:  deep → mid → cheap
 * (Upgrade is never automatic; use tier_override to go up intentionally.)
 *
 * Default model assignments (PR7):
 *   cheap → claude-haiku-4-5-20250929  (researcher, risk classifier)
 *   mid   → claude-sonnet-4-5-20250929  (analyst, writer, critic)
 *   deep  → claude-opus-4-5           (manual override only)
 */

// ---------------------------------------------------------------------------
// Task taxonomy
// ---------------------------------------------------------------------------

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
  cheap: { anthropic: 'claude-haiku-4-5-20250929',   openai: 'gpt-4o-mini' },
  mid:   { anthropic: 'claude-sonnet-4-5-20250929',  openai: 'gpt-4o'      },
  deep:  { anthropic: 'claude-opus-4-5-20250929',    openai: 'o1'          },
};

/**
 * Default tier assigned to each task type.
 *
 * researcher/risk-classifier → cheap (haiku)
 * analyst/writer/critic      → mid   (sonnet)
 * deep tier is never used by default; force via tier_override.
 */
export const DEFAULT_TASK_TIERS: Record<TaskType, ModelTier> = {
  extract:  'cheap',
  classify: 'cheap',
  research: 'cheap',
  analyze:  'mid',
  write:    'mid',
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
  model: string;         // Resolved model string e.g. "claude-sonnet-4-5-20250929"
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
 *
 * Haiku-4-5:   $0.80 / $4.00   per million tokens (in / out)
 * Sonnet-4:    $3.00 / $15.00  per million tokens
 * Opus-4-5:   $15.00 / $75.00  per million tokens
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

export interface LLMOptions {
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
  temperature?: number;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Timeout'));
    }, timeoutMs);
    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export async function generateText(options: LLMOptions): Promise<string> {
  const useLocal = process.env.USE_LOCAL_LLM === 'true';
  const timeoutMs = parseInt(process.env.LOCAL_LLM_TIMEOUT_MS || '5000', 10);

  if (useLocal) {
    try {
      console.log('[LLM] Attempting local generateText...');
      const openai = new OpenAI({
        baseURL: process.env.LOCAL_LLM_BASE_URL || 'http://localhost:8000/v1',
        apiKey: 'not-needed',
      });
      const response = await withTimeout(
        openai.chat.completions.create({
          model: process.env.LOCAL_LLM_MODEL || 'Qwen/Qwen2.5-7B-Instruct',
          messages: [
            { role: 'system', content: options.systemPrompt },
            { role: 'user', content: options.userMessage },
          ],
          max_tokens: options.maxTokens || 1500,
          temperature: options.temperature ?? 0.7,
        }),
        timeoutMs
      );
      console.log('[LLM] local');
      return response.choices[0]?.message?.content || '';
    } catch (err) {
      console.warn('[LLM] Local generateText failed, falling back to Anthropic...', err);
    }
  }

  // Fallback to Anthropic Claude
  console.log('[LLM] Attempting Anthropic generateText...');
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: options.maxTokens || 1500,
    temperature: options.temperature ?? 0.7,
    system: options.systemPrompt,
    messages: [{ role: 'user', content: options.userMessage }],
  });
  console.log('[LLM] claude');
  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');
}

export async function streamText(options: LLMOptions): Promise<ReadableStream> {
  const useLocal = process.env.USE_LOCAL_LLM === 'true';
  const timeoutMs = parseInt(process.env.LOCAL_LLM_TIMEOUT_MS || '5000', 10);

  if (useLocal) {
    try {
      console.log('[LLM] Attempting local streamText...');
      const openai = new OpenAI({
        baseURL: process.env.LOCAL_LLM_BASE_URL || 'http://localhost:8000/v1',
        apiKey: 'not-needed',
      });
      const response = await withTimeout(
        openai.chat.completions.create({
          model: process.env.LOCAL_LLM_MODEL || 'Qwen/Qwen2.5-7B-Instruct',
          messages: [
            { role: 'system', content: options.systemPrompt },
            { role: 'user', content: options.userMessage },
          ],
          max_tokens: options.maxTokens || 1500,
          temperature: options.temperature ?? 0.7,
          stream: true,
        }),
        timeoutMs
      );
      console.log('[LLM] local');
      const encoder = new TextEncoder();
      return new ReadableStream({
        async start(controller) {
          for await (const chunk of response) {
            const text = chunk.choices[0]?.delta?.content || '';
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
          controller.close();
        },
      });
    } catch (err) {
      console.warn('[LLM] Local streamText failed, falling back to Anthropic...', err);
    }
  }

  // Fallback to Anthropic Claude
  console.log('[LLM] Attempting Anthropic streamText...');
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: options.maxTokens || 1500,
    temperature: options.temperature ?? 0.7,
    system: options.systemPrompt,
    messages: [{ role: 'user', content: options.userMessage }],
    stream: true,
  });
  console.log('[LLM] claude');
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      for await (const chunk of response) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });
}
