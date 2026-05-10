/**
 * RiskAgent
 * Generates a structured risk register and red-flag summary.
 *
 * Real implementation requires a connected LLM. (PR#5)
 * In mock mode, returns an empty register with a clear explanation.
 */

import type { ModelRouter } from '../../llm';
import type { SwarmContext, AgentResult } from '../orchestrator';

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';

export type RiskCategory =
  | 'market'
  | 'execution'
  | 'team'
  | 'financial'
  | 'regulatory'
  | 'technology'
  | 'geo';

export interface RiskItem {
  id: string;                  // e.g. "RISK-01"
  category: RiskCategory;
  title: string;
  description: string;         // Max 2 sentences
  severity: RiskSeverity;
  mitigation: string | null;   // One sentence, or null if none identified
}

export interface RiskOutput {
  risks: RiskItem[];
  red_flags: string[];         // Deal-breaker signals as plain strings
  overall_severity: RiskSeverity; // Highest severity present
  notes: string;
}

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

export class RiskAgent {
  constructor(private router: ModelRouter) {}

  async run(ctx: SwarmContext): Promise<AgentResult<RiskOutput>> {
    ctx.emit('risk:start', { deal_id: ctx.deal_id });

    const call = await this.router.route({
      deal_id: ctx.deal_id,
      agent: 'risk',
      task_type: 'analyze',
      system: RISK_SYSTEM,
      prompt: buildRiskPrompt(ctx),
      max_tokens: 1024,
    });

    ctx.emit('risk:done', {
      deal_id: ctx.deal_id,
      cost: call.cost_entry.usd_cost,
    });

    return {
      agent: 'risk',
      output: parseOrMockOutput(call.content),
      cost_entries: [call.cost_entry],
    };
  }
}

// ---------------------------------------------------------------------------
// Prompt / system
// ---------------------------------------------------------------------------

function buildRiskPrompt(ctx: SwarmContext): string {
  const { deal } = ctx;
  return [
    `Generate a risk register for: ${deal.name ?? ctx.deal_id}`,
    `Stage: ${deal.stage ?? 'unknown'} | Sector: ${deal.sector ?? 'unknown'} | HQ: ${deal.hq ?? 'unknown'}`,
    `Thesis: ${deal.thesis ?? 'not provided'}`,
    '',
    'For each risk provide:',
    '  - id (RISK-NN), category (market/execution/team/financial/regulatory/technology/geo)',
    '  - title (< 10 words), description (max 2 sentences), severity (low/medium/high/critical)',
    '  - mitigation (one sentence) or null',
    '',
    'Also list red_flags as plain strings (deal-breaker signals).',
    'Set overall_severity to the highest risk severity present.',
    'Omit risk categories you have no data to assess — do not fabricate.',
    'Return JSON matching RiskOutput schema.',
  ].join('\n');
}

const RISK_SYSTEM =
  `You are the DealLens risk analyst. Surface real, deal-specific risks based on sector, stage, and geography. ` +
  `Never use generic boilerplate. If you lack data to assess a risk category, omit it.`;

// ---------------------------------------------------------------------------
// Output parsing
// ---------------------------------------------------------------------------

function parseOrMockOutput(content: string): RiskOutput {
  try {
    const parsed = JSON.parse(content) as Partial<RiskOutput>;
    if (Array.isArray(parsed.risks)) return parsed as RiskOutput;
  } catch { /* mock stub string */ }

  return {
    risks: [],
    red_flags: [],
    overall_severity: 'medium',
    notes: content,
  };
}
