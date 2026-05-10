/**
 * SwarmOrchestrator
 * Hierarchical deal enrichment pipeline:
 *   plan → dispatch → gather → compose → critique → finalize
 *
 * Emits granular ProgressEvents throughout so the UI can show live status.
 * Aggregates CostLedger across all agents and attaches it to the returned
 * DealRecord, enabling the cost-transparency UI.
 *
 * Usage (mock mode):
 *   const router  = new MockModelRouter(deal.id);
 *   const storage = new MockStorageClient();
 *   const orch    = new SwarmOrchestrator(router, storage);
 *   orch.onProgress((type, payload) => console.log(type, payload));
 *   const enriched = await orch.run(deal);
 */

import type { ModelRouter, CostLedger, CostEntry } from '../llm';
import type { StorageClient } from '../storage';
import type { ResearcherOutput } from './agents/researcher';
import type { AnalystOutput } from './agents/analyst';
import type { RiskOutput } from './agents/risk';
import type { WriterOutput } from './agents/writer';
import type { CriticOutput } from './agents/critic';
import { ResearcherAgent } from './agents/researcher';
import { AnalystAgent } from './agents/analyst';
import { RiskAgent } from './agents/risk';
import { WriterAgent } from './agents/writer';
import { CriticAgent } from './agents/critic';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Minimal DealRecord shape.
 * Superset of deals/pqc-bank.json; swarm output and cost ledger are injected.
 */
export interface DealRecord {
  id: string;
  name?: string;
  stage?: string;
  sector?: string;
  hq?: string;
  url?: string;
  thesis?: string;
  ask?: number;
  premoney?: number;
  lead?: string;
  icp?: string;
  jtbd?: string;
  wtp?: string;
  founders?: string[];
  arr?: number;
  mom?: number;
  logos?: number;
  nrr?: number;
  status?: string;
  submitted_at?: string;
  /** Populated by SwarmOrchestrator after a successful run */
  swarm_output?: SwarmOutput;
  /** Aggregated cost ledger across all agent calls */
  cost_ledger?: CostLedger;
}

export interface SwarmContext {
  deal_id: string;
  deal: DealRecord;
  emit: ProgressEmitter;
}

export type ProgressEmitter = (
  type: string,
  payload: Record<string, unknown>
) => void;

export interface AgentResult<T> {
  agent: string;
  output: T;
  cost_entries: CostEntry[];
}

export interface SwarmOutput {
  research: ResearcherOutput;
  analyst: AnalystOutput;
  risk: RiskOutput;
  memo: WriterOutput;
  critique: CriticOutput;
}

export interface OrchestratorSummary {
  deal_id: string;
  approved: boolean;
  pass_rate: number;
  total_usd: number;
  memo_word_count: number;
  blocking_failures: string[];
  completed_at: string;
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export class SwarmOrchestrator {
  private progressListeners: Array<
    (type: string, payload: Record<string, unknown>) => void
  > = [];

  constructor(
    private router: ModelRouter,
    private storage: StorageClient
  ) {}

  /**
   * Register a progress listener.
   * Listeners receive (type: string, payload: object) on every emit.
   */
  onProgress(
    fn: (type: string, payload: Record<string, unknown>) => void
  ): void {
    this.progressListeners.push(fn);
  }

  /**
   * Run the full enrichment pipeline for a deal.
   * Returns the enriched DealRecord with swarm_output and cost_ledger attached.
   */
  async run(deal: DealRecord): Promise<DealRecord> {
    const emit: ProgressEmitter = (type, payload) => {
      for (const fn of this.progressListeners) fn(type, payload);
    };

    const ctx: SwarmContext = { deal_id: deal.id, deal, emit };

    // ------------------------------------------------------------------
    // PHASE 1: PLAN
    // ------------------------------------------------------------------
    const plan = ['researcher', 'analyst', 'risk', 'writer', 'critic'];
    emit('plan', { deal_id: deal.id, plan });

    // ------------------------------------------------------------------
    // PHASE 2: DISPATCH — run researcher, analyst, risk in parallel
    // ------------------------------------------------------------------
    emit('dispatch', { deal_id: deal.id, agents: ['researcher', 'analyst', 'risk'] });

    const [researchResult, analystResult, riskResult] = await Promise.all([
      new ResearcherAgent(this.router).run(ctx),
      new AnalystAgent(this.router).run(ctx),
      new RiskAgent(this.router).run(ctx),
    ]);

    // ------------------------------------------------------------------
    // PHASE 3: GATHER + COMPOSE — writer uses all parallel results
    // ------------------------------------------------------------------
    emit('compose:start', { deal_id: deal.id });

    const writerResult = await new WriterAgent(this.router).run(ctx, {
      research: researchResult.output,
      analyst: analystResult.output,
      risk: riskResult.output,
    });

    emit('compose:done', { deal_id: deal.id });

    // ------------------------------------------------------------------
    // PHASE 4: CRITIQUE
    // ------------------------------------------------------------------
    const criticResult = await new CriticAgent(this.router).run(
      ctx,
      writerResult.output
    );

    // ------------------------------------------------------------------
    // PHASE 5: FINALIZE — aggregate ledger + emit summary
    // ------------------------------------------------------------------
    const ledger = this.router.getCostLedger();

    const summary: OrchestratorSummary = {
      deal_id: deal.id,
      approved: criticResult.output.approved,
      pass_rate: criticResult.output.pass_rate,
      total_usd: ledger.total_usd,
      memo_word_count: writerResult.output.word_count,
      blocking_failures: criticResult.output.blocking_failures,
      completed_at: new Date().toISOString(),
    };

    emit('finalize', { deal_id: deal.id, summary });

    // ------------------------------------------------------------------
    // Return enriched deal record
    // ------------------------------------------------------------------
    return {
      ...deal,
      status: criticResult.output.approved ? 'memo-ready' : 'needs-review',
      swarm_output: {
        research: researchResult.output,
        analyst: analystResult.output,
        risk: riskResult.output,
        memo: writerResult.output,
        critique: criticResult.output,
      },
      cost_ledger: ledger,
    };
  }
}
