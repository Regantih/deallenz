/**
 * WriterAgent
 * Composes all 14 chapters of the McKinsey-grade investment memo.
 *
 * Uses mid tier (claude-sonnet-4-5-20250929) for all chapter drafts.
 * Chapters are processed in parallel batches of 3.
 */

import type { ModelRouter } from '../../llm';
import type { SwarmContext, AgentResult } from '../orchestrator';
import type { ResearcherOutput } from './researcher';
import type { AnalystOutput } from './analyst';
import type { RiskOutput } from './risk';
import { stripCodeFences } from '../parse-utils';

export const MEMO_CHAPTERS = [
  { id: 'customer', number: '01', act: 'WHY',     title: 'The Customer'             },
  { id: 'problem',  number: '02', act: 'WHY',     title: 'The Problem'              },
  { id: 'solution', number: '03', act: 'WHY',     title: 'The Solution'             },
  { id: 'company',  number: '04', act: 'WHAT',    title: 'The Company'              },
  { id: 'market',   number: '05', act: 'WHAT',    title: 'The Market (TAM/SAM/SOM)' },
  { id: 'comp',     number: '06', act: 'WHAT',    title: 'Competition'              },
  { id: 'team',     number: '07', act: 'WHO',     title: 'The Team'                 },
  { id: 'traction', number: '08', act: 'HOW',     title: 'Traction'                 },
  { id: 'moat',     number: '09', act: 'HOW',     title: 'Moat'                     },
  { id: 'macro',    number: '10', act: 'SO-WHAT', title: 'Macro'                    },
  { id: 'micro',    number: '11', act: 'SO-WHAT', title: 'Unit Economics'           },
  { id: 'geo',      number: '12', act: 'SO-WHAT', title: 'Geopolitics'              },
  { id: 'risks',    number: '13', act: 'SO-WHAT', title: 'Risks'                    },
  { id: 'verdict',  number: '14', act: 'SO-WHAT', title: 'Verdict'                  },
] as const;

export type ChapterId = (typeof MEMO_CHAPTERS)[number]['id'];

export interface ChapterDraft {
  id: ChapterId;
  title: string;
  body: string;
  data_points: string[];
  sources: string[];
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

const BATCH_SIZE = 7;

export class WriterAgent {
  constructor(private router: ModelRouter) {}

  async run(ctx: SwarmContext, inputs: WriterInputs): Promise<AgentResult<WriterOutput>> {
    ctx.emit('writer:start', { deal_id: ctx.deal_id, chapters: MEMO_CHAPTERS.length });

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
      cost_entries: [],
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
      max_tokens: 3000,
    });

    return parseChapterDraft(call.content, chapter.id, chapter.title);
  }
}

function buildChapterPrompt(
  ctx: SwarmContext,
  chapter: (typeof MEMO_CHAPTERS)[number],
  inputs: WriterInputs
): string {
  const deckContext = ctx.deal.pitch_deck_text
    ? `\nHere is the extracted text from the company's pitch deck:\n${ctx.deal.pitch_deck_text}\n`
    : '';
  return [
    `Write chapter ${chapter.number}: "${chapter.title}" for the ${ctx.deal.name ?? ctx.deal_id} investment memo.`,
    `Narrative act: ${chapter.act}`,
    '',
    `Deal record (JSON): ${JSON.stringify(ctx.deal)}`,
    deckContext,
    '',
    `Market research summary: ${inputs.research.market_summary}`,
    `Financial analysis notes: ${inputs.analyst.notes}`,
    `Risk overview: overall_severity=${inputs.risk.overall_severity}, red_flags=[${inputs.risk.red_flags.join('; ')}]`,
    '',
    'Requirements:',
    '- McKinsey IC-quality prose, 200–400 words.',
    '- Cite every factual claim with [source: URL].',
    '- No invented data, no filler.',
    '- If data is missing, state the gap explicitly.',
    'CRITICAL OUTPUT FORMAT: Respond with ONLY a raw JSON object. No prose before, no code fences, no text after.',
    'Format: {"body":"<markdown prose here>","data_points":["..."],"sources":["https://..."],"needs_review":false}',
  ].join('\n');
}

