/**
 * ResearcherAgent
 * Web + document retrieval for a deal record.
 *
 * Real implementation: Tavily / Firecrawl MCP tools (PR#5).
 * In mock mode, ModelRouter returns stub strings; this agent wraps them
 * into the typed ResearcherOutput shape.
 */

import type { ModelRouter } from '../../llm';
import type { SwarmContext, AgentResult } from '../orchestrator';

// ---------------------------------------------------------------------------
// Output type
// ---------------------------------------------------------------------------

export interface ResearcherOutput {
  market_summary: string;
  competitors: Array<{ name: string; differentiation: string }>;
  macro_signals: Array<{ signal: string; direction: 'tailwind' | 'headwind' }>;
  sources: Array<{ title: string; url: string; snippet: string }>;
}

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

export class ResearcherAgent {
  constructor(private router: ModelRouter) {}

  async run(ctx: SwarmContext): Promise<AgentResult<ResearcherOutput>> {
    ctx.emit('researcher:start', { deal_id: ctx.deal_id });

    const call = await this.router.route({
      deal_id: ctx.deal_id,
      agent: 'researcher',
      task_type: 'research',
      system: RESEARCHER_SYSTEM,
      prompt: buildResearchPrompt(ctx),
      max_tokens: 2048,
    });

    ctx.emit('researcher:done', {
      deal_id: ctx.deal_id,
      cost: call.cost_entry.usd_cost,
    });

    return {
      agent: 'researcher',
      output: parseOrMockOutput(call.content),
      cost_entries: [call.cost_entry],
    };
  }
}

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

function buildResearchPrompt(ctx: SwarmContext): string {
  return [
    `Deal: ${ctx.deal.name ?? ctx.deal_id}`,
    `Sector: ${ctx.deal.sector ?? 'unknown'}`,
    `Thesis: ${ctx.deal.thesis ?? 'not provided'}`,
    `HQ: ${ctx.deal.hq ?? 'unknown'}`,
    '',
    'Research tasks:',
    '1. Summarize the total addressable market (TAM/SAM/SOM) with citations.',
    '2. List the top 5 competitors with a one-line differentiation note each.',
    '3. Identify 3 macro tailwinds and 2 macro headwinds with evidence.',
    '4. Return ALL sources used: title, URL, one-sentence snippet.',
    '',
    'Rules:',
    '- Never invent company names, market sizes, or URLs.',
    '- If you cannot find real data for a field, return an empty array for that field.',
    '- Return valid JSON matching ResearcherOutput schema.',
  ].join('\n');
}

const RESEARCHER_SYSTEM =
  `You are the DealLens research agent. Synthesize market intelligence for VC deal memos. ` +
  `Be factual and cite real sources. Never invent names, numbers, or URLs. ` +
  `If data is unavailable, say so explicitly. Return structured JSON only.`;

// ---------------------------------------------------------------------------
// Output parsing (graceful fallback for mock stub strings)
// ---------------------------------------------------------------------------

function parseOrMockOutput(content: string): ResearcherOutput {
  try {
    const parsed = JSON.parse(content) as Partial<ResearcherOutput>;
    if (typeof parsed.market_summary === 'string') {
      return parsed as ResearcherOutput;
    }
  } catch { /* not JSON — must be mock stub string */ }

  return {
    market_summary: content,
    competitors: [],
    macro_signals: [],
    sources: [],
  };
}
