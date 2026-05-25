'use client';

import { useState, useEffect } from 'react';
import { MemoChapter, type ChapterData } from '@/components/deal/MemoChapter';
import { cn } from '@/lib/cn';

interface DealMemoData {
  id: string;
  name: string;
  stage?: string;
  created_at?: string;
  run?: {
    id: string;
    status: string;
    swarm_output?: {
      chapters?: Array<{
        chapter_number?: number;
        number?: number;
        title?: string;
        body?: string;
        sources?: Array<{ page: number; excerpt: string }>;
        confidence?: string;
      }>;
    };
  } | null;
}

interface MemoClientPageProps {
  dealId: string;
}

function MemoHeader({
  name,
  date,
  runStatus,
}: {
  name: string;
  date?: string;
  runStatus?: string;
}) {
  const confidenceBadge =
    runStatus === 'done' ? (
      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-ok/10 text-ok border border-ok/20">
        COMPLETE
      </span>
    ) : (
      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-warn/10 text-warn border border-warn/20">
        {runStatus?.toUpperCase() || 'PENDING'}
      </span>
    );

  return (
    <div className="mb-12 pb-10 border-b border-white/[0.07]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-mono text-accent/60 tracking-widest uppercase mb-2">
            Investment Memo
          </p>
          <h1
            className="text-4xl font-bold tracking-[-0.04em] text-white"
            style={{ lineHeight: 1.1 }}
          >
            {name}
          </h1>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          {confidenceBadge}
          {date && (
            <p className="text-xs text-white/30 font-mono">
              {new Date(date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          )}
          <p className="text-[10px] text-white/20 font-mono">
            Marketlogic Investors LLC · Confidential
          </p>
        </div>
      </div>
    </div>
  );
}

function ExportButtons() {
  return (
    <div className="flex items-center gap-3 pt-10 border-t border-white/[0.07]">
      <button
        onClick={() => window.print()}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-white/[0.07] text-white/50 hover:text-white/70 hover:border-white/20 hover:bg-white/5 transition-all"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        Export PDF
      </button>
      <button
        onClick={() => alert('DOCX export coming soon')}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-white/[0.07] text-white/50 hover:text-white/70 hover:border-white/20 hover:bg-white/5 transition-all"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export DOCX
      </button>
    </div>
  );
}

function TableOfContents({ chapters }: { chapters: ChapterData[] }) {
  return (
    <nav className="mb-10 p-5 rounded-xl border border-white/[0.07] bg-white/[0.02]">
      <p className="text-xs font-mono text-white/30 uppercase tracking-widest mb-3">Contents</p>
      <ol className="space-y-1.5">
        {chapters.map((ch) => (
          <li key={ch.number}>
            <a
              href={`#chapter-${ch.number}`}
              className="flex items-baseline gap-3 text-sm text-white/50 hover:text-white/80 transition-colors group"
            >
              <span className="font-mono text-[10px] text-accent/40 group-hover:text-accent/60 shrink-0 w-5">
                {String(ch.number).padStart(2, '0')}
              </span>
              <span>{ch.title}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function MemoClientPage({ dealId }: MemoClientPageProps) {
  const [deal, setDeal] = useState<DealMemoData | null>(null);
  const [chapters, setChapters] = useState<ChapterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDeal = async () => {
      try {
        const res = await fetch(`/deals/${dealId}.json`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: DealMemoData = await res.json();
        setDeal(data);

        // Parse chapters from swarm_output
        const rawChapters = data.run?.swarm_output?.chapters;
        if (rawChapters && Array.isArray(rawChapters)) {
          const parsed: ChapterData[] = rawChapters.map((ch, idx) => ({
            number: ch.chapter_number ?? ch.number ?? idx + 1,
            title: ch.title || `Chapter ${idx + 1}`,
            body: ch.body || '',
            sources: ch.sources || [],
            confidence: (ch.confidence as ChapterData['confidence']) || 'normal',
          }));
          setChapters(parsed);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDeal();
  }, [dealId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-48px)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          <p className="text-sm text-white/40">Loading memo...</p>
        </div>
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-48px)]">
        <p className="text-sm text-err">{error || 'Memo not found'}</p>
      </div>
    );
  }

  const noMemo = !deal.run || deal.run.status !== 'done' || chapters.length === 0;

  return (
    <main className="min-h-screen bg-[#09090b]">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Back link */}
        <a
          href={`/deal/${dealId}`}
          className="inline-flex items-center gap-2 text-xs text-white/30 hover:text-white/60 mb-8 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Deal Q&A
        </a>

        <MemoHeader
          name={deal.name}
          date={deal.created_at}
          runStatus={deal.run?.status}
        />

        {noMemo ? (
          <div className="text-center py-20 space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full border border-white/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-white/40">
                {deal.run?.status === 'running'
                  ? 'Analysis in progress — check back in a minute'
                  : 'No analysis run yet'}
              </p>
              <a
                href={`/deal/${dealId}`}
                className="mt-3 inline-block text-xs text-accent hover:underline"
              >
                Go back to deal page →
              </a>
            </div>
          </div>
        ) : (
          <>
            <TableOfContents chapters={chapters} />

            {chapters.map((ch) => (
              <MemoChapter key={ch.number} chapter={ch} />
            ))}

            <ExportButtons />
          </>
        )}
      </div>
    </main>
  );
}