const WRITER_SYSTEM =
  'You are the DealLens memo writer. Your ENTIRE response must be a single raw JSON object — ' +
  'no prose before it, no markdown code fences around it, no text after it. ' +
  'Output ONLY: {"body":"...","data_points":[...],"sources":[...],"needs_review":false}. ' +
  'The body field contains McKinsey IC-quality markdown prose (200-400 words). ' +
  'Be precise, direct, and evidence-backed. Every factual claim must cite a source. ' +
  'Never invent data to fill gaps — acknowledge gaps honestly.';

function parseChapterDraft(
  content: string,
  id: ChapterId,
  title: string
): ChapterDraft {
  // Try 1: Full content is JSON (possibly wrapped in outer fences)
  const stripped = stripCodeFences(content);
  try {
    const parsed = JSON.parse(stripped) as Partial<ChapterDraft>;
    if (typeof parsed.body === 'string') {
      return makeChapter(id, title, parsed);
    }
  } catch { /* not JSON */ }

  // Try 2: LLM embedded a ```json block (with or WITHOUT a closing fence)
  const jsonFenceMarker = '```json\n';
  const jsonFenceIdx = content.indexOf(jsonFenceMarker);
  if (jsonFenceIdx !== -1) {
    const jsonStart = jsonFenceIdx + jsonFenceMarker.length;
    let jsonContent = content.slice(jsonStart);
    // Strip trailing closing fence if present
    const closingFenceIdx = jsonContent.lastIndexOf('\n```');
    if (closingFenceIdx !== -1) {
      jsonContent = jsonContent.slice(0, closingFenceIdx);
    } else if (jsonContent.endsWith('```')) {
      jsonContent = jsonContent.slice(0, -3);
    }
    // Try full parse first
    try {
      const parsed = JSON.parse(jsonContent.trim()) as Partial<ChapterDraft>;
      if (typeof parsed.body === 'string') {
        return makeChapter(id, title, parsed);
      }
    } catch { /* truncated or malformed JSON */ }
    // JSON parse failed (likely truncated) — extract body string value directly
    const bodyStr = extractBodyString(jsonContent);
    if (bodyStr && bodyStr.length > 50) {
      return { id, title, body: bodyStr, data_points: [], sources: [], needs_review: true };
    }
    // Use prose before the fence if substantial
    const proseBefore = content.slice(0, jsonFenceIdx).trim();
    if (proseBefore.length > 100) {
      return { id, title, body: proseBefore, data_points: [], sources: [], needs_review: true };
    }
  }

  // Final fallback: return stripped content (no code fences to remove since no closing fence)
  return { id, title, body: stripped, data_points: [], sources: [], needs_review: true };
}

function makeChapter(
  id: ChapterId,
  title: string,
  parsed: Partial<ChapterDraft>
): ChapterDraft {
  return {
    id,
    title,
    body: parsed.body!,
    data_points: parsed.data_points ?? [],
    sources: parsed.sources ?? [],
    needs_review: parsed.needs_review ?? false,
  };
}

/**
 * Extract the "body" string value from potentially truncated JSON.
 * Walks the raw string to handle escaped characters, tolerates missing closing quote.
 */
function extractBodyString(jsonContent: string): string | null {
  const bodyKeyIdx = jsonContent.indexOf('"body"');
  if (bodyKeyIdx === -1) return null;
  const colonIdx = jsonContent.indexOf(':', bodyKeyIdx + 6);
  if (colonIdx === -1) return null;
  const quoteStart = jsonContent.indexOf('"', colonIdx + 1);
  if (quoteStart === -1) return null;

  let result = '';
  let i = quoteStart + 1;
  while (i < jsonContent.length) {
    const ch = jsonContent[i];
    if (ch === '\\' && i + 1 < jsonContent.length) {
      const next = jsonContent[i + 1];
      if (next === 'n') result += '\n';
      else if (next === 't') result += '\t';
      else if (next === 'r') result += '\r';
      else if (next === '"') result += '"';
      else if (next === '\\') result += '\\';
      else result += next;
      i += 2;
    } else if (ch === '"') {
      return result; // clean end of string
    } else {
      result += ch;
      i++;
    }
  }
  // EOF before closing quote — truncated, return what we have if substantial
  return result.length > 100 ? result : null;
}
