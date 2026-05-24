/**
 * RiskAgent
 * Generates a structured risk register and red-flag summary.
 *
 * Uses mid tier (claude-sonnet-4-5-20250929) for the analysis call.
 */

import type { ModelRouter } from '../../llm';
import type { SwarmContext, AgentResult } from '../orchestrator';
import { stripCodeFences } from '../parse-utils';

export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';
export type RiskCategory =
  | 'market' | 'execution' | 'team' | 'financial'
  | 'regulatory' | 'technology' | 'geo';

export interface RiskItem {
  id: string;
  category: RiskCategory;
  title: string;
  description: string;
  severity: RiskSeverity;
  mitigation: string | null;
}

export interface RiskOutput {
  risks: RiskItem[];
  red_flags: string[];
  overall_severity: RiskSeverity;
  notes: string;
}

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
      output: parseOrFallback(call.content),
      cost_entries: [call.cost_entry],
    };
  }
}

function buildRiskPrompt(ctx: SwarmContext): string {
  const { deal } = ctx;
  const deckContext = deal.pitch_deck_text
    ? `\nHere is the extracted text from the company's pitch deck:\n${deal.pitch_deck_text}\n`
    : '';
  return [
    `Generate a risk register for: ${deal.name ?? ctx.deal_id}`,
    `Stage: ${deal.stage ?? 'unknown'} | Sector: ${deal.sector ?? 'unknown'} | HQ: ${deal.hq ?? 'unknown'}`,
    `Thesis: ${deal.thesis ?? 'not provided'}`,
    deckContext,
    '',
    'For each risk provide: id (RISK-NN), category, title, description (max 2 sentences), severity, mitigation or null.',
    'Also: red_flags (deal-breaker signals), overall_severity (highest present).',
    'Omit categories you have no data to assess. Return JSON matching RiskOutput schema.',
  ].join('\n');
}

const RISK_SYSTEM =
  'You are the DealLens risk analyst. Surface real, deal-specific risks based on sector, stage, and geography. ' +
  'Never use generic boilerplate. If you lack data to assess a risk category, omit it.';

function parseOrFallback(content: string): RiskOutput {
  try {
    const parsed = JSON.parse(stripCodeFences(content)) as Partial<RiskOutput>;
    if (Array.isArray(parsed.risks)) return parsed as RiskOutput;
  } catch { /* not JSON */ }

  return {
    risks: [],
    red_flags: [],
    overall_severity: 'medium',
    notes: stripCodeFences(content),
  };
}
