'use client';

import { useState, useEffect } from 'react';
import { DealCard, type DealSummary } from '@/components/deal/DealCard';
import { cn } from '@/lib/cn';

// --------- Kanban column config ---------

interface KanbanColumn {
  id: string;
  label: string;
  statusValues: string[];
  dotClass: string;
  glowClass: string;
}

const COLUMNS: KanbanColumn[] = [
  {
    id: 'intake',
    label: 'Intake',
    statusValues: ['intake'],
    dotClass: 'bg-white/30',
    glowClass: '',
  },
  {
    id: 'enriching',
    label: 'Enriching',
    statusValues: ['enriching'],
    dotClass: 'bg-warn',
    glowClass: 'shadow-warn/30',
  },
  {
    id: 'review',
    label: 'Memo Ready',
    statusValues: ['review'],
    dotClass: 'bg-accent',
    glowClass: 'shadow-accent/30',
  },
  {
    id: 'ic-review',
    label: 'IC Review',
    statusValues: ['ic-review'],
    dotClass: 'bg-ok',
    glowClass: 'shadow-ok/30',
  },
  {
    id: 'decision',
    label: 'Decision',
    statusValues: ['closed-won', 'closed-lost'],
    dotClass: 'bg-white/50',
    glowClass: '',
  },
];

// --------- Column component ---------

interface ColumnProps {
  column: KanbanColumn;
  deals: DealSummary[];
}

function KanbanColumnView({ column, deals }: ColumnProps) {
  const getDaysInStage = (deal: DealSummary): number => {
    if (!deal.updated_at) return 0;
    const updated = new Date(deal.updated_at).getTime();
    const now = Date.now();
    return Math.floor((now - updated) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="flex flex-col min-w-[220px] flex-1">
      {/* Column header */}
      <div className="flex items-center gap-2 px-1 mb-3">
        <span
          className={cn(
            'w-2 h-2 rounded-full shrink-0 shadow',
            column.dotClass,
            column.glowClass
          )}
        />
        <span className="text-xs font-medium text-white/60">{column.label}</span>
        <span className="ml-auto text-[10px] font-mono text-white/20 bg-white/5 px-1.5 py-0.5 rounded">
          {deals.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2">
        {deals.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/[0.06] py-8 text-center">
            <p className="text-xs text-white/15">No deals</p>
          </div>
        ) : (
          deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              daysInStage={getDaysInStage(deal)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// --------- Pipeline page ---------

export default function DealsPage() {
  const [deals, setDeals] = useState<DealSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        const res = await fetch('/deals/index.json');
        if (!res.ok) {
          if (res.status === 401) throw new Error('Please log in to view deals');
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        setDeals(Array.isArray(data) ? data : []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDeals();
    // Poll every 30 seconds for updates
    const interval = setInterval(fetchDeals, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Bucket deals into columns
  const columnDeals = COLUMNS.map((col) => ({
    column: col,
    deals: deals.filter((d) => col.statusValues.includes(d.status || 'intake')),
  }));

  return (
    <main className="min-h-screen bg-[#09090b]">
      <div className="px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white">Deal Pipeline</h1>
            <p className="text-xs text-white/30 mt-0.5 font-mono">
              {loading ? 'Loading...' : `${deals.length} deal${deals.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <a
            href="/submit"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent/90 text-white text-sm font-medium transition-colors shadow-lg shadow-accent/20"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Deal
          </a>
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-err/10 border border-err/20 text-sm text-err">
            {error}
            {error.includes('log in') && (
              <a href="/login" className="ml-2 underline">
                Log in →
              </a>
            )}
          </div>
        )}

        {/* Loading skeleton */}
        {loading ? (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {COLUMNS.map((col) => (
              <div key={col.id} className="flex flex-col min-w-[220px] flex-1 gap-2">
                <div className="h-6 bg-white/5 rounded w-24 mb-1" />
                {[1, 2].map((i) => (
                  <div key={i} className="h-28 bg-white/[0.03] border border-white/[0.05] rounded-xl animate-pulse" />
                ))}
              </div>
            ))}
          </div>
        ) : (
          /* Kanban board */
          <div className="flex gap-4 overflow-x-auto pb-6 min-h-[60vh]">
            {columnDeals.map(({ column, deals: colDeals }) => (
              <KanbanColumnView
                key={column.id}
                column={column}
                deals={colDeals}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
