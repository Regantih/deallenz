/**
 * WriterAgent
 * Composes all 14 chapters of the McKinsey-grade investment memo.
 *
 * Chapters are processed in parallel batches of 3 to stay within
 * reasonable context window limits.
 *
 * Real implementation requires a connected LLM. (PR#5)
 */

import type { ModelRouter } from '../../llm';
import type { SwarmContext, AgentResult } from '../orchestrator';
import type { ResearcherOutput } from './researcher';
import type { AnalystOutput } from './analyst';
import type { RiskOutput } from './risk';

// ---------------------------------------------------------------------------
// Chapter manifest (mirrors deal.html CH array and D-015)
// ---------------------------------------------------------------------------

export const MEMO_CHAPTERS = [
  { id: 'customer', number: '01', act: 'WHY',     title: 'The Customer'          },
  { id: 'problem',  number: '02', act: 'WHY',     title: 'The Problem'           },
  { id: 'solution', number: '03', act: 'WHY',     title: 'The Solution'          },
  { id: 'company',  number: '04', act: 'WHAT',    title: 'The Company'           },
  { id: 'market',   number: '05', act: 'WHAT',    title: 'The Market (TAM/SAM/SOM)' },
  { id: 'comp',     number: '06', act: 'WHAT',    title: 'Competition'           },
  { id: 'team',     number: '07', act: 'WHO',     title: 'The Team'              },
  { id: 'traction', number: '08', act: 'HOW',     title: 'Traction'              },
  { id: 'moat',     number: '09', act: 'HOW',     title: 'Moat'                  },
  { id: 'macro',    number: '10', act: 'SO-WHAT', title: 'Macro'                 },
  { id: 'micro',    number: '11', act: 'SO-WHAT', title: 'Unit Economics'        },
  { id: 'geo',      number: '12', act: 'SO-WHAT', title: 'Geopolitics'           },
  { id: 'risks',    number: '13', act: 'SO-WHAT', title: 'Risks'                 },
  { id: 'verdict',  number: '14', act: 'SO-WHAT', title: 'Verdict'               },
] as const;

export type ChapterId = (typeof MEMO_CHAPTERS)[number]['id'];

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

export interface ChapterDraft {
  id: ChapterId;
  title: string;
  /** Markdown prose, McKinsey-grade */
  body: string;
  /** Cited facts/numbers extracted by the writer */
  data_points: string[];
  /** Source URLs cited in this chapter */
  sources: string[];
  /** True if the chapter needs human review before publication */
  needs_review: boolean;
}

export interface WriterOutput {
  chapters: ChapterDraft[];
  word_count: number;
  notes: string;
}

export interface WriterInputs {
  research: ResearcherOutput;
  analyst: AnalystOutput;
  risk: RiskOutput;
}

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

const BATCH_SIZE = 3; // chapters per parallel batch

export class WriterAgent {
  constructor(private router: ModelRouter) {}

  async run(ctx: SwarmContext, inputs: WriterInputs): Promise<AgentResult<WriterOutput>> {
    ctx.emit('writer:start', {
      deal_id: ctx.deal_id,
      chapters: MEMO_CHAPTERS.length,
    });

    const drafts: ChapterDraft[] = [];

    for (let i = 0; i < MEMO_CHAPTERS.length; i += BATCH_SIZE) {
      const batch = MEMO_CHAPTERS.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(ch => this.writeChapter(ctx, ch, inputs))
      );
      drafts.push(...results);
      ctx.emit('writer:progress', {
        deal_id: ctx.deal_id,
        completed: drafts.length,
        total: MEMO_CHAPTERS.length,
      });
    }

    const word_count = drafts.reduce(
      (sum, ch) => sum + ch.body.split(/\s+/).filter(Boolean).length,
      0
    );

    ctx.emit('writer:done', { deal_id: ctx.deal_id, word_count });

    return {
      agent: 'writer',
      output: { chapters: drafts, word_count, notes: '' },
      cost_entries: [], // individual entries already recorded in router ledger
    };
  }

  private async writeChapter(
    ctx: SwarmContext,
    chapter: (typeof MEMO_CHAPTERS)[number],
    inputs: WriterInputs
  ): Promise<ChapterDraft> {
    const call = await this.router.route({
      deal_id: ctx.deal_id,
      agent: 'writer',
      task_type: 'write',
      system: WRITER_SYSTEM,
      prompt: buildChapterPrompt(ctx, chapter, inputs),
      max_tokens: 1500,
    });

    return parseChapterDraft(call.content, chapter.id, chapter.title);
  }
}

// ---------------------------------------------------------------------------
// Prompt / system
// ---------------------------------------------------------------------------

function buildChapterPrompt(
  ctx: SwarmContext,
  chapter: (typeof MEMO_CHAPTERS)[number],
  inputs: WriterInputs
): string {
  return [
    `Write chapter ${chapter.number}: "${chapter.title}" for the ${ctx.deal.name ?? ctx.deal_id} investment memo.`,
    `Narrative act: ${chapter.act}`,
    '',
    `Deal record (JSON): ${JSON.stringify(ctx.deal)}`,
    '',
    `Market research summary: ${inputs.research.market_summary}`,
    `Financial analysis notes: ${inputs.analyst.notes}`,
    `Risk overview: overall_severity=${inputs.risk.overall_severity}, ` +
      `red_flags=[${inputs.risk.red_flags.join('; ')}]`,
    '',
    'Requirements:',
    '- McKinsey IC-quality prose, 200–400 words.',
    '- Cite every factual claim with [source: URL].',
    '- No invented data, no filler, no lorem ipsum.',
    '- If data is missing for a claim, omit the claim or state the gap explicitly.',
    '- Return JSON: { body: string, data_points: string[], sources: string[], needs_review: boolean }',
  ].join('\n');
}

const WRITER_SYSTEM =
  `You are the DealLens memo writer. Write investment memo chapters at McKinsey IC quality. ` +
  `Be precise, direct, and evidence-backed. Every factual claim must cite a source. ` +
  `Never invent data to fill gaps — acknowledge gaps honestly.`;

// ---------------------------------------------------------------------------
// Output parsing
// ---------------------------------------------------------------------------

function parseChapterDraft(
  content: string,
  id: ChapterId,
  title: string
): ChapterDraft {
  try {
    const parsed = JSON.parse(content) as Partial<ChapterDraft>;
    if (typeof parsed.body === 'string') {
      return {
        id,
        title,
        body: parsed.body,
        data_points: parsed.data_points ?? [],
        sources: parsed.sources ?? [],
        needs_review: parsed.needs_review ?? false,
      };
    }
  } catch { /* mock stub string */ }

  return {
    id,
    title,
    body: content,
    data_points: [],
    sources: [],
    needs_review: true, // always flag mock output for human review
  };
}
