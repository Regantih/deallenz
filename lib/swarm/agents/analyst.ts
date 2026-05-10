/**
 * AnalystAgent
 * Financial modelling, unit economics, and market sizing.
 *
 * Uses mid tier (claude-sonnet-4-20250514) for the main analysis call.
 * Where inputs are present in the deal record (ARR, MoM, NRR) metrics
 * are computed deterministically without an LLM call.
 */

import type { ModelRouter } from '../../llm';
import type { SwarmContext, AgentResult } from '../orchestrator';

export interface AnalystOutput {
  cac_usd: number | null;
  ltv_usd: number | null;
  payback_months: number | null;
  burn_multiple: number | null;
  rule_of_40: number | null;
  tam_usd: number | null;
  sam_usd: number | null;
  som_usd: number | null;
  notes: string;
}

export class AnalystAgent {
  constructor(private router: ModelRouter) {}

  async run(ctx: SwarmContext): Promise<AgentResult<AnalystOutput>> {
    ctx.emit('analyst:start', { deal_id: ctx.deal_id });

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

    const output = computeFromDeal(ctx) ?? parseOrFallback(analysisCall.content);

    return {
      agent: 'analyst',
      output,
      cost_entries: [classifyCall.cost_entry, analysisCall.cost_entry],
    };
  }
}

function computeFromDeal(ctx: SwarmContext): AnalystOutput | null {
  const { deal } = ctx;
  if (!deal.arr || !deal.mom) return null;

  const annualGrowthPct = (Math.pow(1 + deal.mom / 100, 12) - 1) * 100;
  const rule_of_40 = Math.round(annualGrowthPct);

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
      `CAC, LTV, payback, and burn multiple require monthly burn and new-ARR-per-month inputs.`,
  };
}

function buildAnalysisPrompt(ctx: SwarmContext): string {
  const { deal } = ctx;
  return [
    `Analyze deal: ${deal.name ?? ctx.deal_id}`,
    `ARR: ${deal.arr ?? 'unknown'} | MoM growth: ${deal.mom ?? 'unknown'}% | NRR: ${deal.nrr ?? 'unknown'}%`,
    `Logos: ${deal.logos ?? 'unknown'} | Ask: ${deal.ask ?? 'unknown'} | Pre-money: ${deal.premoney ?? 'unknown'}`,
    '',
    'Compute: CAC, LTV, payback months, burn multiple, Rule of 40, TAM, SAM, SOM.',
    'If any input is missing, set that field to null and explain in notes.',
    'Return JSON matching AnalystOutput schema.',
  ].join('\n');
}

const ANALYST_SYSTEM =
  'You are the DealLens financial analyst. Use canonical VC metric definitions. ' +
  'Never invent numbers. If inputs are missing, return null and explain in notes.';

function parseOrFallback(content: string): AnalystOutput {
  try {
    const parsed = JSON.parse(content) as Partial<AnalystOutput>;
    if ('rule_of_40' in parsed) return parsed as AnalystOutput;
  } catch { /* not JSON */ }

  return {
    cac_usd: null, ltv_usd: null, payback_months: null,
    burn_multiple: null, rule_of_40: null,
    tam_usd: null, sam_usd: null, som_usd: null,
    notes: content,
  };
}
