'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';

export interface DealSummary {
  id: string;
  name: string;
  stage?: string;
  status?: string;
  sector?: string;
  arr?: string | null;
  ask?: string | null;
  created_at?: string;
  updated_at?: string;
  ai_summary?: string;
  swarm_status?: string;
}

interface DealCardProps {
  deal: DealSummary;
  daysInStage?: number;
}

function QuickStatsTooltip({ deal }: { deal: DealSummary }) {
  const stats = [
    { label: 'ARR', value: deal.arr || '—' },
    { label: 'Ask', value: deal.ask || '—' },
    { label: 'Stage', value: deal.stage || '—' },
  ].filter((s) => s.value !== '—');

  if (stats.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 mb-2 z-50 min-w-48 pointer-events-none">
      <div className="bg-[#1a1a1e] border border-white/[0.12] rounded-lg p-3 shadow-xl">
        <div className="grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-[10px] font-mono text-white/30 uppercase">{s.label}</p>
              <p className="text-xs font-medium text-white mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>
      </div>
      {/* Tooltip arrow */}
      <div className="w-2 h-2 bg-[#1a1a1e] border-b border-r border-white/[0.12] rotate-45 ml-4 -mt-1 shadow-sm" />
    </div>
  );
}

export function DealCard({ deal, daysInStage }: DealCardProps) {
  const [hovered, setHovered] = useState(false);

  const statusDot = (() => {
    switch (deal.status) {
      case 'intake': return 'bg-white/20';
      case 'enriching': return 'bg-warn';
      case 'review': return 'bg-accent';
      case 'ic-review': return 'bg-ok';
      case 'closed-won': return 'bg-ok';
      case 'closed-lost': return 'bg-err';
      default: return 'bg-white/20';
    }
  })();

  return (
    <Link href={`/deal/${deal.id}`} className="block">
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          'relative bg-[#111113] border rounded-xl p-3.5 cursor-pointer transition-all duration-150',
          hovered
            ? 'border-accent/30 shadow-lg shadow-accent/10 -translate-y-px'
            : 'border-white/[0.07] hover:border-white/[0.12]'
        )}
      >
        {/* Tooltip */}
        {hovered && <QuickStatsTooltip deal={deal} />}

        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-sm font-semibold text-white leading-tight">{deal.name}</p>
          <span
            className={cn('w-2 h-2 rounded-full shrink-0 mt-1', statusDot)}
            title={deal.status}
          />
        </div>

        {/* Sector + stage */}
        <p className="text-[11px] font-mono text-white/30 mb-2">
          {[deal.sector, deal.stage].filter(Boolean).join(' · ')}
        </p>

        {/* AI summary */}
        {deal.ai_summary && (
          <p className="text-xs text-white/50 leading-relaxed line-clamp-2">
            {deal.ai_summary}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/[0.05]">
          {daysInStage != null && (
            <span className="text-[10px] font-mono text-white/20">
              {daysInStage}d in stage
            </span>
          )}
          <span
            className={cn(
              'text-[10px] font-mono px-1.5 py-0.5 rounded',
              deal.swarm_status === 'done'
                ? 'bg-ok/10 text-ok'
                : deal.swarm_status === 'running'
                  ? 'bg-warn/10 text-warn'
                  : 'bg-white/5 text-white/20'
            )}
          >
            {deal.swarm_status === 'done'
              ? 'Memo ready'
              : deal.swarm_status === 'running'
                ? 'Analyzing...'
                : 'Pending'}
          </span>
        </div>
      </div>
    </Link>
  );
}
