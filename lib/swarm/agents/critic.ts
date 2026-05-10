/**
 * CriticAgent
 * QA pass against a 14-point rubric before the memo is released.
 *
 * All 14 rubric items must pass for `approved: true`.
 * Any item that fails and is marked as blocking prevents approval.
 *
 * Real implementation requires a connected LLM. (PR#5)
 */

import type { ModelRouter } from '../../llm';
import type { SwarmContext, AgentResult } from '../orchestrator';
import type { WriterOutput } from './writer';

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

export interface RubricItem {
  id: string;       // e.g. "R01"
  check: string;    // Human-readable check description
  passed: boolean;
  note: string;     // One-sentence explanation of pass/fail
  blocking: boolean; // If true and failed, memo cannot be approved
}

export interface CriticOutput {
  rubric: RubricItem[];
  /** Fraction of rubric items that passed (0–1) */
  pass_rate: number;
  /** IDs of rubric items that are blocking and failed */
  blocking_failures: string[];
  /** One-paragraph revision recommendation, or null if approved */
  recommended_revision: string | null;
  /** True only when all blocking items pass */
  approved: boolean;
}

// ---------------------------------------------------------------------------
// Rubric definition
// ---------------------------------------------------------------------------

const RUBRIC: Array<{ id: string; check: string; blocking: boolean }> = [
  { id: 'R01', blocking: true,  check: 'Every chapter has at least 100 words of substance' },
  { id: 'R02', blocking: true,  check: 'No invented data (e.g. no "$X billion market" without a cited source)' },
  { id: 'R03', blocking: true,  check: 'No lorem ipsum, "[MOCK]", or placeholder text in final output' },
  { id: 'R04', blocking: false, check: 'At least one cited source per chapter with a real HTTPS URL' },
  { id: 'R05', blocking: true,  check: 'Verdict chapter includes a clear pass / pass-with-conditions / fail recommendation' },
  { id: 'R06', blocking: false, check: 'Risk register covers at least 3 distinct risk categories' },
  { id: 'R07', blocking: false, check: 'Unit economics section either shows computed metrics or explicitly states missing inputs' },
  { id: 'R08', blocking: false, check: 'Team chapter addresses founder–market fit' },
  { id: 'R09', blocking: false, check: 'Competition chapter names real companies, not "numerous competitors"' },
  { id: 'R10', blocking: false, check: 'Macro chapter references at least one real macro indicator or policy' },
  { id: 'R11', blocking: true,  check: 'No contradictions between traction numbers across chapters' },
  { id: 'R12', blocking: false, check: 'Geopolitics chapter addresses HQ jurisdiction risks' },
  { id: 'R13', blocking: false, check: 'All chapter numbers are sequential (01–14)' },
  { id: 'R14', blocking: true,  check: 'No "Awaiting agent enrichment" or equivalent deferred-content placeholders' },
];

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

export class CriticAgent {
  constructor(private router: ModelRouter) {}

  async run(
    ctx: SwarmContext,
    draft: WriterOutput
  ): Promise<AgentResult<CriticOutput>> {
    ctx.emit('critic:start', { deal_id: ctx.deal_id });

    const call = await this.router.route({
      deal_id: ctx.deal_id,
      agent: 'critic',
      task_type: 'critique',
      system: CRITIC_SYSTEM,
      prompt: buildCritiquePrompt(ctx, draft),
      max_tokens: 1024,
    });

    ctx.emit('critic:done', { deal_id: ctx.deal_id });

    return {
      agent: 'critic',
      output: parseOrMockOutput(call.content),
      cost_entries: [call.cost_entry],
    };
  }
}

// ---------------------------------------------------------------------------
// Prompt / system
// ---------------------------------------------------------------------------

function buildCritiquePrompt(ctx: SwarmContext, draft: WriterOutput): string {
  const chapterSummaries = draft.chapters
    .map(
      c =>
        `Chapter ${c.id}: ${c.body.slice(0, 200)}…` +
        ` [sources: ${c.sources.length}] [needs_review: ${c.needs_review}]`
    )
    .join('\n');

  return [
    `Evaluate the investment memo for "${ctx.deal.name ?? ctx.deal_id}" against this rubric:`,
    '',
    RUBRIC.map(r => `${r.id} [blocking=${r.blocking}]: ${r.check}`).join('\n'),
    '',
    'Memo chapters:',
    chapterSummaries,
    '',
    'For each rubric item return: { id, check, passed: boolean, note: string, blocking: boolean }.',
    'Also return:',
    '  blocking_failures: string[] (ids of blocking items that failed)',
    '  recommended_revision: string | null (one paragraph, or null if approved)',
    '  approved: boolean (true only when all blocking items pass)',
    'Return JSON matching CriticOutput schema.',
  ].join('\n');
}

const CRITIC_SYSTEM =
  `You are the DealLens QA critic. Apply the rubric strictly. ` +
  `Do not approve memos with placeholder text, invented data, or missing critical sections. ` +
  `Your job is to protect the IC committee from bad information.`;

// ---------------------------------------------------------------------------
// Output parsing (graceful fallback for mock stub strings)
// ---------------------------------------------------------------------------

function parseOrMockOutput(content: string): CriticOutput {
  try {
    const parsed = JSON.parse(content) as Partial<CriticOutput>;
    if (Array.isArray(parsed.rubric)) return parsed as CriticOutput;
  } catch { /* mock stub string */ }

  // In mock mode: all checks pending, not approved, with a clear explanation
  const rubric: RubricItem[] = RUBRIC.map(r => ({
    ...r,
    passed: false,
    note: 'Mock mode — real critique requires a connected LLM (PR#5).',
  }));

  return {
    rubric,
    pass_rate: 0,
    blocking_failures: RUBRIC.filter(r => r.blocking).map(r => r.id),
    recommended_revision:
      'Connect a real LLM provider (PR#5) to generate a genuine QA critique.',
    approved: false,
  };
}
