'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';

export interface ChapterData {
  number: number;
  title: string;
  body: string;
  sources?: Array<{ page: number; excerpt: string }>;
  confidence?: 'normal' | 'low' | 'contradiction';
}

interface MemoChapterProps {
  chapter: ChapterData;
}

function CitationAccordion({ sources }: { sources: Array<{ page: number; excerpt: string }> }) {
  const [open, setOpen] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-4 border border-white/[0.07] rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full px-4 py-2.5 text-xs text-white/40 hover:text-white/60 hover:bg-white/[0.03] transition-colors"
      >
        <span className="font-mono">
          {sources.length} source{sources.length !== 1 ? 's' : ''}
        </span>
        <svg
          className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-180')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="divide-y divide-white/[0.05]">
          {sources.map((s, i) => (
            <div key={i} className="px-4 py-3">
              <p className="text-[11px] font-mono text-accent/60 mb-1">Page {s.page}</p>
              <p className="text-xs text-white/40 leading-relaxed italic">&ldquo;{s.excerpt}&rdquo;</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function MemoChapter({ chapter }: MemoChapterProps) {
  const hasConfidenceFlag = chapter.confidence && chapter.confidence !== 'normal';

  return (
    <section
      id={`chapter-${chapter.number}`}
      className={cn(
        'py-10 border-b border-white/[0.06] last:border-0',
        hasConfidenceFlag && chapter.confidence === 'contradiction' && 'border-l-2 border-err/40 pl-6'
      )}
    >
      {/* Chapter kicker */}
      <p className="text-xs font-mono text-accent/60 tracking-widest uppercase mb-2">
        {String(chapter.number).padStart(2, '0')}
      </p>

      {/* Chapter title */}
      <h2
        className="text-[1.6rem] font-semibold tracking-[-0.03em] text-white mb-5"
        style={{ lineHeight: 1.2 }}
      >
        {chapter.title}
      </h2>

      {/* Confidence callout */}
      {hasConfidenceFlag && (
        <div
          className={cn(
            'flex items-start gap-3 px-4 py-3 rounded-lg mb-5 text-sm border-l-4',
            chapter.confidence === 'low'
              ? 'bg-warn/5 border-warn/40 text-warn/80'
              : 'bg-err/5 border-err/40 text-err/80'
          )}
        >
          <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>
            {chapter.confidence === 'low'
              ? 'Insufficient data — this section contains low-confidence analysis'
              : 'Potential contradiction detected in source material'}
          </span>
        </div>
      )}

      {/* Body text */}
      <div
        className="prose prose-invert prose-sm max-w-none text-white/80 leading-[1.75]"
        style={{ fontSize: '15px' }}
        dangerouslySetInnerHTML={{ __html: chapter.body.replace(/\n\n/g, '</p><p>').replace(/^/, '<p>').replace(/$/, '</p>') }}
      />

      {/* Citation accordion */}
      {chapter.sources && chapter.sources.length > 0 && (
        <CitationAccordion sources={chapter.sources} />
      )}
    </section>
  );
}
