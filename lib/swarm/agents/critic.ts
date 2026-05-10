/**
 * CriticAgent
 * QA pass against a 14-point rubric before the memo is released.
 *
 * Uses mid tier (claude-sonnet-4-20250514).
 * All 14 rubric items must pass for approved: true.
 * Any blocking item that fails prevents approval.
 */

import type { ModelRouter } from '../../llm';
import type { SwarmContext, AgentResult } from '../orchestrator';
import type { WriterOutput } from './writer';

export interface RubricItem {
  id: string;
  check: string;
  passed: boolean;
  note: string;
  blocking: boolean;
}

export interface CriticOutput {
  rubric: RubricItem[];
  pass_rate: number;
  blocking_failures: string[];
  recommended_revision: string | null;
  approved: boolean;
}

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
  { id: 'R14', blocking: true,  check: 'No deferred-content placeholders anywhere in the output' },
];

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
      output: parseOrFallback(call.content),
      cost_entries: [call.cost_entry],
    };
  }
}

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
    'Also return: blocking_failures (ids), recommended_revision (string|null), approved (boolean).',
    'Return JSON matching CriticOutput schema.',
  ].join('\n');
}

const CRITIC_SYSTEM =
  'You are the DealLens QA critic. Apply the rubric strictly. ' +
  'Do not approve memos with placeholder text, invented data, or missing critical sections.';

function parseOrFallback(content: string): CriticOutput {
  try {
    const parsed = JSON.parse(content) as Partial<CriticOutput>;
    if (Array.isArray(parsed.rubric)) return parsed as CriticOutput;
  } catch { /* not JSON */ }

  const rubric: RubricItem[] = RUBRIC.map(r => ({
    ...r,
    passed: false,
    note: 'LLM response was not valid JSON — review required.',
  }));

  return {
    rubric,
    pass_rate: 0,
    blocking_failures: RUBRIC.filter(r => r.blocking).map(r => r.id),
    recommended_revision: 'LLM returned non-JSON output. Re-run critique.',
    approved: false,
  };
}
