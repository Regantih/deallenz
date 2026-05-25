'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/cn';

export interface Citation {
  page: number;
  text: string;
  boundingBox?: { top: number; left: number; width: number; height: number };
}

interface PDFViewerProps {
  pdfUrl: string;
  citations?: Citation[];
  activeCitation?: number | null;
  onPageChange?: (page: number) => void;
}

/**
 * PDF Viewer component using an iframe-based approach as a fallback
 * when react-pdf / pdfjs-dist are not yet installed.
 *
 * Once `npm install react-pdf pdfjs-dist` is run, this component can be
 * upgraded to use the `Document` + `Page` primitives from react-pdf for
 * per-page rendering and citation overlay support.
 */
export function PDFViewer({ pdfUrl, citations = [], activeCitation, onPageChange }: PDFViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // When activeCitation changes, jump to that page
  useEffect(() => {
    if (activeCitation != null) {
      const citation = citations[activeCitation];
      if (citation) {
        setCurrentPage(citation.page);
        onPageChange?.(citation.page);
      }
    }
  }, [activeCitation, citations, onPageChange]);

  const goToPage = useCallback(
    (page: number) => {
      if (totalPages == null) return;
      const clamped = Math.max(1, Math.min(page, totalPages));
      setCurrentPage(clamped);
      onPageChange?.(clamped);
    },
    [totalPages, onPageChange]
  );

  // Active citation on the current page
  const activeCitationData =
    activeCitation != null ? citations[activeCitation] : null;
  const showHighlight =
    activeCitationData != null && activeCitationData.page === currentPage;

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-[#0d0d0f]">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-white/[0.07] shrink-0">
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-1.5 rounded text-white/40 hover:text-white/70 hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <span className="text-xs text-white/40 font-mono tabular-nums">
          {currentPage}
          {totalPages != null && (
            <span className="text-white/20"> / {totalPages}</span>
          )}
        </span>

        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={totalPages != null && currentPage >= totalPages}
          className="p-1.5 rounded text-white/40 hover:text-white/70 hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <div className="h-4 w-px bg-white/10" />

        {/* Citation jump buttons */}
        {citations.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-xs text-white/20 font-mono mr-1">sources:</span>
            {citations.slice(0, 6).map((c, i) => (
              <button
                key={i}
                onClick={() => goToPage(c.page)}
                className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-mono transition-colors',
                  activeCitation === i
                    ? 'bg-accent text-white'
                    : 'bg-accent/10 text-accent/70 hover:bg-accent/20'
                )}
              >
                p.{c.page}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* PDF frame */}
      <div className="relative flex-1 overflow-hidden">
        {pdfUrl ? (
          <iframe
            src={`${pdfUrl}#page=${currentPage}&toolbar=0&navpanes=0&scrollbar=0`}
            className="w-full h-full border-0"
            title="PDF Viewer"
            onLoad={() => {
              // totalPages detection via iframe is not reliable;
              // parent component should pass it via props if known
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-white/20 text-sm">
            No PDF loaded
          </div>
        )}

        {/* Citation highlight overlay */}
        {showHighlight && activeCitationData?.boundingBox && (
          <div
            className="absolute pointer-events-none border-2 border-accent rounded bg-accent/20 transition-all duration-300"
            style={{
              top: `${activeCitationData.boundingBox.top}%`,
              left: `${activeCitationData.boundingBox.left}%`,
              width: `${activeCitationData.boundingBox.width}%`,
              height: `${activeCitationData.boundingBox.height}%`,
            }}
          />
        )}
      </div>

      {/* Active citation text */}
      {showHighlight && activeCitationData && (
        <div className="px-4 py-3 border-t border-white/[0.07] bg-accent/5 shrink-0">
          <p className="text-xs text-accent/80 font-mono mb-1">Page {activeCitationData.page}</p>
          <p className="text-xs text-white/60 leading-relaxed line-clamp-3">
            {activeCitationData.text}
          </p>
        </div>
      )}
    </div>
  );
}
