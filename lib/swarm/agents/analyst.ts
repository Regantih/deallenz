/**
 * AnalystAgent
 * Financial modelling, unit economics, and market sizing.
 *
 * Where inputs are present in the deal record (ARR, MoM, NRR) metrics are
 * computed deterministically without an LLM call. The LLM is used only for
 * market sizing and for fields that require contextual reasoning.
 *
 * Real implementation requires deal financials as input. (PR#5)
 */

import type { ModelRouter } from '../../llm';
import type { SwarmContext, AgentResult } from '../orchestrator';

// ---------------------------------------------------------------------------
// Output type
// ---------------------------------------------------------------------------

export interface AnalystOutput {
  /** Customer Acquisition Cost in USD, or null if inputs are missing */
  cac_usd: number | null;
  /** Lifetime Value in USD, or null if inputs are missing */
  ltv_usd: number | null;
  /** LTV/CAC payback in months, or null */
  payback_months: number | null;
  /** Burn Multiple = net burn / net new ARR, or null */
  burn_multiple: number | null;
  /** Growth Rate + Margin (canonical Rule of 40), or null */
  rule_of_40: number | null;
  /** Total Addressable Market in USD, or null */
  tam_usd: number | null;
  /** Serviceable Addressable Market in USD, or null */
  sam_usd: number | null;
  /** Serviceable Obtainable Market in USD, or null */
  som_usd: number | null;
  /** Human-readable notes explaining null fields and methodology */
  notes: string;
}

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

export class AnalystAgent {
  constructor(private router: ModelRouter) {}

  async run(ctx: SwarmContext): Promise<AgentResult<AnalystOutput>> {
    ctx.emit('analyst:start', { deal_id: ctx.deal_id });

    // Cheap classification call: how complex is this deal?
    const classifyCall = await this.router.route({
      deal_id: ctx.deal_id,
      agent: 'analyst',
      task_type: 'classify',
      prompt:
        `Deal: ${ctx.deal.name ?? ctx.deal_id}. ` +
        `Stage: ${ctx.deal.stage ?? 'unknown'}. ` +
        `ARR: ${ctx.deal.arr ?? 'unknown'}. ` +
        `Classify analysis complexity: low | medium | high.`,
      max_tokens: 64,
    });

    // Main analysis call
    const analysisCall = await this.router.route({
      deal_id: ctx.deal_id,
      agent: 'analyst',
      task_type: 'analyze',
      system: ANALYST_SYSTEM,
      prompt: buildAnalysisPrompt(ctx),
      max_tokens: 1024,
    });

    ctx.emit('analyst:done', {
      deal_id: ctx.deal_id,
      cost: analysisCall.cost_entry.usd_cost,
    });

    // Prefer deterministic computation over LLM output when inputs exist
    const output = computeFromDeal(ctx) ?? parseOrMockOutput(analysisCall.content);

    return {
      agent: 'analyst',
      output,
      cost_entries: [classifyCall.cost_entry, analysisCall.cost_entry],
    };
  }
}

// ---------------------------------------------------------------------------
// Deterministic computation (no LLM needed when inputs are available)
// ---------------------------------------------------------------------------

/**
 * Compute metrics directly from deal JSON fields.
 * Returns null if data is insufficient (caller falls back to LLM output).
 *
 * Definitions per D-019:
 *   Rule of 40 = annualized_growth_pct + net_margin_pct
 *   (margin unknown → contribute 0; flagged in notes)
 */
function computeFromDeal(ctx: SwarmContext): AnalystOutput | null {
  const { deal } = ctx;
  if (!deal.arr || !deal.mom) return null;

  const annualGrowthPct = (Math.pow(1 + deal.mom / 100, 12) - 1) * 100;
  const rule_of_40 = Math.round(annualGrowthPct); // margin = 0 (unknown)

  return {
    cac_usd: null,
    ltv_usd: null,
    payback_months: null,
    burn_multiple: null,
    rule_of_40,
    tam_usd: null,
    sam_usd: null,
    som_usd: null,
    notes:
      `Rule of 40 computed from MoM growth (${deal.mom}% → ${annualGrowthPct.toFixed(1)}% annualised); ` +
      `net margin set to 0 (not provided). ` +
      `CAC, LTV, payback, and burn multiple require monthly burn and new-ARR-per-month inputs — ` +
      `please upload financials or provide these figures in the deal record.`,
  };
}

// ---------------------------------------------------------------------------
// Prompt / system
// ---------------------------------------------------------------------------

function buildAnalysisPrompt(ctx: SwarmContext): string {
  const { deal } = ctx;
  return [
    `Analyze deal: ${deal.name ?? ctx.deal_id}`,
    `ARR: ${deal.arr ?? 'unknown'} | MoM growth: ${deal.mom ?? 'unknown'}% | NRR: ${deal.nrr ?? 'unknown'}%`,
    `Logos: ${deal.logos ?? 'unknown'} | Ask: ${deal.ask ?? 'unknown'} | Pre-money: ${deal.premoney ?? 'unknown'}`,
    '',
    'Compute: CAC, LTV, payback months, burn multiple, Rule of 40, TAM, SAM, SOM.',
    'Use canonical definitions from D-019.',
    'If any input is missing, set that field to null and explain in notes.',
    'Return JSON matching AnalystOutput schema.',
  ].join('\n');
}

const ANALYST_SYSTEM =
  `You are the DealLens financial analyst. Use canonical VC metric definitions (D-019). ` +
  `Never invent numbers. If inputs are missing, return null for that field and explain clearly in notes.`;

function parseOrMockOutput(content: string): AnalystOutput {
  try {
    const parsed = JSON.parse(content) as Partial<AnalystOutput>;
    if ('rule_of_40' in parsed) return parsed as AnalystOutput;
  } catch { /* mock stub string */ }

  return {
    cac_usd: null,
    ltv_usd: null,
    payback_months: null,
    burn_multiple: null,
    rule_of_40: null,
    tam_usd: null,
    sam_usd: null,
    som_usd: null,
    notes: content,
  };
}
